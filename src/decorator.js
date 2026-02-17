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
    if (config.get('javascriptKeywords', true)) {
      const jsCfg = vscode.workspace.getConfiguration('emojiCode.jsKeyword');
      for (const [keyword, emoji] of Object.entries(KEYWORD_EMOJI_MAP)) {
        if (jsCfg.get(keyword, true)) addDecoration(keyword, emoji);
      }
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

    // ── CSS categories ───────────────────────────────────────────────────
    if (config.get('cssAtRules', true)) {
      const atRuleCfg = vscode.workspace.getConfiguration('emojiCode.cssAtRule');
      for (const [rule, emoji] of Object.entries(CSS_ATRULE_EMOJI_MAP)) {
        if (atRuleCfg.get(rule, true)) addDecoration(`cssAtRule:${rule}`, emoji);
      }
    }

    if (config.get('cssLayout', true)) {
      const layoutCfg = vscode.workspace.getConfiguration('emojiCode.cssLayout');
      for (const [prop, emoji] of Object.entries(CSS_LAYOUT_EMOJI_MAP)) {
        if (layoutCfg.get(prop, true)) addDecoration(`cssLayout:${prop}`, emoji);
      }
    }

    if (config.get('cssBox', true)) {
      const boxCfg = vscode.workspace.getConfiguration('emojiCode.cssBox');
      for (const [prop, emoji] of Object.entries(CSS_BOX_EMOJI_MAP)) {
        if (boxCfg.get(prop, true)) addDecoration(`cssBox:${prop}`, emoji);
      }
    }

    if (config.get('cssVisual', true)) {
      const visualCfg = vscode.workspace.getConfiguration('emojiCode.cssVisual');
      for (const [prop, emoji] of Object.entries(CSS_VISUAL_EMOJI_MAP)) {
        if (visualCfg.get(prop, true)) addDecoration(`cssVisual:${prop}`, emoji);
      }
    }

    if (config.get('cssPseudo', true)) {
      const pseudoCfg = vscode.workspace.getConfiguration('emojiCode.cssPseudo');
      for (const [pseudo, emoji] of Object.entries(CSS_PSEUDO_EMOJI_MAP)) {
        if (pseudoCfg.get(pseudo, true)) addDecoration(`cssPseudo:${pseudo}`, emoji);
      }
    }

    if (config.get('cssValues', true)) {
      const valueCfg = vscode.workspace.getConfiguration('emojiCode.cssValue');
      for (const [value, emoji] of Object.entries(CSS_VALUE_EMOJI_MAP)) {
        if (valueCfg.get(value, true)) addDecoration(`cssValue:${value}`, emoji);
      }
    }

    // ── Python keywords ───────────────────────────────────────────────────
    if (config.get('pythonKeywords', true)) {
      const pyCfg = vscode.workspace.getConfiguration('emojiCode.pyKeyword');
      for (const [keyword, emoji] of Object.entries(PYTHON_KEYWORD_EMOJI_MAP)) {
        if (pyCfg.get(keyword, true)) addDecoration(`py:${keyword}`, emoji);
      }
    }

    // ── C keywords ────────────────────────────────────────────────────────
    if (config.get('cKeywords', true)) {
      const cCfg = vscode.workspace.getConfiguration('emojiCode.cKeyword');
      for (const [keyword, emoji] of Object.entries(C_KEYWORD_EMOJI_MAP)) {
        if (cCfg.get(keyword, true)) addDecoration(`c:${keyword}`, emoji);
      }
    }

    // ── C++ keywords ──────────────────────────────────────────────────────
    if (config.get('cppKeywords', true)) {
      const cppCfg = vscode.workspace.getConfiguration('emojiCode.cppKeyword');
      for (const [keyword, emoji] of Object.entries(CPP_KEYWORD_EMOJI_MAP)) {
        if (cppCfg.get(keyword, true)) addDecoration(`cpp:${keyword}`, emoji);
      }
    }

    // ── C# keywords ───────────────────────────────────────────────────────
    if (config.get('csharpKeywords', true)) {
      const csharpCfg = vscode.workspace.getConfiguration('emojiCode.csharpKeyword');
      for (const [keyword, emoji] of Object.entries(CSHARP_KEYWORD_EMOJI_MAP)) {
        if (csharpCfg.get(keyword, true)) addDecoration(`csharp:${keyword}`, emoji);
      }
    }

    // ── SQL keywords ─────────────────────────────────────────────────────
    if (config.get('sqlKeywords', true)) {
      const sqlCfg = vscode.workspace.getConfiguration('emojiCode.sqlKeyword');
      for (const [keyword, emoji] of Object.entries(SQL_KEYWORD_EMOJI_MAP)) {
        if (sqlCfg.get(keyword, true)) addDecoration(`sql:${keyword}`, emoji);
      }
    }

    // ── TypeScript keywords ──────────────────────────────────────────────
    if (config.get('typescriptKeywords', true)) {
      const tsCfg = vscode.workspace.getConfiguration('emojiCode.tsKeyword');
      for (const [keyword, emoji] of Object.entries(TYPESCRIPT_KEYWORD_EMOJI_MAP)) {
        if (tsCfg.get(keyword, true)) addDecoration(`ts:${keyword}`, emoji);
      }
    }

    // ── Java keywords ────────────────────────────────────────────────────
    if (config.get('javaKeywords', true)) {
      const javaCfg = vscode.workspace.getConfiguration('emojiCode.javaKeyword');
      for (const [keyword, emoji] of Object.entries(JAVA_KEYWORD_EMOJI_MAP)) {
        if (javaCfg.get(keyword, true)) addDecoration(`java:${keyword}`, emoji);
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
    let matches;
    if (HTML_LANGUAGES.has(langId)) {
      matches = scanHtmlTokens(editor.document);
    } else if (CSS_LANGUAGES.has(langId)) {
      matches = scanCssTokens(editor.document);
    } else if (PYTHON_LANGUAGES.has(langId)) {
      matches = scanPythonKeywords(editor.document);
      // Prefix Python keywords with 'py:' to match decoration keys
      matches = matches.map(m => ({ keyword: `py:${m.keyword}`, range: m.range }));
    } else if (C_LANGUAGES.has(langId)) {
      matches = scanCKeywords(editor.document);
      // Prefix C keywords with 'c:' to match decoration keys
      matches = matches.map(m => ({ keyword: `c:${m.keyword}`, range: m.range }));
    } else if (CPP_LANGUAGES.has(langId)) {
      matches = scanCppKeywords(editor.document);
      // Prefix C++ keywords with 'cpp:' to match decoration keys
      matches = matches.map(m => ({ keyword: `cpp:${m.keyword}`, range: m.range }));
    } else if (CSHARP_LANGUAGES.has(langId)) {
      matches = scanCsharpKeywords(editor.document);
      // Prefix C# keywords with 'csharp:' to match decoration keys
      matches = matches.map(m => ({ keyword: `csharp:${m.keyword}`, range: m.range }));
    } else if (SQL_LANGUAGES.has(langId)) {
      matches = scanSqlKeywords(editor.document);
      // Prefix SQL keywords with 'sql:' to match decoration keys
      matches = matches.map(m => ({ keyword: `sql:${m.keyword}`, range: m.range }));
    } else if (TS_LANGUAGES.has(langId)) {
      matches = scanTypescriptKeywords(editor.document);
      // Prefix TypeScript keywords with 'ts:' to match decoration keys
      matches = matches.map(m => ({ keyword: `ts:${m.keyword}`, range: m.range }));
    } else if (JAVA_LANGUAGES.has(langId)) {
      matches = scanJavaKeywords(editor.document);
      // Prefix Java keywords with 'java:' to match decoration keys
      matches = matches.map(m => ({ keyword: `java:${m.keyword}`, range: m.range }));
    } else {
      matches = scanKeywords(editor.document);
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
      `EmojiCode-Pro: ${this.enabled ? 'Enabled' : 'Disabled'}`,
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
