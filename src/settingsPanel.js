// Custom webview panel for configuring HTML emoji settings with a tabbed interface.

const vscode = require('vscode');
const { HTML_TAG_EMOJI_MAP, HTML_VOID_EMOJI_MAP, HTML_ATTR_EMOJI_MAP } = require('./htmlKeywordMap');

let currentPanel = undefined;

/**
 * Opens (or focuses) the Emoji-Code settings panel.
 * @param {vscode.ExtensionContext} context
 * @param {function} onSettingsChanged - callback when settings change
 */
function openSettingsPanel(context, onSettingsChanged) {
  const column = vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.viewColumn
    : undefined;

  // If panel already exists, reveal it
  if (currentPanel) {
    currentPanel.reveal(column);
    return;
  }

  // Create new panel
  currentPanel = vscode.window.createWebviewPanel(
    'emojiCodeSettings',
    'Emoji-Code Settings',
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
      if (message.command === 'toggleSetting') {
        const config = vscode.workspace.getConfiguration();
        await config.update(message.key, message.value, vscode.ConfigurationTarget.Global);
        if (onSettingsChanged) onSettingsChanged();
      } else if (message.command === 'toggleAll') {
        const config = vscode.workspace.getConfiguration();
        const { category, value } = message;

        let map, prefix;
        if (category === 'tags') {
          map = HTML_TAG_EMOJI_MAP;
          prefix = 'emojiCode.htmlTag';
        } else if (category === 'void') {
          map = HTML_VOID_EMOJI_MAP;
          prefix = 'emojiCode.htmlVoid';
        } else {
          map = HTML_ATTR_EMOJI_MAP;
          prefix = 'emojiCode.htmlAttr';
        }

        for (const key of Object.keys(map)) {
          await config.update(`${prefix}.${key}`, value, vscode.ConfigurationTarget.Global);
        }
        if (onSettingsChanged) onSettingsChanged();

        // Refresh the panel to show updated state
        currentPanel.webview.html = getWebviewContent();
      } else if (message.command === 'getSettings') {
        // Send current settings to webview
        currentPanel.webview.postMessage({
          command: 'settingsData',
          settings: getCurrentSettings(),
        });
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
 * Get current settings state for all HTML emojis.
 */
function getCurrentSettings() {
  const tagCfg = vscode.workspace.getConfiguration('emojiCode.htmlTag');
  const voidCfg = vscode.workspace.getConfiguration('emojiCode.htmlVoid');
  const attrCfg = vscode.workspace.getConfiguration('emojiCode.htmlAttr');
  const mainCfg = vscode.workspace.getConfiguration('emojiCode');

  const settings = {
    masterToggles: {
      htmlTags: mainCfg.get('htmlTags', true),
      htmlVoidElements: mainCfg.get('htmlVoidElements', true),
      htmlAttributes: mainCfg.get('htmlAttributes', true),
    },
    tags: {},
    void: {},
    attr: {},
  };

  for (const key of Object.keys(HTML_TAG_EMOJI_MAP)) {
    settings.tags[key] = tagCfg.get(key, true);
  }
  for (const key of Object.keys(HTML_VOID_EMOJI_MAP)) {
    settings.void[key] = voidCfg.get(key, true);
  }
  for (const key of Object.keys(HTML_ATTR_EMOJI_MAP)) {
    settings.attr[key] = attrCfg.get(key, true);
  }

  return settings;
}

/**
 * Generate the HTML content for the webview.
 */
function getWebviewContent() {
  const settings = getCurrentSettings();

  // Build checkbox lists for each category
  const tagItems = Object.entries(HTML_TAG_EMOJI_MAP)
    .map(([key, emoji]) => createCheckboxItem('tags', key, emoji, `<${key}>`, settings.tags[key]))
    .join('');

  const voidItems = Object.entries(HTML_VOID_EMOJI_MAP)
    .map(([key, emoji]) => createCheckboxItem('void', key, emoji, `<${key}>`, settings.void[key]))
    .join('');

  const attrItems = Object.entries(HTML_ATTR_EMOJI_MAP)
    .map(([key, emoji]) => createCheckboxItem('attr', key, emoji, key, settings.attr[key]))
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Emoji-Code Settings</title>
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

    * {
      box-sizing: border-box;
    }

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

    .tab:hover {
      background: var(--tab-active-bg);
    }

    .tab.active {
      background: var(--tab-active-bg);
      color: var(--tab-active-fg);
      border-bottom-color: var(--focus-border);
    }

    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
    }

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
      margin-bottom: 20px;
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

    .bulk-btn:hover {
      background: var(--button-hover-bg);
    }

    .emoji-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
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

    .emoji-item:hover {
      background: var(--tab-active-bg);
    }

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

    .emoji-item.disabled {
      opacity: 0.5;
    }

    .count {
      font-size: 0.85em;
      color: var(--tab-inactive-fg);
      margin-left: 8px;
    }

    .search-box {
      width: 100%;
      padding: 8px 12px;
      margin-bottom: 15px;
      background: var(--checkbox-bg);
      border: 1px solid var(--checkbox-border);
      border-radius: 4px;
      color: var(--fg-color);
      font-size: 1em;
    }

    .search-box:focus {
      outline: none;
      border-color: var(--focus-border);
    }
  </style>
</head>
<body>
  <h1>Emoji-Code HTML Settings</h1>

  <div class="tabs">
    <button class="tab active" data-tab="tags">
      Tags <span class="count">(${Object.keys(HTML_TAG_EMOJI_MAP).length})</span>
    </button>
    <button class="tab" data-tab="void">
      Void Elements <span class="count">(${Object.keys(HTML_VOID_EMOJI_MAP).length})</span>
    </button>
    <button class="tab" data-tab="attr">
      Attributes <span class="count">(${Object.keys(HTML_ATTR_EMOJI_MAP).length})</span>
    </button>
  </div>

  <!-- Tags Tab -->
  <div id="tags" class="tab-content active">
    <div class="master-toggle">
      <input type="checkbox" id="master-tags" ${settings.masterToggles.htmlTags ? 'checked' : ''}>
      <label for="master-tags">Enable all tag emojis</label>
    </div>
    <input type="text" class="search-box" placeholder="Search tags..." data-target="tags">
    <div class="bulk-actions">
      <button class="bulk-btn" data-action="all" data-category="tags">Select All</button>
      <button class="bulk-btn" data-action="none" data-category="tags">Deselect All</button>
    </div>
    <div class="emoji-grid" id="tags-grid">
      ${tagItems}
    </div>
  </div>

  <!-- Void Elements Tab -->
  <div id="void" class="tab-content">
    <div class="master-toggle">
      <input type="checkbox" id="master-void" ${settings.masterToggles.htmlVoidElements ? 'checked' : ''}>
      <label for="master-void">Enable all void element emojis</label>
    </div>
    <input type="text" class="search-box" placeholder="Search void elements..." data-target="void">
    <div class="bulk-actions">
      <button class="bulk-btn" data-action="all" data-category="void">Select All</button>
      <button class="bulk-btn" data-action="none" data-category="void">Deselect All</button>
    </div>
    <div class="emoji-grid" id="void-grid">
      ${voidItems}
    </div>
  </div>

  <!-- Attributes Tab -->
  <div id="attr" class="tab-content">
    <div class="master-toggle">
      <input type="checkbox" id="master-attr" ${settings.masterToggles.htmlAttributes ? 'checked' : ''}>
      <label for="master-attr">Enable all attribute emojis</label>
    </div>
    <input type="text" class="search-box" placeholder="Search attributes..." data-target="attr">
    <div class="bulk-actions">
      <button class="bulk-btn" data-action="all" data-category="attr">Select All</button>
      <button class="bulk-btn" data-action="none" data-category="attr">Deselect All</button>
    </div>
    <div class="emoji-grid" id="attr-grid">
      ${attrItems}
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
      });
    });

    // Individual checkbox toggle
    document.querySelectorAll('.emoji-item input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const { category, key } = e.target.dataset;
        let configKey;
        if (category === 'tags') configKey = 'emojiCode.htmlTag.' + key;
        else if (category === 'void') configKey = 'emojiCode.htmlVoid.' + key;
        else configKey = 'emojiCode.htmlAttr.' + key;

        vscode.postMessage({
          command: 'toggleSetting',
          key: configKey,
          value: e.target.checked
        });
      });
    });

    // Master toggles
    document.getElementById('master-tags').addEventListener('change', (e) => {
      vscode.postMessage({
        command: 'toggleSetting',
        key: 'emojiCode.htmlTags',
        value: e.target.checked
      });
    });

    document.getElementById('master-void').addEventListener('change', (e) => {
      vscode.postMessage({
        command: 'toggleSetting',
        key: 'emojiCode.htmlVoidElements',
        value: e.target.checked
      });
    });

    document.getElementById('master-attr').addEventListener('change', (e) => {
      vscode.postMessage({
        command: 'toggleSetting',
        key: 'emojiCode.htmlAttributes',
        value: e.target.checked
      });
    });

    // Bulk actions
    document.querySelectorAll('.bulk-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.action === 'all';
        const category = btn.dataset.category;

        vscode.postMessage({
          command: 'toggleAll',
          category: category,
          value: value
        });
      });
    });

    // Search filtering
    document.querySelectorAll('.search-box').forEach(input => {
      input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const gridId = e.target.dataset.target + '-grid';
        const items = document.querySelectorAll('#' + gridId + ' .emoji-item');

        items.forEach(item => {
          const name = item.querySelector('.name').textContent.toLowerCase();
          item.style.display = name.includes(query) ? 'flex' : 'none';
        });
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
      <input type="checkbox" data-category="${category}" data-key="${key}" ${checked ? 'checked' : ''}>
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
