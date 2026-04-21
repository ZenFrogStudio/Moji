// Manages one TextEditorDecorationType per keyword and applies them to editors.
//
// Two display modes:
//   "replace"  – keyword text is hidden (font-size: 0), emoji shown via ::before
//   "overlay"  – keyword text is dimmed, emoji shown before it

const vscode = require('vscode');
const { DECORATION_CATEGORIES } = require('./decorationCategories');
const settingsStore = require('./settingsStore');
const { scanKeywords } = require('./scanner');
const { scanHtmlTokens } = require('./htmlScanner');
const { scanCssTokens } = require('./cssScanner');
const { scanPythonKeywords } = require('./pythonScanner');
const { scanCKeywords } = require('./cScanner');
const { scanCppKeywords } = require('./cppScanner');
const { scanCsharpKeywords } = require('./csharpScanner');
const { scanSqlKeywords } = require('./sqlScanner');
const { scanTypescriptKeywords } = require('./typescriptScanner');
const { scanJavaKeywords } = require('./javaScanner');

const JS_LANGUAGES = new Set(['javascript', 'javascriptreact']);
const HTML_LANGUAGES = new Set(['html']);
const CSS_LANGUAGES = new Set(['css', 'scss', 'less']);

const PYTHON_LANGUAGES = new Set(['python']);
const C_LANGUAGES = new Set(['c']);
const CPP_LANGUAGES = new Set(['cpp']);
const CSHARP_LANGUAGES = new Set(['csharp']);
const SQL_LANGUAGES = new Set(['sql', 'mysql', 'postgres', 'plpgsql']);
const TS_LANGUAGES = new Set(['typescript', 'typescriptreact']);
const JAVA_LANGUAGES = new Set(['java']);
const JSX_REACT_LANGUAGES = new Set(['javascriptreact', 'typescriptreact']);

