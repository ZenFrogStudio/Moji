// Custom webview panel for configuring EmojiCode-Pro settings with a language-based tabbed interface.
// Uses server-side rendering - all interactions handled via postMessage, no client-side DOM manipulation.

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
const crypto = require('crypto');

function getNonce() {
  return crypto.randomBytes(16).toString('base64');
}

let currentPanel = undefined;
let currentTab = 'javascript'; // Track active tab server-side

/**
 * Opens (or focuses) the EmojiCode-Pro settings panel.
 * @param {vscode.ExtensionContext} context
 * @param {function} onSettingsChanged - callback when settings change
 */
function openSettingsPanel(context, onSettingsChanged) {
  const column = vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.viewColumn
    : undefined;

  // If panel already exists, reveal it AND refresh content
  if (currentPanel) {
    currentPanel.reveal(column);
    currentPanel.webview.html = getWebviewContent();
    return;
  }

  // Create new panel
  currentPanel = vscode.window.createWebviewPanel(
    'emojiCodeSettings',
    'EmojiCode-Pro Settings',
    column || vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  currentPanel.webview.html = getWebviewContent();

  // Handle messages from the webview
  currentPanel.webview.onDidReceiveMessage(
    async (message) => {
      if (message.command === 'switchTab') {
        currentTab = message.tab;
        currentPanel.webview.html = getWebviewContent();
      } else if (message.command === 'toggleSetting') {
        const config = vscode.workspace.getConfiguration();
        await config.update(message.key, message.value, vscode.ConfigurationTarget.Global);
        if (onSettingsChanged) onSettingsChanged();
        // Re-render to show updated state
        currentPanel.webview.html = getWebviewContent();
      } else if (message.command === 'toggleAll') {
        const config = vscode.workspace.getConfiguration();
        const { category, value } = message;

        let map, prefix;
        if (category === 'javascript') {
          map = KEYWORD_EMOJI_MAP;
          prefix = 'emojiCode.jsKeyword';
        } else if (category === 'tags') {
          map = HTML_TAG_EMOJI_MAP;
          prefix = 'emojiCode.htmlTag';
        } else if (category === 'void') {
          map = HTML_VOID_EMOJI_MAP;
          prefix = 'emojiCode.htmlVoid';
        } else if (category === 'attr') {
          map = HTML_ATTR_EMOJI_MAP;
          prefix = 'emojiCode.htmlAttr';
        } else if (category === 'cssAtRule') {
          map = CSS_ATRULE_EMOJI_MAP;
          prefix = 'emojiCode.cssAtRule';
        } else if (category === 'cssLayout') {
          map = CSS_LAYOUT_EMOJI_MAP;
          prefix = 'emojiCode.cssLayout';
        } else if (category === 'cssBox') {
          map = CSS_BOX_EMOJI_MAP;
          prefix = 'emojiCode.cssBox';
        } else if (category === 'cssVisual') {
          map = CSS_VISUAL_EMOJI_MAP;
          prefix = 'emojiCode.cssVisual';
        } else if (category === 'cssPseudo') {
          map = CSS_PSEUDO_EMOJI_MAP;
          prefix = 'emojiCode.cssPseudo';
        } else if (category === 'cssValue') {
          map = CSS_VALUE_EMOJI_MAP;
          prefix = 'emojiCode.cssValue';
        } else if (category === 'python') {
          map = PYTHON_KEYWORD_EMOJI_MAP;
          prefix = 'emojiCode.pyKeyword';
        } else if (category === 'c') {
          map = C_KEYWORD_EMOJI_MAP;
          prefix = 'emojiCode.cKeyword';
        } else if (category === 'cpp') {
          map = CPP_KEYWORD_EMOJI_MAP;
          prefix = 'emojiCode.cppKeyword';
        } else if (category === 'csharp') {
          map = CSHARP_KEYWORD_EMOJI_MAP;
          prefix = 'emojiCode.csharpKeyword';
        } else if (category === 'sql') {
          map = SQL_KEYWORD_EMOJI_MAP;
          prefix = 'emojiCode.sqlKeyword';
        } else if (category === 'typescript') {
          map = TYPESCRIPT_KEYWORD_EMOJI_MAP;
          prefix = 'emojiCode.tsKeyword';
        } else if (category === 'java') {
          map = JAVA_KEYWORD_EMOJI_MAP;
          prefix = 'emojiCode.javaKeyword';
        } else {
          return; // Unknown category
        }

        // Batch all updates in parallel (don't await - let it run in background)
        Promise.all(
          Object.keys(map).map(key =>
            config.update(`${prefix}.${key}`, value, vscode.ConfigurationTarget.Global)
          )
        ).then(() => {
          if (onSettingsChanged) onSettingsChanged();
        });
        // Don't re-render - client updates UI instantly
      }
    },
    undefined,
    context.subscriptions
  );

  // Clean up when panel is closed
  currentPanel.onDidDispose(
    () => {
      currentPanel = undefined;
    },
    undefined,
    context.subscriptions
  );
}

/**
 * Get current settings state for all emojis.
 */
function getCurrentSettings() {
  const mainCfg = vscode.workspace.getConfiguration('emojiCode');
  const jsCfg = vscode.workspace.getConfiguration('emojiCode.jsKeyword');
  const tagCfg = vscode.workspace.getConfiguration('emojiCode.htmlTag');
  const voidCfg = vscode.workspace.getConfiguration('emojiCode.htmlVoid');
  const attrCfg = vscode.workspace.getConfiguration('emojiCode.htmlAttr');
  const cssAtRuleCfg = vscode.workspace.getConfiguration('emojiCode.cssAtRule');
  const cssLayoutCfg = vscode.workspace.getConfiguration('emojiCode.cssLayout');
  const cssBoxCfg = vscode.workspace.getConfiguration('emojiCode.cssBox');
  const cssVisualCfg = vscode.workspace.getConfiguration('emojiCode.cssVisual');
  const cssPseudoCfg = vscode.workspace.getConfiguration('emojiCode.cssPseudo');
  const cssValueCfg = vscode.workspace.getConfiguration('emojiCode.cssValue');
  const pyCfg = vscode.workspace.getConfiguration('emojiCode.pyKeyword');
  const cCfg = vscode.workspace.getConfiguration('emojiCode.cKeyword');
  const cppCfg = vscode.workspace.getConfiguration('emojiCode.cppKeyword');
  const csharpCfg = vscode.workspace.getConfiguration('emojiCode.csharpKeyword');
  const sqlCfg = vscode.workspace.getConfiguration('emojiCode.sqlKeyword');
  const tsCfg = vscode.workspace.getConfiguration('emojiCode.tsKeyword');
  const javaCfg = vscode.workspace.getConfiguration('emojiCode.javaKeyword');

  const settings = {
    masterToggles: {
      javascriptKeywords: mainCfg.get('javascriptKeywords', true),
      htmlTags: mainCfg.get('htmlTags', true),
      htmlVoidElements: mainCfg.get('htmlVoidElements', true),
      htmlAttributes: mainCfg.get('htmlAttributes', true),
      cssAtRules: mainCfg.get('cssAtRules', true),
      cssLayout: mainCfg.get('cssLayout', true),
      cssBox: mainCfg.get('cssBox', true),
      cssVisual: mainCfg.get('cssVisual', true),
      cssPseudo: mainCfg.get('cssPseudo', true),
      cssValues: mainCfg.get('cssValues', true),
      pythonKeywords: mainCfg.get('pythonKeywords', true),
      cKeywords: mainCfg.get('cKeywords', true),
      cppKeywords: mainCfg.get('cppKeywords', true),
      csharpKeywords: mainCfg.get('csharpKeywords', true),
      sqlKeywords: mainCfg.get('sqlKeywords', true),
      typescriptKeywords: mainCfg.get('typescriptKeywords', true),
      javaKeywords: mainCfg.get('javaKeywords', true),
    },
    javascript: {},
    tags: {},
    void: {},
    attr: {},
    cssAtRule: {},
    cssLayout: {},
    cssBox: {},
    cssVisual: {},
    cssPseudo: {},
    cssValue: {},
    python: {},
    c: {},
    cpp: {},
    csharp: {},
    sql: {},
    typescript: {},
    java: {},
  };

  for (const key of Object.keys(KEYWORD_EMOJI_MAP)) {
    settings.javascript[key] = jsCfg.get(key, true);
  }
  for (const key of Object.keys(HTML_TAG_EMOJI_MAP)) {
    settings.tags[key] = tagCfg.get(key, true);
  }
  for (const key of Object.keys(HTML_VOID_EMOJI_MAP)) {
    settings.void[key] = voidCfg.get(key, true);
  }
  for (const key of Object.keys(HTML_ATTR_EMOJI_MAP)) {
    settings.attr[key] = attrCfg.get(key, true);
  }
  for (const key of Object.keys(CSS_ATRULE_EMOJI_MAP)) {
    settings.cssAtRule[key] = cssAtRuleCfg.get(key, true);
  }
  for (const key of Object.keys(CSS_LAYOUT_EMOJI_MAP)) {
    settings.cssLayout[key] = cssLayoutCfg.get(key, true);
  }
  for (const key of Object.keys(CSS_BOX_EMOJI_MAP)) {
    settings.cssBox[key] = cssBoxCfg.get(key, true);
  }
  for (const key of Object.keys(CSS_VISUAL_EMOJI_MAP)) {
    settings.cssVisual[key] = cssVisualCfg.get(key, true);
  }
  for (const key of Object.keys(CSS_PSEUDO_EMOJI_MAP)) {
    settings.cssPseudo[key] = cssPseudoCfg.get(key, true);
  }
  for (const key of Object.keys(CSS_VALUE_EMOJI_MAP)) {
    settings.cssValue[key] = cssValueCfg.get(key, true);
  }
  for (const key of Object.keys(PYTHON_KEYWORD_EMOJI_MAP)) {
    settings.python[key] = pyCfg.get(key, true);
  }
  for (const key of Object.keys(C_KEYWORD_EMOJI_MAP)) {
    settings.c[key] = cCfg.get(key, true);
  }
  for (const key of Object.keys(CPP_KEYWORD_EMOJI_MAP)) {
    settings.cpp[key] = cppCfg.get(key, true);
  }
  for (const key of Object.keys(CSHARP_KEYWORD_EMOJI_MAP)) {
    settings.csharp[key] = csharpCfg.get(key, true);
  }
  for (const key of Object.keys(SQL_KEYWORD_EMOJI_MAP)) {
    settings.sql[key] = sqlCfg.get(key, true);
  }
  for (const key of Object.keys(TYPESCRIPT_KEYWORD_EMOJI_MAP)) {
    settings.typescript[key] = tsCfg.get(key, true);
  }
  for (const key of Object.keys(JAVA_KEYWORD_EMOJI_MAP)) {
    settings.java[key] = javaCfg.get(key, true);
  }

  return settings;
}

/**
 * Generate the HTML content for the webview.
 */
function getWebviewContent() {
  const nonce = getNonce();
  const settings = getCurrentSettings();

  // Build checkbox lists for each category
  const jsItems = Object.entries(KEYWORD_EMOJI_MAP)
    .map(([key, emoji]) => createCheckboxItem('javascript', key, emoji, key, settings.javascript[key]))
    .join('');

  const tagItems = Object.entries(HTML_TAG_EMOJI_MAP)
    .map(([key, emoji]) => createCheckboxItem('tags', key, emoji, `&lt;${key}&gt;`, settings.tags[key]))
    .join('');

  const voidItems = Object.entries(HTML_VOID_EMOJI_MAP)
    .map(([key, emoji]) => createCheckboxItem('void', key, emoji, `&lt;${key}&gt;`, settings.void[key]))
    .join('');

  const attrItems = Object.entries(HTML_ATTR_EMOJI_MAP)
    .map(([key, emoji]) => createCheckboxItem('attr', key, emoji, key, settings.attr[key]))
    .join('');

  // CSS items
  const cssAtRuleItems = Object.entries(CSS_ATRULE_EMOJI_MAP)
    .map(([key, emoji]) => createCheckboxItem('cssAtRule', key, emoji, `@${key}`, settings.cssAtRule[key]))
    .join('');

  const cssLayoutItems = Object.entries(CSS_LAYOUT_EMOJI_MAP)
    .map(([key, emoji]) => createCheckboxItem('cssLayout', key, emoji, key, settings.cssLayout[key]))
    .join('');

  const cssBoxItems = Object.entries(CSS_BOX_EMOJI_MAP)
    .map(([key, emoji]) => createCheckboxItem('cssBox', key, emoji, key, settings.cssBox[key]))
    .join('');

  const cssVisualItems = Object.entries(CSS_VISUAL_EMOJI_MAP)
    .map(([key, emoji]) => createCheckboxItem('cssVisual', key, emoji, key, settings.cssVisual[key]))
    .join('');

  const cssPseudoItems = Object.entries(CSS_PSEUDO_EMOJI_MAP)
    .map(([key, emoji]) => createCheckboxItem('cssPseudo', key, emoji, `:${key}`, settings.cssPseudo[key]))
    .join('');

  const cssValueItems = Object.entries(CSS_VALUE_EMOJI_MAP)
    .map(([key, emoji]) => createCheckboxItem('cssValue', key, emoji, key === 'important' ? '!important' : key, settings.cssValue[key]))
    .join('');

  // Python items
  const pythonItems = Object.entries(PYTHON_KEYWORD_EMOJI_MAP)
    .map(([key, emoji]) => createCheckboxItem('python', key, emoji, key, settings.python[key]))
    .join('');

  // C items
  const cItems = Object.entries(C_KEYWORD_EMOJI_MAP)
    .map(([key, emoji]) => createCheckboxItem('c', key, emoji, key, settings.c[key]))
    .join('');

  // C++ items
  const cppItems = Object.entries(CPP_KEYWORD_EMOJI_MAP)
    .map(([key, emoji]) => createCheckboxItem('cpp', key, emoji, key, settings.cpp[key]))
    .join('');

  // C# items
  const csharpItems = Object.entries(CSHARP_KEYWORD_EMOJI_MAP)
    .map(([key, emoji]) => createCheckboxItem('csharp', key, emoji, key, settings.csharp[key]))
    .join('');

  // SQL items
  const sqlItems = Object.entries(SQL_KEYWORD_EMOJI_MAP)
    .map(([key, emoji]) => createCheckboxItem('sql', key, emoji, key, settings.sql[key]))
    .join('');

  // TypeScript items
  const typescriptItems = Object.entries(TYPESCRIPT_KEYWORD_EMOJI_MAP)
    .map(([key, emoji]) => createCheckboxItem('typescript', key, emoji, key, settings.typescript[key]))
    .join('');

  // Java items
  const javaItems = Object.entries(JAVA_KEYWORD_EMOJI_MAP)
    .map(([key, emoji]) => createCheckboxItem('java', key, emoji, key, settings.java[key]))
    .join('');

  const jsCount = Object.keys(KEYWORD_EMOJI_MAP).length;
  const pythonCount = Object.keys(PYTHON_KEYWORD_EMOJI_MAP).length;
  const cCount = Object.keys(C_KEYWORD_EMOJI_MAP).length;
  const cppCount = Object.keys(CPP_KEYWORD_EMOJI_MAP).length;
  const csharpCount = Object.keys(CSHARP_KEYWORD_EMOJI_MAP).length;
  const sqlCount = Object.keys(SQL_KEYWORD_EMOJI_MAP).length;
  const typescriptCount = Object.keys(TYPESCRIPT_KEYWORD_EMOJI_MAP).length;
  const javaCount = Object.keys(JAVA_KEYWORD_EMOJI_MAP).length;
  const tagCount = Object.keys(HTML_TAG_EMOJI_MAP).length;
  const voidCount = Object.keys(HTML_VOID_EMOJI_MAP).length;
  const attrCount = Object.keys(HTML_ATTR_EMOJI_MAP).length;
  const cssAtRuleCount = Object.keys(CSS_ATRULE_EMOJI_MAP).length;
  const cssLayoutCount = Object.keys(CSS_LAYOUT_EMOJI_MAP).length;
  const cssBoxCount = Object.keys(CSS_BOX_EMOJI_MAP).length;
  const cssVisualCount = Object.keys(CSS_VISUAL_EMOJI_MAP).length;
  const cssPseudoCount = Object.keys(CSS_PSEUDO_EMOJI_MAP).length;
  const cssValueCount = Object.keys(CSS_VALUE_EMOJI_MAP).length;
  const cssTotal = cssAtRuleCount + cssLayoutCount + cssBoxCount + cssVisualCount + cssPseudoCount + cssValueCount;

  // Determine which tab content to show (server-side)
  const jsTabActive = currentTab === 'javascript' ? 'active' : '';
  const htmlTabActive = currentTab === 'html' ? 'active' : '';
  const cssTabActive = currentTab === 'css' ? 'active' : '';
  const pythonTabActive = currentTab === 'python' ? 'active' : '';
  const cTabActive = currentTab === 'c' ? 'active' : '';
  const cppTabActive = currentTab === 'cpp' ? 'active' : '';
  const csharpTabActive = currentTab === 'csharp' ? 'active' : '';
  const sqlTabActive = currentTab === 'sql' ? 'active' : '';
  const typescriptTabActive = currentTab === 'typescript' ? 'active' : '';
  const javaTabActive = currentTab === 'java' ? 'active' : '';
  const jsContentActive = currentTab === 'javascript' ? 'active' : '';
  const htmlContentActive = currentTab === 'html' ? 'active' : '';
  const cssContentActive = currentTab === 'css' ? 'active' : '';
  const pythonContentActive = currentTab === 'python' ? 'active' : '';
  const cContentActive = currentTab === 'c' ? 'active' : '';
  const cppContentActive = currentTab === 'cpp' ? 'active' : '';
  const csharpContentActive = currentTab === 'csharp' ? 'active' : '';
  const sqlContentActive = currentTab === 'sql' ? 'active' : '';
  const typescriptContentActive = currentTab === 'typescript' ? 'active' : '';
  const javaContentActive = currentTab === 'java' ? 'active' : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EmojiCode-Pro Settings</title>
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <style>
    :root {
      --bg-color: var(--vscode-editor-background);
      --fg-color: var(--vscode-editor-foreground);
      --border-color: var(--vscode-panel-border);
      --tab-active-bg: var(--vscode-tab-activeBackground);
      --tab-inactive-bg: var(--vscode-tab-inactiveBackground);
      --tab-active-fg: var(--vscode-tab-activeForeground);
      --tab-inactive-fg: var(--vscode-tab-inactiveForeground);
      --button-bg: var(--vscode-button-background);
      --button-fg: var(--vscode-button-foreground);
      --button-hover-bg: var(--vscode-button-hoverBackground);
      --checkbox-bg: var(--vscode-checkbox-background);
      --checkbox-border: var(--vscode-checkbox-border);
      --focus-border: var(--vscode-focusBorder);
    }

    * { box-sizing: border-box; }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--fg-color);
      background: var(--bg-color);
      margin: 0;
      padding: 20px;
    }

    h1 {
      font-size: 1.5em;
      margin: 0 0 20px 0;
      font-weight: 500;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 20px;
    }

    .tab {
      padding: 10px 20px;
      cursor: pointer;
      border: none;
      background: var(--tab-inactive-bg);
      color: var(--tab-inactive-fg);
      font-size: 1em;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover { background: var(--tab-active-bg); }

    .tab.active {
      background: var(--tab-active-bg);
      color: var(--tab-active-fg);
      border-bottom-color: var(--focus-border);
    }

    .tab.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .tab-content { display: none; }
    .tab-content.active { display: block; }

    .master-toggle {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 15px;
      background: var(--tab-inactive-bg);
      border-radius: 6px;
      margin-bottom: 15px;
    }

    .master-toggle label {
      font-weight: 500;
      flex: 1;
    }

    .bulk-actions {
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
    }

    .bulk-btn {
      padding: 6px 14px;
      background: var(--button-bg);
      color: var(--button-fg);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9em;
    }

    .bulk-btn:hover { background: var(--button-hover-bg); }

    .emoji-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 8px;
    }

    .emoji-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      background: var(--tab-inactive-bg);
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .emoji-item:hover { background: var(--tab-active-bg); }

    .emoji-item input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: var(--focus-border);
    }

    .emoji-item .emoji {
      font-size: 1.3em;
      width: 28px;
      text-align: center;
    }

    .emoji-item .name {
      flex: 1;
      font-family: var(--vscode-editor-font-family), monospace;
      font-size: 0.95em;
    }

    .count {
      font-size: 0.85em;
      color: var(--tab-inactive-fg);
      margin-left: 8px;
    }

    .section {
      margin-bottom: 20px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 15px;
    }

    .section-title {
      font-weight: 500;
      margin-bottom: 15px;
      font-size: 1.1em;
    }
  </style>
