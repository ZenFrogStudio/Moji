// Manages one TextEditorDecorationType per keyword and applies them to editors.
//
// Two display modes:
//   "replace"  – keyword text is hidden (font-size: 0), emoji shown via ::before
//   "overlay"  – keyword text is dimmed, emoji shown before it

const vscode = require('vscode');
const { KEYWORD_EMOJI_MAP } = require('./keywordMap');
const { HTML_TAG_EMOJI_MAP, HTML_VOID_EMOJI_MAP, HTML_ATTR_EMOJI_MAP } = require('./htmlKeywordMap');
const {
  CSS_ATRULE_EMOJI_MAP,
  CSS_LAYOUT_EMOJI_MAP,
  CSS_BOX_EMOJI_MAP,
  CSS_VISUAL_EMOJI_MAP,
  CSS_PSEUDO_EMOJI_MAP,
  CSS_VALUE_EMOJI_MAP,
} = require('./cssKeywordMap');
const { PYTHON_KEYWORD_EMOJI_MAP } = require('./pythonKeywordMap');
const { C_KEYWORD_EMOJI_MAP } = require('./cKeywordMap');
const { CPP_KEYWORD_EMOJI_MAP } = require('./cppKeywordMap');
const { CSHARP_KEYWORD_EMOJI_MAP } = require('./csharpKeywordMap');
const { SQL_KEYWORD_EMOJI_MAP } = require('./sqlKeywordMap');
const { TYPESCRIPT_KEYWORD_EMOJI_MAP } = require('./typescriptKeywordMap');
const { JAVA_KEYWORD_EMOJI_MAP } = require('./javaKeywordMap');
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

// Languages always available without a license (free tier)
const FREE_LANGUAGES = new Set([...JS_LANGUAGES, ...HTML_LANGUAGES, ...CSS_LANGUAGES]);
const PYTHON_LANGUAGES = new Set(['python']);
const C_LANGUAGES = new Set(['c']);
const CPP_LANGUAGES = new Set(['cpp']);
const CSHARP_LANGUAGES = new Set(['csharp']);
const SQL_LANGUAGES = new Set(['sql', 'mysql', 'postgres', 'plpgsql']);
const TS_LANGUAGES = new Set(['typescript', 'typescriptreact']);
const JAVA_LANGUAGES = new Set(['java']);

const SUPPORTED_LANGUAGES = new Set([...JS_LANGUAGES, ...HTML_LANGUAGES, ...CSS_LANGUAGES, ...PYTHON_LANGUAGES, ...C_LANGUAGES, ...CPP_LANGUAGES, ...CSHARP_LANGUAGES, ...SQL_LANGUAGES, ...TS_LANGUAGES, ...JAVA_LANGUAGES]);

// Shared category table — used by both _buildDecorationTypes and _refreshEnabledKeywords.
const CATEGORY_CONFIG = [
  { masterKey: 'javascriptKeywords', configNs: 'mojiPro.jsKeyword', map: KEYWORD_EMOJI_MAP, prefix: '' },
  { masterKey: 'htmlTags', configNs: 'mojiPro.htmlTag', map: HTML_TAG_EMOJI_MAP, prefix: 'tag:' },
  { masterKey: 'htmlVoidElements', configNs: 'mojiPro.htmlVoid', map: HTML_VOID_EMOJI_MAP, prefix: 'void:' },
  { masterKey: 'htmlAttributes', configNs: 'mojiPro.htmlAttr', map: HTML_ATTR_EMOJI_MAP, prefix: 'attr:' },
  { masterKey: 'cssAtRules', configNs: 'mojiPro.cssAtRule', map: CSS_ATRULE_EMOJI_MAP, prefix: 'cssAtRule:' },
  { masterKey: 'cssLayout', configNs: 'mojiPro.cssLayout', map: CSS_LAYOUT_EMOJI_MAP, prefix: 'cssLayout:' },
  { masterKey: 'cssBox', configNs: 'mojiPro.cssBox', map: CSS_BOX_EMOJI_MAP, prefix: 'cssBox:' },
  { masterKey: 'cssVisual', configNs: 'mojiPro.cssVisual', map: CSS_VISUAL_EMOJI_MAP, prefix: 'cssVisual:' },
  { masterKey: 'cssPseudo', configNs: 'mojiPro.cssPseudo', map: CSS_PSEUDO_EMOJI_MAP, prefix: 'cssPseudo:' },
  { masterKey: 'cssValues', configNs: 'mojiPro.cssValue', map: CSS_VALUE_EMOJI_MAP, prefix: 'cssValue:' },
  { masterKey: 'pythonKeywords', configNs: 'mojiPro.pyKeyword', map: PYTHON_KEYWORD_EMOJI_MAP, prefix: 'py:' },
  { masterKey: 'cKeywords', configNs: 'mojiPro.cKeyword', map: C_KEYWORD_EMOJI_MAP, prefix: 'c:' },
  { masterKey: 'cppKeywords', configNs: 'mojiPro.cppKeyword', map: CPP_KEYWORD_EMOJI_MAP, prefix: 'cpp:' },
  { masterKey: 'csharpKeywords', configNs: 'mojiPro.csharpKeyword', map: CSHARP_KEYWORD_EMOJI_MAP, prefix: 'csharp:' },
  { masterKey: 'sqlKeywords', configNs: 'mojiPro.sqlKeyword', map: SQL_KEYWORD_EMOJI_MAP, prefix: 'sql:' },
  { masterKey: 'typescriptKeywords', configNs: 'mojiPro.tsKeyword', map: TYPESCRIPT_KEYWORD_EMOJI_MAP, prefix: 'ts:' },
  { masterKey: 'javaKeywords', configNs: 'mojiPro.javaKeyword', map: JAVA_KEYWORD_EMOJI_MAP, prefix: 'java:' },
];