// Used by the JSX text filter (module-level for performance)
const JSX_TEXT_LINE_RE = /^[A-Za-z0-9][A-Za-z0-9 ,.!?'"\-]*$/;
const JSX_CODE_START_RE = /^\s*(import|export|const|let|var|function|class|return|if|else|for|while|do|switch|case|try|catch|throw|async|await|type|interface|enum|from|default|new|delete|typeof|void|instanceof|in|of|extends|implements|super|this|null|undefined|true|false)\b/;

const SUPPORTED_LANGUAGES = new Set([...JS_LANGUAGES, ...HTML_LANGUAGES, ...CSS_LANGUAGES, ...PYTHON_LANGUAGES, ...C_LANGUAGES, ...CPP_LANGUAGES, ...CSHARP_LANGUAGES, ...SQL_LANGUAGES, ...TS_LANGUAGES, ...JAVA_LANGUAGES]);

// Shared category table — used by both _buildDecorationTypes and _refreshEnabledKeywords.
class KeywordDecorator {
  constructor() {
    /** @type {Map<string, vscode.TextEditorDecorationType>} */
    this.decorationTypes = new Map();
    /** @type {Map<string, {version: number, matches: Array}>} */
    this.scanCache = new Map();
    /** @type {Set<string>} Keywords currently enabled — controls which types get ranges applied. */
    this.enabledKeywords = new Set();
    this.enabled = true;
    this._mode = null;
    this._opacity = null;
    this._editorFont = null;
    this._buildDecorationTypes();
  }

  // ── Decoration type management ───────────────────────────────────────────

  // Creates one TextEditorDecorationType for EVERY keyword regardless of enabled state.
  // Enabled state is tracked separately in this.enabledKeywords.
  // Only called when the visual style (mode, opacity, font) changes — not on keyword toggles.
  _buildDecorationTypes() {
    this._disposeDecorationTypes();

    const config          = vscode.workspace.getConfiguration('mojiPro');
    this._mode            = config.get('displayMode', 'overlay');
    this._opacity         = config.get('overlayOpacity', 1);
    this._emojiSize       = config.get('emojiSize', 'large');
    this._editorFont      = vscode.workspace.getConfiguration('editor').get('fontSize', 14);
    const sizeMultiplier  = this._emojiSize === 'small' ? 0.75 : 1;
    // Serialised signature used in reloadConfig to detect override changes without
    // a deep-equality check — emoji overrides are baked into contentText so any
    // change requires a full decoration-type rebuild.
    const customOverrides = config.get('customEmojiOverrides', {});
    this._overridesSig    = JSON.stringify(customOverrides);

    const addDecoration = (key, emoji) => {
      /** @type {vscode.DecorationRenderOptions} */
      let options;

      if (this._mode === 'replace') {
        options = {
          textDecoration: 'none; font-size: 0',
          before: {
            contentText: emoji,
            textDecoration: `none; font-size: ${Math.round(this._editorFont * sizeMultiplier)}px`,
          },
        };
      } else {
        const overlayFontSize = Math.round(this._editorFont * sizeMultiplier);
        options = {
          opacity: String(this._opacity),
          before: {
            contentText: emoji,
            margin: '0 4px 0 0',
            textDecoration: `none; font-size: ${overlayFontSize}px`,
          },
        };
      }

      this.decorationTypes.set(key, vscode.window.createTextEditorDecorationType(options));
    };

    for (const { map, prefix } of DECORATION_CATEGORIES) {
      for (const [key, defaultEmoji] of Object.entries(map)) {
        const overrideKey   = `${prefix}${key}`;
        // Apply per-keyword override if one exists; otherwise fall back to the map default.
        const effectiveEmoji = customOverrides[overrideKey] || defaultEmoji;
        addDecoration(overrideKey, effectiveEmoji);
      }
    }

    this._refreshEnabledKeywords();
  }

  // Reads current config and updates the enabledKeywords set.
  // Does NOT touch decoration types — no visual disruption.
  _refreshEnabledKeywords() {
    this.enabledKeywords.clear();
    const config = vscode.workspace.getConfiguration('mojiPro');
    const disabledDecorations = settingsStore.getDisabledDecorations();
    for (const { id, masterKey, map, prefix } of DECORATION_CATEGORIES) {
      if (config.get(masterKey, true)) {
        for (const [key] of Object.entries(map)) {
          if (settingsStore.isDecorationEnabled(disabledDecorations, id, key)) {
            this.enabledKeywords.add(`${prefix}${key}`);
          }
        }
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

    // Check cache first to avoid redundant scans
    const docUri = editor.document.uri.toString();
    const docVersion = editor.document.version;
    const cached = this.scanCache.get(docUri);

    let matches;
    if (cached && cached.version === docVersion) {
      // Use cached scan results
      matches = cached.matches;
    } else {
      // Scan for keyword matches using the appropriate scanner
      const langId = editor.document.languageId;
      if (HTML_LANGUAGES.has(langId)) {
        matches = scanHtmlTokens(editor.document);
      } else if (CSS_LANGUAGES.has(langId)) {
        matches = scanCssTokens(editor.document);
      } else if (PYTHON_LANGUAGES.has(langId)) {
        matches = scanPythonKeywords(editor.document);
      } else if (C_LANGUAGES.has(langId)) {
        matches = scanCKeywords(editor.document);
      } else if (CPP_LANGUAGES.has(langId)) {
        matches = scanCppKeywords(editor.document);
      } else if (CSHARP_LANGUAGES.has(langId)) {
        matches = scanCsharpKeywords(editor.document);
      } else if (SQL_LANGUAGES.has(langId)) {
        matches = scanSqlKeywords(editor.document);
      } else if (TS_LANGUAGES.has(langId)) {
        matches = scanTypescriptKeywords(editor.document);
      } else if (JAVA_LANGUAGES.has(langId)) {
        matches = scanJavaKeywords(editor.document);
      } else {
        matches = scanKeywords(editor.document);
      }

      // For JSX/TSX: filter matches that fall inside JSX text nodes (not code keywords).
      if (JSX_REACT_LANGUAGES.has(langId)) {
        matches = matches.filter(({ range }) => {
          const lineText = editor.document.lineAt(range.start.line).text;
          const matchPos = range.start.character;
          const matchLen = range.end.character - range.start.character;

          // Strategy 1 — inline JSX text: keyword sits between '>' and '<' on same line
          // with no code-syntax characters in the span between them.
          const before = lineText.substring(0, matchPos);
          const after = lineText.substring(matchPos + matchLen);
          const lastGT = before.lastIndexOf('>');
          const nextLT = after.indexOf('<');
          if (lastGT !== -1 && nextLT !== -1) {
            const span = before.substring(lastGT + 1)
                       + lineText.substring(matchPos, matchPos + matchLen)
                       + after.substring(0, nextLT);
            if (!/[=(){};:@#$|&{}]/.test(span)) return false;
          }

          // Strategy 2 — multi-line JSX text: whole line is pure prose in a JSX context.
          const trimmed = lineText.trim();
          if (
            trimmed.length > 0
            && /\s/.test(trimmed)
            && JSX_TEXT_LINE_RE.test(trimmed)
            && !/[<>{}]/.test(trimmed)
            && !JSX_CODE_START_RE.test(lineText)
          ) {
            return false;
          }

          return true;
        });
      }

      // Cache the scan results
      this.scanCache.set(docUri, { version: docVersion, matches });
    }

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

    // Apply ranges for enabled keywords; clear for disabled ones.
    // Decoration types are never disposed on keyword toggles, so there is no
    // dispose/recreate flash — we simply pass an empty array to clear disabled types.
    for (const [keyword, decorationType] of this.decorationTypes) {
      editor.setDecorations(
        decorationType,
        this.enabledKeywords.has(keyword) ? (groups.get(keyword) || []) : []
      );
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
      `Moji: ${this.enabled ? 'Enabled' : 'Disabled'}`,
    );
  }

  /** Update state after a configuration change. */
  reloadConfig() {
    const wasEnabled = this.enabled;
    const config     = vscode.workspace.getConfiguration('mojiPro');
    const newMode    = config.get('displayMode', 'overlay');
    const newOpacity = config.get('overlayOpacity', 1);
    const newSize    = config.get('emojiSize', 'large');
    const newFont    = vscode.workspace.getConfiguration('editor').get('fontSize', 14);

    const newOverridesSig = JSON.stringify(
      config.get('customEmojiOverrides', {})
    );

    if (newMode !== this._mode || newOpacity !== this._opacity || newSize !== this._emojiSize || newFont !== this._editorFont || newOverridesSig !== this._overridesSig) {
      // Visual style or emoji overrides changed — must recreate decoration types since
      // the emoji character is baked into each type's contentText CSS property.
      this._buildDecorationTypes();
    } else {
      // Only keyword enable/disable changed — update the enabled set with no type disposal
      this._refreshEnabledKeywords();
    }

    this.enabled = wasEnabled;
    this.scanCache.clear();
  }

  /** Remove the scan cache entry for a document that has been closed. */
  clearCacheForDocument(uri) {
    this.scanCache.delete(uri);
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