</head>
<body>
  <h1>EmojiCode-Pro Settings</h1>

  <div class="tabs">
    <button class="tab ${jsTabActive}" data-tab="javascript" type="button">
      JavaScript <span class="count">(${jsCount})</span>
    </button>
    <button class="tab ${htmlTabActive}" data-tab="html" type="button">
      HTML <span class="count">(${tagCount + voidCount + attrCount})</span>
    </button>
    <button class="tab ${cssTabActive}" data-tab="css" type="button">
      CSS <span class="count">(${cssTotal})</span>
    </button>
    <button class="tab ${pythonTabActive}" data-tab="python" type="button">
      Python <span class="count">(${pythonCount})</span>
    </button>
    <button class="tab ${cTabActive}" data-tab="c" type="button">
      C <span class="count">(${cCount})</span>
    </button>
    <button class="tab ${cppTabActive}" data-tab="cpp" type="button">
      C++ <span class="count">(${cppCount})</span>
    </button>
    <button class="tab ${csharpTabActive}" data-tab="csharp" type="button">
      C# <span class="count">(${csharpCount})</span>
    </button>
    <button class="tab ${sqlTabActive}" data-tab="sql" type="button">
      SQL <span class="count">(${sqlCount})</span>
    </button>
    <button class="tab ${typescriptTabActive}" data-tab="typescript" type="button">
      TypeScript <span class="count">(${typescriptCount})</span>
    </button>
    <button class="tab ${javaTabActive}" data-tab="java" type="button">
      Java <span class="count">(${javaCount})</span>
    </button>
  </div>

  <!-- JavaScript Tab -->
  <div id="javascript" class="tab-content ${jsContentActive}">
    <div class="master-toggle">
      <input type="checkbox" id="master-javascript" data-setting-key="emojiCode.javascriptKeywords" ${settings.masterToggles.javascriptKeywords ? 'checked' : ''}>
      <label for="master-javascript">Enable JavaScript keyword emojis</label>
    </div>
    <div class="bulk-actions">
      <button class="bulk-btn" data-toggle-all="javascript" data-toggle-value="true" type="button">Select All</button>
      <button class="bulk-btn" data-toggle-all="javascript" data-toggle-value="false" type="button">Deselect All</button>
    </div>
    <div class="emoji-grid">${jsItems}</div>
  </div>

  <!-- HTML Tab -->
  <div id="html" class="tab-content ${htmlContentActive}">
    <!-- Tags Section -->
    <div class="section">
      <div class="section-title">Tags <span class="count">(${tagCount})</span></div>
      <div class="master-toggle">
        <input type="checkbox" id="master-tags" data-setting-key="emojiCode.htmlTags" ${settings.masterToggles.htmlTags ? 'checked' : ''}>
        <label for="master-tags">Enable tag emojis</label>
      </div>
      <div class="bulk-actions">
        <button class="bulk-btn" data-toggle-all="tags" data-toggle-value="true" type="button">Select All</button>
        <button class="bulk-btn" data-toggle-all="tags" data-toggle-value="false" type="button">Deselect All</button>
      </div>
      <div class="emoji-grid">${tagItems}</div>
    </div>

    <!-- Void Elements Section -->
    <div class="section">
      <div class="section-title">Void Elements <span class="count">(${voidCount})</span></div>
      <div class="master-toggle">
        <input type="checkbox" id="master-void" data-setting-key="emojiCode.htmlVoidElements" ${settings.masterToggles.htmlVoidElements ? 'checked' : ''}>
        <label for="master-void">Enable void element emojis</label>
      </div>
      <div class="bulk-actions">
        <button class="bulk-btn" data-toggle-all="void" data-toggle-value="true" type="button">Select All</button>
        <button class="bulk-btn" data-toggle-all="void" data-toggle-value="false" type="button">Deselect All</button>
      </div>
      <div class="emoji-grid">${voidItems}</div>
    </div>

    <!-- Attributes Section -->
    <div class="section">
      <div class="section-title">Attributes <span class="count">(${attrCount})</span></div>
      <div class="master-toggle">
        <input type="checkbox" id="master-attr" data-setting-key="emojiCode.htmlAttributes" ${settings.masterToggles.htmlAttributes ? 'checked' : ''}>
        <label for="master-attr">Enable attribute emojis</label>
      </div>
      <div class="bulk-actions">
        <button class="bulk-btn" data-toggle-all="attr" data-toggle-value="true" type="button">Select All</button>
        <button class="bulk-btn" data-toggle-all="attr" data-toggle-value="false" type="button">Deselect All</button>
      </div>
      <div class="emoji-grid">${attrItems}</div>
    </div>
  </div>

  <!-- CSS Tab -->
  <div id="css" class="tab-content ${cssContentActive}">
    <!-- At-Rules Section -->
    <div class="section">
      <div class="section-title">At-Rules <span class="count">(${cssAtRuleCount})</span></div>
      <div class="master-toggle">
        <input type="checkbox" id="master-cssAtRule" data-setting-key="emojiCode.cssAtRules" ${settings.masterToggles.cssAtRules ? 'checked' : ''}>
        <label for="master-cssAtRule">Enable at-rule emojis</label>
      </div>
      <div class="bulk-actions">
        <button class="bulk-btn" data-toggle-all="cssAtRule" data-toggle-value="true" type="button">Select All</button>
        <button class="bulk-btn" data-toggle-all="cssAtRule" data-toggle-value="false" type="button">Deselect All</button>
      </div>
      <div class="emoji-grid">${cssAtRuleItems}</div>
    </div>

    <!-- Layout Section -->
    <div class="section">
      <div class="section-title">Layout Properties <span class="count">(${cssLayoutCount})</span></div>
      <div class="master-toggle">
        <input type="checkbox" id="master-cssLayout" data-setting-key="emojiCode.cssLayout" ${settings.masterToggles.cssLayout ? 'checked' : ''}>
        <label for="master-cssLayout">Enable layout emojis</label>
      </div>
      <div class="bulk-actions">
        <button class="bulk-btn" data-toggle-all="cssLayout" data-toggle-value="true" type="button">Select All</button>
        <button class="bulk-btn" data-toggle-all="cssLayout" data-toggle-value="false" type="button">Deselect All</button>
      </div>
      <div class="emoji-grid">${cssLayoutItems}</div>
    </div>

    <!-- Box Model Section -->
    <div class="section">
      <div class="section-title">Box Model <span class="count">(${cssBoxCount})</span></div>
      <div class="master-toggle">
        <input type="checkbox" id="master-cssBox" data-setting-key="emojiCode.cssBox" ${settings.masterToggles.cssBox ? 'checked' : ''}>
        <label for="master-cssBox">Enable box model emojis</label>
      </div>
      <div class="bulk-actions">
        <button class="bulk-btn" data-toggle-all="cssBox" data-toggle-value="true" type="button">Select All</button>
        <button class="bulk-btn" data-toggle-all="cssBox" data-toggle-value="false" type="button">Deselect All</button>
      </div>
      <div class="emoji-grid">${cssBoxItems}</div>
    </div>

    <!-- Visual Section -->
    <div class="section">
      <div class="section-title">Visual Properties <span class="count">(${cssVisualCount})</span></div>
      <div class="master-toggle">
        <input type="checkbox" id="master-cssVisual" data-setting-key="emojiCode.cssVisual" ${settings.masterToggles.cssVisual ? 'checked' : ''}>
        <label for="master-cssVisual">Enable visual emojis</label>
      </div>
      <div class="bulk-actions">
        <button class="bulk-btn" data-toggle-all="cssVisual" data-toggle-value="true" type="button">Select All</button>
        <button class="bulk-btn" data-toggle-all="cssVisual" data-toggle-value="false" type="button">Deselect All</button>
      </div>
      <div class="emoji-grid">${cssVisualItems}</div>
    </div>

    <!-- Pseudo-classes Section -->
    <div class="section">
      <div class="section-title">Pseudo-classes <span class="count">(${cssPseudoCount})</span></div>
      <div class="master-toggle">
        <input type="checkbox" id="master-cssPseudo" data-setting-key="emojiCode.cssPseudo" ${settings.masterToggles.cssPseudo ? 'checked' : ''}>
        <label for="master-cssPseudo">Enable pseudo-class emojis</label>
      </div>
      <div class="bulk-actions">
        <button class="bulk-btn" data-toggle-all="cssPseudo" data-toggle-value="true" type="button">Select All</button>
        <button class="bulk-btn" data-toggle-all="cssPseudo" data-toggle-value="false" type="button">Deselect All</button>
      </div>
      <div class="emoji-grid">${cssPseudoItems}</div>
    </div>

    <!-- Values Section -->
    <div class="section">
      <div class="section-title">Important Values <span class="count">(${cssValueCount})</span></div>
      <div class="master-toggle">
        <input type="checkbox" id="master-cssValue" data-setting-key="emojiCode.cssValues" ${settings.masterToggles.cssValues ? 'checked' : ''}>
        <label for="master-cssValue">Enable value emojis</label>
      </div>
      <div class="bulk-actions">
        <button class="bulk-btn" data-toggle-all="cssValue" data-toggle-value="true" type="button">Select All</button>
        <button class="bulk-btn" data-toggle-all="cssValue" data-toggle-value="false" type="button">Deselect All</button>
      </div>
      <div class="emoji-grid">${cssValueItems}</div>
    </div>
  </div>

  <!-- Python Tab -->
  <div id="python" class="tab-content ${pythonContentActive}">
    <div class="master-toggle">
      <input type="checkbox" id="master-python" data-setting-key="emojiCode.pythonKeywords" ${settings.masterToggles.pythonKeywords ? 'checked' : ''}>
      <label for="master-python">Enable Python keyword emojis</label>
    </div>
    <div class="bulk-actions">
      <button class="bulk-btn" data-toggle-all="python" data-toggle-value="true" type="button">Select All</button>
      <button class="bulk-btn" data-toggle-all="python" data-toggle-value="false" type="button">Deselect All</button>
    </div>
    <div class="emoji-grid">${pythonItems}</div>
  </div>

  <!-- C Tab -->
  <div id="c" class="tab-content ${cContentActive}">
    <div class="master-toggle">
      <input type="checkbox" id="master-c" data-setting-key="emojiCode.cKeywords" ${settings.masterToggles.cKeywords ? 'checked' : ''}>
      <label for="master-c">Enable C keyword emojis</label>
    </div>
    <div class="bulk-actions">
      <button class="bulk-btn" data-toggle-all="c" data-toggle-value="true" type="button">Select All</button>
      <button class="bulk-btn" data-toggle-all="c" data-toggle-value="false" type="button">Deselect All</button>
    </div>
    <div class="emoji-grid">${cItems}</div>
  </div>

  <!-- C++ Tab -->
  <div id="cpp" class="tab-content ${cppContentActive}">
    <div class="master-toggle">
      <input type="checkbox" id="master-cpp" data-setting-key="emojiCode.cppKeywords" ${settings.masterToggles.cppKeywords ? 'checked' : ''}>
      <label for="master-cpp">Enable C++ keyword emojis</label>
    </div>
    <div class="bulk-actions">
      <button class="bulk-btn" data-toggle-all="cpp" data-toggle-value="true" type="button">Select All</button>
      <button class="bulk-btn" data-toggle-all="cpp" data-toggle-value="false" type="button">Deselect All</button>
    </div>
    <div class="emoji-grid">${cppItems}</div>
  </div>

  <!-- C# Tab -->
  <div id="csharp" class="tab-content ${csharpContentActive}">
    <div class="master-toggle">
      <input type="checkbox" id="master-csharp" data-setting-key="emojiCode.csharpKeywords" ${settings.masterToggles.csharpKeywords ? 'checked' : ''}>
      <label for="master-csharp">Enable C# keyword emojis</label>
    </div>
    <div class="bulk-actions">
      <button class="bulk-btn" data-toggle-all="csharp" data-toggle-value="true" type="button">Select All</button>
      <button class="bulk-btn" data-toggle-all="csharp" data-toggle-value="false" type="button">Deselect All</button>
    </div>
    <div class="emoji-grid">${csharpItems}</div>
  </div>

  <!-- SQL Tab -->
  <div id="sql" class="tab-content ${sqlContentActive}">
    <div class="master-toggle">
      <input type="checkbox" id="master-sql" data-setting-key="emojiCode.sqlKeywords" ${settings.masterToggles.sqlKeywords ? 'checked' : ''}>
      <label for="master-sql">Enable SQL keyword emojis</label>
    </div>
    <div class="bulk-actions">
      <button class="bulk-btn" data-toggle-all="sql" data-toggle-value="true" type="button">Select All</button>
      <button class="bulk-btn" data-toggle-all="sql" data-toggle-value="false" type="button">Deselect All</button>
    </div>
    <div class="emoji-grid">${sqlItems}</div>
  </div>

  <!-- TypeScript Tab -->
  <div id="typescript" class="tab-content ${typescriptContentActive}">
    <div class="master-toggle">
      <input type="checkbox" id="master-typescript" data-setting-key="emojiCode.typescriptKeywords" ${settings.masterToggles.typescriptKeywords ? 'checked' : ''}>
      <label for="master-typescript">Enable TypeScript keyword emojis</label>
    </div>
    <div class="bulk-actions">
      <button class="bulk-btn" data-toggle-all="typescript" data-toggle-value="true" type="button">Select All</button>
      <button class="bulk-btn" data-toggle-all="typescript" data-toggle-value="false" type="button">Deselect All</button>
    </div>
    <div class="emoji-grid">${typescriptItems}</div>
  </div>

  <!-- Java Tab -->
  <div id="java" class="tab-content ${javaContentActive}">
    <div class="master-toggle">
      <input type="checkbox" id="master-java" data-setting-key="emojiCode.javaKeywords" ${settings.masterToggles.javaKeywords ? 'checked' : ''}>
      <label for="master-java">Enable Java keyword emojis</label>
    </div>
    <div class="bulk-actions">
      <button class="bulk-btn" data-toggle-all="java" data-toggle-value="true" type="button">Select All</button>
      <button class="bulk-btn" data-toggle-all="java" data-toggle-value="false" type="button">Deselect All</button>
    </div>
    <div class="emoji-grid">${javaItems}</div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    const CONFIG_MAP = {
      javascript: 'emojiCode.jsKeyword.',
      tags: 'emojiCode.htmlTag.',
      void: 'emojiCode.htmlVoid.',
      attr: 'emojiCode.htmlAttr.',
      cssAtRule: 'emojiCode.cssAtRule.',
      cssLayout: 'emojiCode.cssLayout.',
      cssBox: 'emojiCode.cssBox.',
      cssVisual: 'emojiCode.cssVisual.',
      cssPseudo: 'emojiCode.cssPseudo.',
      cssValue: 'emojiCode.cssValue.',
      python: 'emojiCode.pyKeyword.',
      c: 'emojiCode.cKeyword.',
      cpp: 'emojiCode.cppKeyword.',
      csharp: 'emojiCode.csharpKeyword.',
      sql: 'emojiCode.sqlKeyword.',
      typescript: 'emojiCode.tsKeyword.',
      java: 'emojiCode.javaKeyword.'
    };

    // Tab buttons
    document.querySelectorAll('[data-tab]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        vscode.postMessage({ command: 'switchTab', tab: this.dataset.tab });
      });
    });

    // Master toggle checkboxes
    document.querySelectorAll('[data-setting-key]').forEach(function(cb) {
      cb.addEventListener('change', function() {
        vscode.postMessage({ command: 'toggleSetting', key: this.dataset.settingKey, value: this.checked });
      });
    });

    // Bulk select/deselect buttons
    document.querySelectorAll('[data-toggle-all]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var category = this.dataset.toggleAll;
        var value = this.dataset.toggleValue === 'true';
        var section = this.closest('.section') || this.closest('.tab-content');
        if (section) {
          section.querySelectorAll('.emoji-item input[type="checkbox"]').forEach(function(cb) { cb.checked = value; });
        }
        vscode.postMessage({ command: 'toggleAll', category: category, value: value });
      });
    });

    // Individual emoji checkboxes
    document.querySelectorAll('[data-category]').forEach(function(cb) {
      cb.addEventListener('change', function() {
        var prefix = CONFIG_MAP[this.dataset.category];
        if (!prefix) return;
        vscode.postMessage({ command: 'toggleSetting', key: prefix + this.dataset.key, value: this.checked });
      });
    });
  </script>
</body>
</html>`;
}

/**
 * Create HTML for a single checkbox item.
 */
function createCheckboxItem(category, key, emoji, displayName, checked) {
  return `
    <label class="emoji-item">
      <input type="checkbox" ${checked ? 'checked' : ''} data-category="${category}" data-key="${key}">
      <span class="emoji">${emoji}</span>
      <span class="name">${displayName}</span>
    </label>
  `;
}

/**
 * Refresh the panel content (call after external setting changes).
 */
function refreshPanel() {
  if (currentPanel) {
    currentPanel.webview.html = getWebviewContent();
  }
}

module.exports = { openSettingsPanel, refreshPanel };
