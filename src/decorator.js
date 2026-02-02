// Manages one TextEditorDecorationType per keyword and applies them to editors.
//
// Two display modes:
//   "replace"  – keyword text is hidden (font-size: 0), emoji shown via ::before
//   "overlay"  – keyword text is dimmed, emoji shown before it

const vscode = require('vscode');
const { KEYWORD_EMOJI_MAP } = require('./keywordMap');
const { HTML_TAG_EMOJI_MAP, HTML_VOID_EMOJI_MAP, HTML_ATTR_EMOJI_MAP } = require('./htmlKeywordMap');
const { scanKeywords } = require('./scanner');
const { scanHtmlTokens } = require('./htmlScanner');

const JS_LANGUAGES = new Set(['javascript', 'javascriptreact']);
const HTML_LANGUAGES = new Set(['html']);

const SUPPORTED_LANGUAGES = new Set([...JS_LANGUAGES, ...HTML_LANGUAGES]);

class KeywordDecorator {
  constructor() {
    /** @type {Map<string, vscode.TextEditorDecorationType>} */
    this.decorationTypes = new Map();
    this.enabled = true;
    this._buildDecorationTypes();
  }

  // ── Decoration type management ───────────────────────────────────────────

  _buildDecorationTypes() {
    this._disposeDecorationTypes();

    const config     = vscode.workspace.getConfiguration('emojiCode');
    const mode       = config.get('displayMode', 'overlay');
    const opacity    = config.get('overlayOpacity', 1);
    const editorFont = vscode.workspace.getConfiguration('editor').get('fontSize', 14);

    // Helper: create a single decoration type and register it in the map.
    const addDecoration = (key, emoji) => {
      /** @type {vscode.DecorationRenderOptions} */
      let options;

      if (mode === 'replace') {
        options = {
          textDecoration: 'none; font-size: 0',
          before: {
            contentText: emoji,
            textDecoration: `none; font-size: ${editorFont}px`,
          },
        };
      } else {
        options = {
          opacity: String(opacity),
          before: {
            contentText: emoji,
            margin: '0 4px 0 0',
          },
        };
      }

      this.decorationTypes.set(
        key,
        vscode.window.createTextEditorDecorationType(options),
      );
    };

    // ── JavaScript keywords ─────────────────────────────────────────────
    for (const [keyword, emoji] of Object.entries(KEYWORD_EMOJI_MAP)) {
      addDecoration(keyword, emoji);
    }

    // ── HTML categories (master toggle + individual per-token toggles) ──
    if (config.get('htmlTags', true)) {
      const tagCfg = vscode.workspace.getConfiguration('emojiCode.htmlTag');
      for (const [tag, emoji] of Object.entries(HTML_TAG_EMOJI_MAP)) {
        if (tagCfg.get(tag, true)) addDecoration(`tag:${tag}`, emoji);
      }
    }

    if (config.get('htmlVoidElements', true)) {
      const voidCfg = vscode.workspace.getConfiguration('emojiCode.htmlVoid');
      for (const [tag, emoji] of Object.entries(HTML_VOID_EMOJI_MAP)) {
        if (voidCfg.get(tag, true)) addDecoration(`void:${tag}`, emoji);
      }
    }

    if (config.get('htmlAttributes', true)) {
      const attrCfg = vscode.workspace.getConfiguration('emojiCode.htmlAttr');
      for (const [attr, emoji] of Object.entries(HTML_ATTR_EMOJI_MAP)) {
        if (attrCfg.get(attr, true)) addDecoration(`attr:${attr}`, emoji);
      }
    }
  }

  _disposeDecorationTypes() {
    for (const dt of this.decorationTypes.values()) {
      dt.dispose();
    }
    this.decorationTypes.clear();
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /** Scan `editor` and apply (or clear) keyword decorations. */
  updateEditor(editor) {
    if (!editor || !SUPPORTED_LANGUAGES.has(editor.document.languageId)) {
      return;
    }

    if (!this.enabled) {
      this._clearAll(editor);
      return;
    }

    // Scan for keyword matches using the appropriate scanner.
    const langId = editor.document.languageId;
    const matches = HTML_LANGUAGES.has(langId)
      ? scanHtmlTokens(editor.document)
      : scanKeywords(editor.document);

    // Group matches by keyword.
    /** @type {Map<string, vscode.DecorationOptions[]>} */
    const groups = new Map();
    for (const kw of this.decorationTypes.keys()) {
      groups.set(kw, []);
    }
    for (const { keyword, range } of matches) {
      const list = groups.get(keyword);
      if (list) list.push({ range });
    }

    // Apply each keyword's decoration type with its ranges.
    for (const [keyword, decorationType] of this.decorationTypes) {
      editor.setDecorations(decorationType, groups.get(keyword) || []);
    }
  }

  /** Toggle enabled state and update the active editor. */
  toggle() {
    this.enabled = !this.enabled;

    const editor = vscode.window.activeTextEditor;
    if (editor) {
      this.updateEditor(editor);
    }

    vscode.window.showInformationMessage(
      `EmojiCode: ${this.enabled ? 'Enabled' : 'Disabled'}`,
    );
  }

  /** Rebuild decoration types after a configuration change. */
  reloadConfig() {
    const wasEnabled = this.enabled;
    this._buildDecorationTypes();
    this.enabled = wasEnabled;
  }

  /** Dispose all decoration types. */
  dispose() {
    this._disposeDecorationTypes();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  _clearAll(editor) {
    for (const dt of this.decorationTypes.values()) {
      editor.setDecorations(dt, []);
    }
  }
}

module.exports = { KeywordDecorator };
