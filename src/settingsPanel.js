// Custom webview panel for configuring Moji Pro settings with a language-based tabbed interface.
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

let currentPanel      = undefined;
let currentTab        = 'javascript'; // Track active tab server-side
let currentLicenseManager = undefined; // Reference held for message handler access

/**
 * Opens (or focuses) the Moji Pro settings panel.
 * @param {vscode.ExtensionContext} context
 * @param {import('./licenseManager').LicenseManager} licenseManager
 */
async function openSettingsPanel(context, licenseManager) {
  currentLicenseManager = licenseManager;

  const column = vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.viewColumn
    : undefined;

  // If panel already exists, reveal it AND refresh content
  if (currentPanel) {
    currentPanel.reveal(column);
    currentPanel.webview.html = await getWebviewContent();
    return;
  }

  // Create new panel
  currentPanel = vscode.window.createWebviewPanel(
    'mojiProSettings',
    'Moji Pro Settings',
    column || vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  currentPanel.webview.html = await getWebviewContent();

  // Handle messages from the webview
  currentPanel.webview.onDidReceiveMessage(
    async (message) => {
      if (message.command === 'switchTab') {
        currentTab = message.tab;
        currentPanel.webview.html = await getWebviewContent();
      } else if (message.command === 'toggleSetting') {
        const config = vscode.workspace.getConfiguration();
        await config.update(message.key, message.value, vscode.ConfigurationTarget.Global);
        // Re-render to show updated state
        currentPanel.webview.html = await getWebviewContent();
      } else if (message.command === 'activateLicense') {
        const result = await currentLicenseManager.activate(message.key);
        if (result.success) {
          currentPanel.webview.html = await getWebviewContent();
          vscode.commands.executeCommand('mojiPro._refreshDecorator');
        } else {
          currentPanel.webview.postMessage({ command: 'licenseError', error: result.error });
        }
      } else if (message.command === 'deactivateLicense') {
        await currentLicenseManager.deactivate();
        currentPanel.webview.html = await getWebviewContent();
        vscode.commands.executeCommand('mojiPro._refreshDecorator');
      } else if (message.command === 'toggleAll') {
        const config = vscode.workspace.getConfiguration();
        const { category, value } = message;

        let map, prefix;
        if (category === 'javascript') {
          map = KEYWORD_EMOJI_MAP;
          prefix = 'mojiPro.jsKeyword';
        } else if (category === 'tags') {
          map = HTML_TAG_EMOJI_MAP;
          prefix = 'mojiPro.htmlTag';
        } else if (category === 'void') {
          map = HTML_VOID_EMOJI_MAP;
          prefix = 'mojiPro.htmlVoid';
        } else if (category === 'attr') {
          map = HTML_ATTR_EMOJI_MAP;
          prefix = 'mojiPro.htmlAttr';
        } else if (category === 'cssAtRule') {
          map = CSS_ATRULE_EMOJI_MAP;
          prefix = 'mojiPro.cssAtRule';
        } else if (category === 'cssLayout') {
          map = CSS_LAYOUT_EMOJI_MAP;
          prefix = 'mojiPro.cssLayout';
        } else if (category === 'cssBox') {
          map = CSS_BOX_EMOJI_MAP;
          prefix = 'mojiPro.cssBox';
        } else if (category === 'cssVisual') {
          map = CSS_VISUAL_EMOJI_MAP;
          prefix = 'mojiPro.cssVisual';
        } else if (category === 'cssPseudo') {
          map = CSS_PSEUDO_EMOJI_MAP;
          prefix = 'mojiPro.cssPseudo';
        } else if (category === 'cssValue') {
          map = CSS_VALUE_EMOJI_MAP;
          prefix = 'mojiPro.cssValue';
        } else if (category === 'python') {
          map = PYTHON_KEYWORD_EMOJI_MAP;
          prefix = 'mojiPro.pyKeyword';
        } else if (category === 'c') {
          map = C_KEYWORD_EMOJI_MAP;
          prefix = 'mojiPro.cKeyword';
        } else if (category === 'cpp') {
          map = CPP_KEYWORD_EMOJI_MAP;
          prefix = 'mojiPro.cppKeyword';
        } else if (category === 'csharp') {
          map = CSHARP_KEYWORD_EMOJI_MAP;
          prefix = 'mojiPro.csharpKeyword';
        } else if (category === 'sql') {
          map = SQL_KEYWORD_EMOJI_MAP;
          prefix = 'mojiPro.sqlKeyword';
        } else if (category === 'typescript') {
          map = TYPESCRIPT_KEYWORD_EMOJI_MAP;
          prefix = 'mojiPro.tsKeyword';
        } else if (category === 'java') {
          map = JAVA_KEYWORD_EMOJI_MAP;
          prefix = 'mojiPro.javaKeyword';
        } else {
          return; // Unknown category
        }

        // Batch all updates in parallel (don't await - let it run in background)
        Promise.all(
          Object.keys(map).map(key =>
            config.update(`${prefix}.${key}`, value, vscode.ConfigurationTarget.Global)
          )
        );
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
  const mainCfg = vscode.workspace.getConfiguration('mojiPro');
  const jsCfg = vscode.workspace.getConfiguration('mojiPro.jsKeyword');
  const tagCfg = vscode.workspace.getConfiguration('mojiPro.htmlTag');
  const voidCfg = vscode.workspace.getConfiguration('mojiPro.htmlVoid');
  const attrCfg = vscode.workspace.getConfiguration('mojiPro.htmlAttr');
  const cssAtRuleCfg = vscode.workspace.getConfiguration('mojiPro.cssAtRule');
  const cssLayoutCfg = vscode.workspace.getConfiguration('mojiPro.cssLayout');
  const cssBoxCfg = vscode.workspace.getConfiguration('mojiPro.cssBox');
  const cssVisualCfg = vscode.workspace.getConfiguration('mojiPro.cssVisual');
  const cssPseudoCfg = vscode.workspace.getConfiguration('mojiPro.cssPseudo');
  const cssValueCfg = vscode.workspace.getConfiguration('mojiPro.cssValue');
  const pyCfg = vscode.workspace.getConfiguration('mojiPro.pyKeyword');
  const cCfg = vscode.workspace.getConfiguration('mojiPro.cKeyword');
  const cppCfg = vscode.workspace.getConfiguration('mojiPro.cppKeyword');
  const csharpCfg = vscode.workspace.getConfiguration('mojiPro.csharpKeyword');
  const sqlCfg = vscode.workspace.getConfiguration('mojiPro.sqlKeyword');
  const tsCfg = vscode.workspace.getConfiguration('mojiPro.tsKeyword');
  const javaCfg = vscode.workspace.getConfiguration('mojiPro.javaKeyword');

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
async function getWebviewContent() {
  const nonce    = getNonce();
  const settings = getCurrentSettings();

  const licenseValid     = currentLicenseManager ? currentLicenseManager.isValid : false;
  const licenseMaskedKey = currentLicenseManager ? (await currentLicenseManager.getMaskedKey()) : null;

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
  <title>Moji Pro Settings</title>
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

    /* ── License section ──────────────────────────────────────────────── */

    .license-section {
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 14px 18px;
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .license-header {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .license-badge {
      font-weight: 600;
      font-size: 0.9em;
      padding: 3px 10px;
      border-radius: 12px;
    }

    .license-badge.active {
      background: rgba(50, 200, 100, 0.18);
      color: #3dc57a;
    }

    .license-badge.inactive {
      background: rgba(220, 80, 80, 0.15);
      color: #e06060;
    }

    .license-key-display {
      font-family: var(--vscode-editor-font-family), monospace;
      font-size: 0.9em;
      opacity: 0.7;
    }

    .license-input-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .license-input-row input[type="password"] {
      flex: 1;
      padding: 6px 10px;
      background: var(--vscode-input-background, var(--tab-inactive-bg));
      color: var(--vscode-input-foreground, var(--fg-color));
      border: 1px solid var(--vscode-input-border, var(--border-color));
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.9em;
    }

    .license-error {
      color: #e06060;
      font-size: 0.85em;
    }
  </style>
</head>
<body>
  <h1>Moji Pro Settings</h1>

  ${licenseValid ? `
  <div class="license-section">
    <div class="license-header">
      <span class="license-badge active">&#10003; Active</span>
      ${licenseMaskedKey ? `<span class="license-key-display">${licenseMaskedKey}</span>` : ''}
    </div>
    <div>
      <button class="bulk-btn" type="button" id="btn-deactivate">Deactivate License</button>
    </div>
  </div>
  ` : `
  <div class="license-section">
    <div class="license-header">
      <span class="license-badge inactive">&#10007; Not activated</span>
    </div>
    <div class="license-input-row" id="license-input-row" style="display:none">
      <input type="password" id="license-key-input" placeholder="Enter license key" autocomplete="off" spellcheck="false">
      <button class="bulk-btn" type="button" id="btn-submit-key">Submit</button>
      <button class="bulk-btn" type="button" id="btn-cancel-key">Cancel</button>
    </div>
    <div>
      <button class="bulk-btn" type="button" id="btn-activate">Activate License</button>
    </div>
    <div class="license-error" id="license-error" style="display:none"></div>
  </div>
  `}

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
      <input type="checkbox" id="master-javascript" data-setting-key="mojiPro.javascriptKeywords" ${settings.masterToggles.javascriptKeywords ? 'checked' : ''}>
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
        <input type="checkbox" id="master-tags" data-setting-key="mojiPro.htmlTags" ${settings.masterToggles.htmlTags ? 'checked' : ''}>
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
        <input type="checkbox" id="master-void" data-setting-key="mojiPro.htmlVoidElements" ${settings.masterToggles.htmlVoidElements ? 'checked' : ''}>
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
        <input type="checkbox" id="master-attr" data-setting-key="mojiPro.htmlAttributes" ${settings.masterToggles.htmlAttributes ? 'checked' : ''}>
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
        <input type="checkbox" id="master-cssAtRule" data-setting-key="mojiPro.cssAtRules" ${settings.masterToggles.cssAtRules ? 'checked' : ''}>
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
        <input type="checkbox" id="master-cssLayout" data-setting-key="mojiPro.cssLayout" ${settings.masterToggles.cssLayout ? 'checked' : ''}>
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
        <input type="checkbox" id="master-cssBox" data-setting-key="mojiPro.cssBox" ${settings.masterToggles.cssBox ? 'checked' : ''}>
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
        <input type="checkbox" id="master-cssVisual" data-setting-key="mojiPro.cssVisual" ${settings.masterToggles.cssVisual ? 'checked' : ''}>
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
        <input type="checkbox" id="master-cssPseudo" data-setting-key="mojiPro.cssPseudo" ${settings.masterToggles.cssPseudo ? 'checked' : ''}>
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
        <input type="checkbox" id="master-cssValue" data-setting-key="mojiPro.cssValues" ${settings.masterToggles.cssValues ? 'checked' : ''}>
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
      <input type="checkbox" id="master-python" data-setting-key="mojiPro.pythonKeywords" ${settings.masterToggles.pythonKeywords ? 'checked' : ''}>
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
      <input type="checkbox" id="master-c" data-setting-key="mojiPro.cKeywords" ${settings.masterToggles.cKeywords ? 'checked' : ''}>
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
      <input type="checkbox" id="master-cpp" data-setting-key="mojiPro.cppKeywords" ${settings.masterToggles.cppKeywords ? 'checked' : ''}>
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
      <input type="checkbox" id="master-csharp" data-setting-key="mojiPro.csharpKeywords" ${settings.masterToggles.csharpKeywords ? 'checked' : ''}>
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
      <input type="checkbox" id="master-sql" data-setting-key="mojiPro.sqlKeywords" ${settings.masterToggles.sqlKeywords ? 'checked' : ''}>
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
      <input type="checkbox" id="master-typescript" data-setting-key="mojiPro.typescriptKeywords" ${settings.masterToggles.typescriptKeywords ? 'checked' : ''}>
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
      <input type="checkbox" id="master-java" data-setting-key="mojiPro.javaKeywords" ${settings.masterToggles.javaKeywords ? 'checked' : ''}>
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
      javascript: 'mojiPro.jsKeyword.',
      tags: 'mojiPro.htmlTag.',
      void: 'mojiPro.htmlVoid.',
      attr: 'mojiPro.htmlAttr.',
      cssAtRule: 'mojiPro.cssAtRule.',
      cssLayout: 'mojiPro.cssLayout.',
      cssBox: 'mojiPro.cssBox.',
      cssVisual: 'mojiPro.cssVisual.',
      cssPseudo: 'mojiPro.cssPseudo.',
      cssValue: 'mojiPro.cssValue.',
      python: 'mojiPro.pyKeyword.',
      c: 'mojiPro.cKeyword.',
      cpp: 'mojiPro.cppKeyword.',
      csharp: 'mojiPro.csharpKeyword.',
      sql: 'mojiPro.sqlKeyword.',
      typescript: 'mojiPro.tsKeyword.',
      java: 'mojiPro.javaKeyword.'
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

    // ── License section interactions ────────────────────────────────────
    (function() {
      var btnActivate = document.getElementById('btn-activate');
      var btnDeactivate = document.getElementById('btn-deactivate');
      var btnSubmit = document.getElementById('btn-submit-key');
      var btnCancel = document.getElementById('btn-cancel-key');
      var inputRow = document.getElementById('license-input-row');
      var keyInput = document.getElementById('license-key-input');
      var errorDiv = document.getElementById('license-error');

      if (btnActivate) {
        btnActivate.addEventListener('click', function() {
          btnActivate.style.display = 'none';
          inputRow.style.display = 'flex';
          keyInput.focus();
        });
      }
      if (btnCancel) {
        btnCancel.addEventListener('click', function() {
          inputRow.style.display = 'none';
          btnActivate.style.display = '';
          errorDiv.style.display = 'none';
          keyInput.value = '';
        });
      }
      if (btnSubmit) {
        btnSubmit.addEventListener('click', function() {
          var key = keyInput.value.trim();
          if (!key) {
            errorDiv.textContent = 'Please enter a license key.';
            errorDiv.style.display = '';
            return;
          }
          btnSubmit.disabled = true;
          btnSubmit.textContent = 'Activating\u2026';
          vscode.postMessage({ command: 'activateLicense', key: key });
        });
      }
      if (btnDeactivate) {
        btnDeactivate.addEventListener('click', function() {
          vscode.postMessage({ command: 'deactivateLicense' });
        });
      }

      // Handle error messages sent back from the extension host
      window.addEventListener('message', function(event) {
        var msg = event.data;
        if (msg.command === 'licenseError') {
          if (errorDiv) {
            errorDiv.textContent = msg.error;
            errorDiv.style.display = '';
          }
          if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Submit';
          }
        }
      });
    })();
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

module.exports = { openSettingsPanel };
