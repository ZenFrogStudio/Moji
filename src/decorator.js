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
const PYTHON_LANGUAGES = new Set(['python']);
const C_LANGUAGES = new Set(['c']);
const CPP_LANGUAGES = new Set(['cpp']);
const CSHARP_LANGUAGES = new Set(['csharp']);
const SQL_LANGUAGES = new Set(['sql', 'mysql', 'postgres', 'plpgsql']);
const TS_LANGUAGES = new Set(['typescript', 'typescriptreact']);
const JAVA_LANGUAGES = new Set(['java']);

const SUPPORTED_LANGUAGES = new Set([...JS_LANGUAGES, ...HTML_LANGUAGES, ...CSS_LANGUAGES, ...PYTHON_LANGUAGES, ...C_LANGUAGES, ...CPP_LANGUAGES, ...CSHARP_LANGUAGES, ...SQL_LANGUAGES, ...TS_LANGUAGES, ...JAVA_LANGUAGES]);

class KeywordDecorator {
  constructor() {
    /** @type {Map<string, vscode.TextEditorDecorationType>} */
    this.decorationTypes = new Map();
    /** @type {Map<string, {version: number, matches: Array}>} */
    this.scanCache = new Map(); // Cache scan results by document URI
    this.enabled = true;
    this._buildDecorationTypes();
  }

  // ── Decoration type management ───────────────────────────────────────────

  _buildDecorationTypes() {
    this._disposeDecorationTypes();

    const config     = vscode.workspace.getConfiguration('flashCode');
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

    // ── Language/Category Configuration Table ─────────────────────────────
    // Unified configuration for all language categories to eliminate code duplication
    const CATEGORY_CONFIG = [
      { masterKey: 'javascriptKeywords', configNs: 'flashCode.jsKeyword', map: KEYWORD_EMOJI_MAP, prefix: '' },
      { masterKey: 'htmlTags', configNs: 'flashCode.htmlTag', map: HTML_TAG_EMOJI_MAP, prefix: 'tag:' },
      { masterKey: 'htmlVoidElements', configNs: 'flashCode.htmlVoid', map: HTML_VOID_EMOJI_MAP, prefix: 'void:' },
      { masterKey: 'htmlAttributes', configNs: 'flashCode.htmlAttr', map: HTML_ATTR_EMOJI_MAP, prefix: 'attr:' },
      { masterKey: 'cssAtRules', configNs: 'flashCode.cssAtRule', map: CSS_ATRULE_EMOJI_MAP, prefix: 'cssAtRule:' },
      { masterKey: 'cssLayout', configNs: 'flashCode.cssLayout', map: CSS_LAYOUT_EMOJI_MAP, prefix: 'cssLayout:' },
      { masterKey: 'cssBox', configNs: 'flashCode.cssBox', map: CSS_BOX_EMOJI_MAP, prefix: 'cssBox:' },
      { masterKey: 'cssVisual', configNs: 'flashCode.cssVisual', map: CSS_VISUAL_EMOJI_MAP, prefix: 'cssVisual:' },
      { masterKey: 'cssPseudo', configNs: 'flashCode.cssPseudo', map: CSS_PSEUDO_EMOJI_MAP, prefix: 'cssPseudo:' },
      { masterKey: 'cssValues', configNs: 'flashCode.cssValue', map: CSS_VALUE_EMOJI_MAP, prefix: 'cssValue:' },
      { masterKey: 'pythonKeywords', configNs: 'flashCode.pyKeyword', map: PYTHON_KEYWORD_EMOJI_MAP, prefix: 'py:' },
      { masterKey: 'cKeywords', configNs: 'flashCode.cKeyword', map: C_KEYWORD_EMOJI_MAP, prefix: 'c:' },
      { masterKey: 'cppKeywords', configNs: 'flashCode.cppKeyword', map: CPP_KEYWORD_EMOJI_MAP, prefix: 'cpp:' },
      { masterKey: 'csharpKeywords', configNs: 'flashCode.csharpKeyword', map: CSHARP_KEYWORD_EMOJI_MAP, prefix: 'csharp:' },
      { masterKey: 'sqlKeywords', configNs: 'flashCode.sqlKeyword', map: SQL_KEYWORD_EMOJI_MAP, prefix: 'sql:' },
      { masterKey: 'typescriptKeywords', configNs: 'flashCode.tsKeyword', map: TYPESCRIPT_KEYWORD_EMOJI_MAP, prefix: 'ts:' },
      { masterKey: 'javaKeywords', configNs: 'flashCode.javaKeyword', map: JAVA_KEYWORD_EMOJI_MAP, prefix: 'java:' },
    ];

    // Process all categories using the configuration table
    for (const { masterKey, configNs, map, prefix } of CATEGORY_CONFIG) {
      if (config.get(masterKey, true)) {
        const itemCfg = vscode.workspace.getConfiguration(configNs);
        for (const [key, emoji] of Object.entries(map)) {
          if (itemCfg.get(key, true)) {
            addDecoration(`${prefix}${key}`, emoji);
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
      `FlashCode Pro: ${this.enabled ? 'Enabled' : 'Disabled'}`,
    );
  }

  /** Rebuild decoration types after a configuration change. */
  reloadConfig() {
    const wasEnabled = this.enabled;
    this._buildDecorationTypes();
    this.enabled = wasEnabled;
    // Clear scan cache since decoration types have changed
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