class KeywordDecorator {
  constructor() {
    /** @type {Map<string, vscode.TextEditorDecorationType>} */
    this.decorationTypes = new Map();
    /** @type {Map<string, {version: number, matches: Array}>} */
    this.scanCache = new Map();
    /** @type {Set<string>} Keywords currently enabled — controls which types get ranges applied. */
    this.enabledKeywords = new Set();
    this.enabled = true;
    this.licensed = false;
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

    const config     = vscode.workspace.getConfiguration('mojiPro');
    this._mode       = config.get('displayMode', 'overlay');
    this._opacity    = config.get('overlayOpacity', 1);
    this._editorFont = vscode.workspace.getConfiguration('editor').get('fontSize', 14);

    const addDecoration = (key, emoji) => {
      /** @type {vscode.DecorationRenderOptions} */
      let options;

      if (this._mode === 'replace') {
        options = {
          textDecoration: 'none; font-size: 0',
          before: {
            contentText: emoji,
            textDecoration: `none; font-size: ${this._editorFont}px`,
          },
        };
      } else {
        options = {
          opacity: String(this._opacity),
          before: {
            contentText: emoji,
            margin: '0 4px 0 0',
          },
        };
      }

      this.decorationTypes.set(key, vscode.window.createTextEditorDecorationType(options));
    };

    for (const { configNs, map, prefix } of CATEGORY_CONFIG) {
      const itemCfg = vscode.workspace.getConfiguration(configNs);
      for (const [key, emoji] of Object.entries(map)) {
        addDecoration(`${prefix}${key}`, emoji);
      }
    }

    this._refreshEnabledKeywords();
  }

  // Reads current config and updates the enabledKeywords set.
  // Does NOT touch decoration types — no visual disruption.
  _refreshEnabledKeywords() {
    this.enabledKeywords.clear();
    const config = vscode.workspace.getConfiguration('mojiPro');
    for (const { masterKey, configNs, map, prefix } of CATEGORY_CONFIG) {
      if (config.get(masterKey, true)) {
        const itemCfg = vscode.workspace.getConfiguration(configNs);
        for (const [key] of Object.entries(map)) {
          if (itemCfg.get(key, true)) {
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

    // Non-free languages require a license
    if (!this.licensed && !FREE_LANGUAGES.has(editor.document.languageId)) {
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
      `Moji Pro: ${this.enabled ? 'Enabled' : 'Disabled'}`,
    );
  }

  /** Update state after a configuration change. */
  reloadConfig() {
    const wasEnabled = this.enabled;
    const config     = vscode.workspace.getConfiguration('mojiPro');
    const newMode    = config.get('displayMode', 'overlay');
    const newOpacity = config.get('overlayOpacity', 1);
    const newFont    = vscode.workspace.getConfiguration('editor').get('fontSize', 14);

    if (newMode !== this._mode || newOpacity !== this._opacity || newFont !== this._editorFont) {
      // Visual style changed — must recreate decoration types (unavoidable full rebuild)
      this._buildDecorationTypes();
    } else {
      // Only keyword enable/disable changed — update the enabled set with no type disposal
      this._refreshEnabledKeywords();
    }

    this.enabled = wasEnabled;
    this.scanCache.clear();
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
