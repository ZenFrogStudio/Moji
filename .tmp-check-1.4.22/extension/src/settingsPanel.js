// Custom webview panel for configuring Moji settings with a language-based tabbed interface.
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
const {
  DECORATION_CATEGORIES,
  getCategoryByPanelId,
} = require('./decorationCategories');
const settingsStore = require('./settingsStore');
const crypto = require('crypto');

function getNonce() {
  return crypto.randomBytes(16).toString('base64');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Extracts the RGB components of a CSS color string and returns a hex value
 * suitable for seeding an <input type="color">. Falls back to #808080 for
 * unrecognised formats — the text input remains the source of truth for alpha.
 * @param {string} colorStr  e.g. 'rgba(86,156,214,0.08)' or '#5698d6'
 * @returns {string}  e.g. '#569cd6'
 */
function rgbaToHex(colorStr) {
  const m = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return '#808080';
  return '#' + [m[1], m[2], m[3]]
    .map(n => parseInt(n, 10).toString(16).padStart(2, '0'))
    .join('');
}

let currentPanel          = undefined;

// Maps webview category names to their keyword map and VS Code config namespace.
// Derived from shared category metadata to keep panel validation and rendering aligned.
const TOGGLE_ALL_MAP = Object.fromEntries(
  DECORATION_CATEGORIES.map(category => [category.panelId, category])
);

const OVERRIDE_PREFIX_MAP = Object.fromEntries(
  DECORATION_CATEGORIES.map(category => [category.panelId, category.prefix])
);

const BOOLEAN_SETTING_KEYS = new Set([
  'mojiPro.enabled',
  'mojiPro.javascriptKeywords',
  'mojiPro.htmlTags',
  'mojiPro.htmlVoidElements',
  'mojiPro.htmlAttributes',
  'mojiPro.cssAtRules',
  'mojiPro.cssLayout',
  'mojiPro.cssBox',
  'mojiPro.cssVisual',
  'mojiPro.cssPseudo',
  'mojiPro.cssValues',
  'mojiPro.pythonKeywords',
  'mojiPro.cKeywords',
  'mojiPro.cppKeywords',
  'mojiPro.csharpKeywords',
  'mojiPro.sqlKeywords',
  'mojiPro.typescriptKeywords',
  'mojiPro.javaKeywords',
  'mojiPro.codeBlocks.enabled',
  'mojiPro.reactComponentOutlines.enabled',
]);

const STRING_SETTING_KEYS = new Set([
  'mojiPro.codeBlocks.functionColor',
  'mojiPro.codeBlocks.loopColor',
  'mojiPro.codeBlocks.controlColor',
  'mojiPro.codeBlocks.objectColor',
  'mojiPro.reactComponentOutlines.color',
]);

const ENUM_SETTING_VALUES = new Map([
  ['mojiPro.displayMode', new Set(['replace', 'overlay'])],
  ['mojiPro.emojiSize', new Set(['small', 'large'])],
  ['mojiPro.reactComponentOutlines.style', new Set(['solid', 'dashed', 'dotted'])],
]);

const NUMBER_SETTING_RANGES = new Map([
  ['mojiPro.overlayOpacity', { min: 0, max: 1 }],
  ['mojiPro.reactComponentOutlines.width', { min: 1, max: 3 }],
]);

const OVERRIDE_KEYS = new Set();
for (const [category, entry] of Object.entries(TOGGLE_ALL_MAP)) {
  const overridePrefix = OVERRIDE_PREFIX_MAP[category] || '';
  for (const key of Object.keys(entry.map)) {
    OVERRIDE_KEYS.add(`${overridePrefix}${key}`);
  }
}

function isAllowedSettingChange(key, value) {
  if (BOOLEAN_SETTING_KEYS.has(key)) return typeof value === 'boolean';
  if (STRING_SETTING_KEYS.has(key)) return typeof value === 'string' && value.length <= 200;
  if (ENUM_SETTING_VALUES.has(key)) return typeof value === 'string' && ENUM_SETTING_VALUES.get(key).has(value);

  if (NUMBER_SETTING_RANGES.has(key)) {
    const range = NUMBER_SETTING_RANGES.get(key);
    return typeof value === 'number'
      && Number.isFinite(value)
      && value >= range.min
      && value <= range.max;
  }

  return false;
}

function getAllowedPanelCategory(panelId) {
  return typeof panelId === 'string' ? getCategoryByPanelId(panelId) : undefined;
}

function isAllowedDecorationChange(panelId, key, enabled) {
  const category = getAllowedPanelCategory(panelId);
  return !!category
    && typeof key === 'string'
    && Object.prototype.hasOwnProperty.call(category.map, key)
    && typeof enabled === 'boolean';
}

function isAllowedEmojiOverride(overrideKey, emoji) {
  const chars = typeof emoji === 'string' ? Array.from(emoji) : [];
  return typeof overrideKey === 'string'
    && OVERRIDE_KEYS.has(overrideKey)
    && typeof emoji === 'string'
    && emoji.length <= 32
    && chars.length >= 1
    && chars.length <= 4;
}

function openHttpExternal(url) {
  const uri = vscode.Uri.parse(url);
  if (uri.scheme !== 'https' && uri.scheme !== 'http') return;
  vscode.env.openExternal(uri);
}

/**
 * Opens (or focuses) the Moji settings panel.
 * Settings changes are accumulated in memory while the panel is open and
 * written to VS Code config in a single batch when the panel is closed.
 * This avoids race conditions between real-time writes, the debounce guard,
 * and the active-editor check in the onDidChangeConfiguration handler.
 * @param {vscode.ExtensionContext} context
 * @param {() => void} onDisposeCallback  Called after all pending changes are
 *   written to config — use this to reload decorators and update open editors.
 */
async function openSettingsPanel(context, onDisposeCallback) {

  // Accumulate all setting changes made during this panel session. Written to
  // VS Code config in a single batch on panel close — avoids race conditions
  // with the debounce guard and active-editor check in onDidChangeConfiguration.
  const pendingChanges = new Map();
  let stagedDisabledDecorations = settingsStore.getDisabledDecorations();
  let decorationChangesPending = false;

  const column = vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.viewColumn
    : undefined;

  // If panel already exists, just reveal it — retainContextWhenHidden preserves DOM state
  if (currentPanel) {
    currentPanel.reveal(column);
    return;
  }

  // Create new panel
  currentPanel = vscode.window.createWebviewPanel(
    'mojiProSettings',
    'Moji Settings',
    column || vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [],
    }
  );

  currentPanel.webview.html = await getWebviewContent();

  // Writes all queued setting changes to VS Code config and fires the decorator
  // reload callback. Shared between the Apply button and the onDidDispose handler.
  async function flushPendingSettings() {
    if (pendingChanges.size === 0 && !decorationChangesPending) return;
    // VS Code's configuration API requires getConfiguration(section).update(key)
    // rather than getConfiguration().update(fullDottedKey) for keys with more than
    // one level of nesting (e.g. mojiPro.reactComponentOutlines.width). Using the root config
    // object with a three-segment key throws "Unable to write into user settings".
    // Sequential awaits are also required — concurrent update() calls corrupt settings.json.
    // Snapshot and clear before writing — prevents onDidDispose from re-flushing
    // the same entries if the user closes the panel after clicking Apply.
    const changesToWrite = new Map(pendingChanges);
    const disabledDecorationsToWrite = stagedDisabledDecorations;
    const shouldWriteDecorations = decorationChangesPending;
    pendingChanges.clear();
    decorationChangesPending = false;

    try {
      for (const [fullKey, value] of changesToWrite) {
        const lastDot = fullKey.lastIndexOf('.');
        const section = fullKey.slice(0, lastDot);
        const key     = fullKey.slice(lastDot + 1);
        await vscode.workspace
          .getConfiguration(section)
          .update(key, value, vscode.ConfigurationTarget.Global);
      }
      if (shouldWriteDecorations) {
        await settingsStore.saveDisabledDecorations(disabledDecorationsToWrite);
      }
    } catch (err) {
      vscode.window.showErrorMessage(`Moji: Failed to save settings — ${err.message}`);
    }
    if (typeof onDisposeCallback === 'function') onDisposeCallback();
  }

  // Handle messages from the webview
  currentPanel.webview.onDidReceiveMessage(
    async (message) => {
      if (message.command === 'toggleSetting') {
        // Guard: only accept settings surfaced by this panel, with values matching
        // their schema. This prevents arbitrary settings writes after a CSP bypass.
        if (!isAllowedSettingChange(message.key, message.value)) return;
        // Queue the change — all pending changes are flushed to config on panel close.
        pendingChanges.set(message.key, message.value);
      } else if (message.command === 'toggleDecoration') {
        if (!isAllowedDecorationChange(message.category, message.key, message.enabled)) return;
        const category = getAllowedPanelCategory(message.category);
        stagedDisabledDecorations = settingsStore.setDecorationEnabled(
          stagedDisabledDecorations,
          category.id,
          message.key,
          message.enabled
        );
        decorationChangesPending = true;
      } else if (message.command === 'toggleDecorationCategory') {
        const category = getAllowedPanelCategory(message.category);
        if (!category || typeof message.enabled !== 'boolean') return;
        // Stage the compact category change until Apply or panel close.
        stagedDisabledDecorations = settingsStore.setCategoryEnabled(
          stagedDisabledDecorations,
          category.id,
          message.enabled,
          Object.keys(category.map)
        );
        decorationChangesPending = true;
      } else if (message.command === 'applySettings') {
        await flushPendingSettings();
      } else if (message.command === 'saveEmojiCustomization') {
        if (!isAllowedEmojiOverride(message.overrideKey, message.emoji)) return;

        // Merge the new override into the existing overrides object and persist.
        // Writing directly to VS Code config (not via pendingChanges) triggers
        // onDidChangeConfiguration immediately, so the decorator rebuilds and the
        // user sees the new emoji in their editor without needing to click Apply.
        const existingOverrides = vscode.workspace
          .getConfiguration('mojiPro')
          .get('customEmojiOverrides', {});
        const updatedOverrides = Object.assign({}, existingOverrides, { [message.overrideKey]: message.emoji });

        try {
          await vscode.workspace
            .getConfiguration('mojiPro')
            .update('customEmojiOverrides', updatedOverrides, vscode.ConfigurationTarget.Global);
          currentPanel.webview.postMessage({
            command: 'emojiCustomizationSaved',
            overrideKey: message.overrideKey,
            emoji: message.emoji,
          });
        } catch (err) {
          vscode.window.showErrorMessage(`Moji: Failed to save emoji customization — ${err.message}`);
        }
      } else if (message.command === 'revertAllEmojis') {
        // Clear all custom overrides and notify the webview to restore default emoji buttons.
        try {
          await vscode.workspace
            .getConfiguration('mojiPro')
            .update('customEmojiOverrides', {}, vscode.ConfigurationTarget.Global);
          currentPanel.webview.postMessage({ command: 'allEmojisReverted' });
        } catch (err) {
          vscode.window.showErrorMessage(`Moji: Failed to revert emojis — ${err.message}`);
        }
      } else if (message.command === 'openUnicodeChart') {
        // Open the Unicode full emoji list anchored to the current emoji's code point.
        // The anchor format on unicode.org is the lowercase hex code point (e.g. #1f600).
        const anchor = typeof message.anchor === 'string' && /^[0-9a-f]{1,6}$/i.test(message.anchor)
          ? message.anchor.toLowerCase()
          : '';
        const url    = 'https://unicode.org/emoji/charts/full-emoji-list.html' + (anchor ? '#' + anchor : '');
        openHttpExternal(url);
      }
    },
    undefined,
    context.subscriptions
  );

  // Flush any remaining unsaved changes when the panel is closed, then fire the
  // decorator reload callback. Changes applied via the Apply button are cleared
  // from pendingChanges, so this is a no-op if the user already applied them.
  currentPanel.onDidDispose(
    async () => {
      currentPanel = undefined;
      await flushPendingSettings();
    },
    undefined,
    context.subscriptions
  );
}

/**
 * Get current settings state for all emojis.
 */
function getCurrentSettings() {
  const mainCfg        = vscode.workspace.getConfiguration('mojiPro');
  const codeBlocksCfg  = vscode.workspace.getConfiguration('mojiPro.codeBlocks');
  const reactComponentOutlinesCfg = vscode.workspace.getConfiguration('mojiPro.reactComponentOutlines');
  const disabledDecorations = settingsStore.getDisabledDecorations();

  const settings = {
    emojiSize: mainCfg.get('emojiSize', 'large'),
    codeBlocks: {
      enabled:       codeBlocksCfg.get('enabled',       false),
      functionColor: codeBlocksCfg.get('functionColor', 'rgba(86,156,214,0.08)'),
      loopColor:     codeBlocksCfg.get('loopColor',     'rgba(78,201,176,0.08)'),
      controlColor:  codeBlocksCfg.get('controlColor',  'rgba(197,134,192,0.08)'),
      objectColor:   codeBlocksCfg.get('objectColor',   'rgba(206,145,120,0.08)'),
    },
    reactComponentOutlines: {
      enabled:             reactComponentOutlinesCfg.get('enabled', false),
      color:               reactComponentOutlinesCfg.get('color', 'rgba(207,130,58,1)'),
      width:               reactComponentOutlinesCfg.get('width', 1),
      style:               reactComponentOutlinesCfg.get('style', 'solid'),
    },
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

  for (const category of DECORATION_CATEGORIES) {
    const target = settings[category.panelId];
    if (!target) continue;

    for (const key of Object.keys(category.map)) {
      target[key] = settingsStore.isDecorationEnabled(disabledDecorations, category.id, key);
    }
  }

  // Custom emoji overrides — keyed by the same internal category-prefixed format
  // the decorator uses (e.g. 'await', 'py:for', 'tag:div'). Read once here so
  // getWebviewContent can mark customised emoji items and pre-fill editor inputs.
  settings.customEmojiOverrides = mainCfg.get('customEmojiOverrides', {});

  return settings;
}

/**
 * Generate the HTML content for the webview.
 */
async function getWebviewContent() {
  const nonce    = getNonce();
  const settings = getCurrentSettings();

  // Helper that resolves effective emoji and customized flag from the overrides map.
  // prefix must match DECORATION_CATEGORIES (e.g. '' for JS, 'py:' for Python).
  // Defined before the buildItem calls below — const is not hoisted like function declarations.
  const overrides = settings.customEmojiOverrides;
  function buildItem(category, key, defaultEmoji, displayName, checked, prefix) {
    const overrideKey    = `${prefix}${key}`;
    const effectiveEmoji = overrides[overrideKey] || defaultEmoji;
    const isCustomized   = !!overrides[overrideKey];
    return createCheckboxItem(category, key, defaultEmoji, effectiveEmoji, displayName, checked, isCustomized);
  }

  // Build checkbox lists for each category
  const jsItems = Object.entries(KEYWORD_EMOJI_MAP)
    .map(([key, emoji]) => buildItem('javascript', key, emoji, key, settings.javascript[key], ''))
    .join('');

  const tagItems = Object.entries(HTML_TAG_EMOJI_MAP)
    .map(([key, emoji]) => buildItem('tags', key, emoji, `<${key}>`, settings.tags[key], 'tag:'))
    .join('');

  const voidItems = Object.entries(HTML_VOID_EMOJI_MAP)
    .map(([key, emoji]) => buildItem('void', key, emoji, `<${key}>`, settings.void[key], 'void:'))
    .join('');

  const attrItems = Object.entries(HTML_ATTR_EMOJI_MAP)
    .map(([key, emoji]) => buildItem('attr', key, emoji, key, settings.attr[key], 'attr:'))
    .join('');

  // CSS items
  const cssAtRuleItems = Object.entries(CSS_ATRULE_EMOJI_MAP)
    .map(([key, emoji]) => buildItem('cssAtRule', key, emoji, `@${key}`, settings.cssAtRule[key], 'cssAtRule:'))
    .join('');

  const cssLayoutItems = Object.entries(CSS_LAYOUT_EMOJI_MAP)
    .map(([key, emoji]) => buildItem('cssLayout', key, emoji, key, settings.cssLayout[key], 'cssLayout:'))
    .join('');

  const cssBoxItems = Object.entries(CSS_BOX_EMOJI_MAP)
    .map(([key, emoji]) => buildItem('cssBox', key, emoji, key, settings.cssBox[key], 'cssBox:'))
    .join('');

  const cssVisualItems = Object.entries(CSS_VISUAL_EMOJI_MAP)
    .map(([key, emoji]) => buildItem('cssVisual', key, emoji, key, settings.cssVisual[key], 'cssVisual:'))
    .join('');

  const cssPseudoItems = Object.entries(CSS_PSEUDO_EMOJI_MAP)
    .map(([key, emoji]) => buildItem('cssPseudo', key, emoji, `:${key}`, settings.cssPseudo[key], 'cssPseudo:'))
    .join('');

  const cssValueItems = Object.entries(CSS_VALUE_EMOJI_MAP)
    .map(([key, emoji]) => buildItem('cssValue', key, emoji, key === 'important' ? '!important' : key, settings.cssValue[key], 'cssValue:'))
    .join('');

  // Python items
  const pythonItems = Object.entries(PYTHON_KEYWORD_EMOJI_MAP)
    .map(([key, emoji]) => buildItem('python', key, emoji, key, settings.python[key], 'py:'))
    .join('');

  // C items
  const cItems = Object.entries(C_KEYWORD_EMOJI_MAP)
    .map(([key, emoji]) => buildItem('c', key, emoji, key, settings.c[key], 'c:'))
    .join('');

  // C++ items
  const cppItems = Object.entries(CPP_KEYWORD_EMOJI_MAP)
    .map(([key, emoji]) => buildItem('cpp', key, emoji, key, settings.cpp[key], 'cpp:'))
    .join('');

  // C# items
  const csharpItems = Object.entries(CSHARP_KEYWORD_EMOJI_MAP)
    .map(([key, emoji]) => buildItem('csharp', key, emoji, key, settings.csharp[key], 'csharp:'))
    .join('');

  // SQL items
  const sqlItems = Object.entries(SQL_KEYWORD_EMOJI_MAP)
    .map(([key, emoji]) => buildItem('sql', key, emoji, key, settings.sql[key], 'sql:'))
    .join('');

  // TypeScript items
  const typescriptItems = Object.entries(TYPESCRIPT_KEYWORD_EMOJI_MAP)
    .map(([key, emoji]) => buildItem('typescript', key, emoji, key, settings.typescript[key], 'ts:'))
    .join('');

  // Java items
  const javaItems = Object.entries(JAVA_KEYWORD_EMOJI_MAP)
    .map(([key, emoji]) => buildItem('java', key, emoji, key, settings.java[key], 'java:'))
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

  // Tab state is managed client-side after initial render; JavaScript is always the default.

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Moji Settings</title>
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

    .apply-bar {
      position: sticky;
      bottom: 0;
      display: flex;
      justify-content: flex-end;
      padding: 12px 0 4px 0;
      background: var(--bg-color);
      border-top: 1px solid var(--border-color);
      margin-top: 20px;
      z-index: 10;
    }

    .apply-btn {
      padding: 8px 24px;
      background: var(--focus-border);
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.95em;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .apply-btn:hover { opacity: 0.88; }
    .apply-btn:active { opacity: 0.75; }

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
      transition: background 0.15s;
      flex-wrap: wrap;
    }

    .emoji-item:hover { background: var(--tab-active-bg); }

    /* Minimal label wrapper — only covers the checkbox hit area */
    .emoji-item-check {
      display: flex;
      align-items: center;
      cursor: pointer;
    }

    .emoji-item-check input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: var(--focus-border);
    }

    /* Clickable emoji button — replaces the old static .emoji span */
    .emoji-btn {
      font-size: 1.3em;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: 1px solid transparent;
      border-radius: 4px;
      cursor: pointer;
      padding: 0;
      transition: border-color 0.15s, background 0.15s;
      flex-shrink: 0;
    }

    .emoji-btn:hover {
      border-color: var(--focus-border);
      background: var(--tab-active-bg);
    }

    /* Small accent dot after the emoji when a custom override is active */
    .emoji-btn.customized::after {
      content: '●';
      font-size: 0.4em;
      vertical-align: super;
      color: var(--focus-border);
      margin-left: 1px;
      line-height: 1;
    }

    /* Inline editor — rendered as a sibling to .emoji-btn, hidden by default.
       flex-wrap on .emoji-item lets it occupy the full card width on its own row. */
    .emoji-editor {
      display: none;
      align-items: center;
      gap: 4px;
      width: 100%;
      margin-top: 4px;
    }

    .emoji-unicode-input {
      width: 120px;
      padding: 3px 7px;
      font-family: var(--vscode-editor-font-family), monospace;
      font-size: 0.88em;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, var(--border-color));
      border-radius: 3px;
      outline: none;
    }

    .emoji-unicode-input:focus { border-color: var(--focus-border); }

    .emoji-unicode-input.invalid { border-color: #e06060; }

    .emoji-editor-save,
    .emoji-editor-cancel,
    .emoji-chart-open {
      padding: 3px 7px;
      background: var(--button-bg);
      color: var(--button-fg);
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 0.88em;
      flex-shrink: 0;
    }

    .emoji-editor-save:hover,
    .emoji-editor-cancel:hover,
    .emoji-chart-open:hover { background: var(--button-hover-bg); }

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

    /* ── Code block color rows ────────────────────────────────────────── */

    .block-colors {
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 15px;
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .block-colors-description {
      font-size: 0.9em;
      opacity: 0.75;
      margin: 0 0 8px 0;
    }

    .block-color-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 10px;
      background: var(--tab-inactive-bg);
      border-radius: 4px;
    }

    .block-color-picker {
      width: 32px;
      height: 32px;
      padding: 2px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      cursor: pointer;
      background: none;
      flex-shrink: 0;
    }

    .block-color-picker::-webkit-color-swatch-wrapper { padding: 0; }
    .block-color-picker::-webkit-color-swatch { border: none; border-radius: 2px; }

    .block-color-label {
      flex: 1;
      font-size: 0.95em;
    }

    .block-color-input {
      width: 220px;
      padding: 4px 8px;
      font-family: var(--vscode-editor-font-family), monospace;
      font-size: 0.9em;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, var(--border-color));
      border-radius: 3px;
      outline: none;
      flex-shrink: 0;
    }

    .block-color-input:focus {
      border-color: var(--focus-border);
    }

    /* ── General settings ─────────────────────────────────────────────── */

    .toggle-group {
      display: flex;
      gap: 24px;
      margin: 12px 0;
    }

    .toggle-option {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 8px 16px;
      background: var(--tab-inactive-bg);
      border-radius: 4px;
      transition: background 0.15s;
    }

    .toggle-option:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .toggle-option input[type="radio"] {
      accent-color: var(--vscode-focusBorder);
      width: 16px;
      height: 16px;
      cursor: pointer;
    }

  </style>
</head>
<body>
  <h1>Moji Settings</h1>

  <div class="tabs">
    <button class="tab active" data-tab="general" type="button">
      General
    </button>
    <button class="tab" data-tab="javascript" type="button">
      JavaScript <span class="count">(${jsCount})</span>
    </button>
    <button class="tab" data-tab="html" type="button">
      HTML <span class="count">(${tagCount + voidCount + attrCount})</span>
    </button>
    <button class="tab" data-tab="css" type="button">
      CSS <span class="count">(${cssTotal})</span>
    </button>
    <button class="tab" data-tab="python" type="button">
      Python <span class="count">(${pythonCount})</span>
    </button>
    <button class="tab" data-tab="c" type="button">
      C <span class="count">(${cCount})</span>
    </button>
    <button class="tab" data-tab="cpp" type="button">
      C++ <span class="count">(${cppCount})</span>
    </button>
    <button class="tab" data-tab="csharp" type="button">
      C# <span class="count">(${csharpCount})</span>
    </button>
    <button class="tab" data-tab="sql" type="button">
      SQL <span class="count">(${sqlCount})</span>
    </button>
    <button class="tab" data-tab="typescript" type="button">
      TypeScript <span class="count">(${typescriptCount})</span>
    </button>
    <button class="tab" data-tab="java" type="button">
      Java <span class="count">(${javaCount})</span>
    </button>
  </div>

  <!-- General Tab -->
  <div id="general" class="tab-content active">
    <h3>Emoji Size</h3>
    <p style="color: var(--vscode-descriptionForeground); margin-bottom: 12px;">
      Adjust the display size of emoji decorations in the editor.
    </p>
    <div class="toggle-group">
      <label class="toggle-option">
        <input type="radio" name="emojiSize" value="large" data-setting-key="mojiPro.emojiSize" ${settings.emojiSize === 'large' ? 'checked' : ''}>
        <span>Large (Default)</span>
      </label>
      <label class="toggle-option">
        <input type="radio" name="emojiSize" value="small" data-setting-key="mojiPro.emojiSize" ${settings.emojiSize === 'small' ? 'checked' : ''}>
        <span>Small (75%)</span>
      </label>
    </div>

    <h3 style="margin-top: 24px;">Code Block Highlighting</h3>
    <div class="master-toggle">
      <input type="checkbox" id="master-codeblocks" data-setting-key="mojiPro.codeBlocks.enabled" ${settings.codeBlocks.enabled ? 'checked' : ''}>
      <label for="master-codeblocks">Enable code block highlighting</label>
    </div>
    <div class="block-colors">
      <p class="block-colors-description">Customize the background tint for each block type. Accepts any valid CSS color string (e.g. rgba(86,156,214,0.08)).</p>
      <div class="block-color-row">
        <input type="color" class="block-color-picker" data-color-key="mojiPro.codeBlocks.functionColor" value="${rgbaToHex(settings.codeBlocks.functionColor)}">
        <span class="block-color-label">Function / Method / Class</span>
        <input class="block-color-input" type="text" data-color-key="mojiPro.codeBlocks.functionColor" value="${escapeHtml(settings.codeBlocks.functionColor)}">
      </div>
      <div class="block-color-row">
        <input type="color" class="block-color-picker" data-color-key="mojiPro.codeBlocks.loopColor" value="${rgbaToHex(settings.codeBlocks.loopColor)}">
        <span class="block-color-label">Loop (for, while, do)</span>
        <input class="block-color-input" type="text" data-color-key="mojiPro.codeBlocks.loopColor" value="${escapeHtml(settings.codeBlocks.loopColor)}">
      </div>
      <div class="block-color-row">
        <input type="color" class="block-color-picker" data-color-key="mojiPro.codeBlocks.controlColor" value="${rgbaToHex(settings.codeBlocks.controlColor)}">
        <span class="block-color-label">Control Flow (if, else, switch, try)</span>
        <input class="block-color-input" type="text" data-color-key="mojiPro.codeBlocks.controlColor" value="${escapeHtml(settings.codeBlocks.controlColor)}">
      </div>
      <div class="block-color-row">
        <input type="color" class="block-color-picker" data-color-key="mojiPro.codeBlocks.objectColor" value="${rgbaToHex(settings.codeBlocks.objectColor)}">
        <span class="block-color-label">Object / Data Block</span>
        <input class="block-color-input" type="text" data-color-key="mojiPro.codeBlocks.objectColor" value="${escapeHtml(settings.codeBlocks.objectColor)}">
      </div>
      <div class="bulk-actions" style="margin-top:12px;">
        <button class="bulk-btn" id="btn-reset-block-colors" type="button">Reset Colors to Default</button>
      </div>
    </div>

    <h3 style="margin-top: 24px;">React Component Outlines</h3>
    <div class="master-toggle">
      <input type="checkbox" id="master-reactcomponents" data-setting-key="mojiPro.reactComponentOutlines.enabled" ${settings.reactComponentOutlines && settings.reactComponentOutlines.enabled ? 'checked' : ''}>
      <label for="master-reactcomponents">Enable React component outlines</label>
    </div>
    <div class="block-colors">
      <p class="block-colors-description">Customize the visual outline around React components in JSX/TSX files. Outlines help identify component boundaries and improve code architecture understanding.</p>
      <div class="block-color-row">
        <input type="color" class="block-color-picker" data-color-key="mojiPro.reactComponentOutlines.color" value="${rgbaToHex(settings.reactComponentOutlines ? settings.reactComponentOutlines.color : 'rgba(207,130,58,1)')}">
        <span class="block-color-label">Outline Color</span>
        <input class="block-color-input" type="text" data-color-key="mojiPro.reactComponentOutlines.color" value="${escapeHtml(settings.reactComponentOutlines ? settings.reactComponentOutlines.color : 'rgba(207,130,58,1)')}">
      </div>
      <div class="block-color-row">
        <span class="block-color-label">Border Width (1-3 px)</span>
        <input class="block-color-input" type="number" data-setting-key="mojiPro.reactComponentOutlines.width" value="${settings.reactComponentOutlines ? settings.reactComponentOutlines.width : 1}" min="1" max="3" style="width:60px;">
      </div>
      <div class="block-color-row">
        <span class="block-color-label">Border Style</span>
        <select data-setting-key="mojiPro.reactComponentOutlines.style" style="padding:4px 8px; background:var(--vscode-input-background); color:var(--vscode-input-foreground); border:1px solid var(--vscode-input-border, var(--border-color)); border-radius:3px;">
          <option value="solid" ${(!settings.reactComponentOutlines || settings.reactComponentOutlines.style === 'solid') ? 'selected' : ''}>Solid</option>
          <option value="dashed" ${settings.reactComponentOutlines && settings.reactComponentOutlines.style === 'dashed' ? 'selected' : ''}>Dashed</option>
          <option value="dotted" ${settings.reactComponentOutlines && settings.reactComponentOutlines.style === 'dotted' ? 'selected' : ''}>Dotted</option>
        </select>
      </div>
    </div>
  </div>

  <!-- JavaScript Tab -->
  <div id="javascript" class="tab-content">
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
  <div id="html" class="tab-content">
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
  <div id="css" class="tab-content">
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
  <div id="python" class="tab-content">
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
  <div id="c" class="tab-content">
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
  <div id="cpp" class="tab-content">
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
  <div id="csharp" class="tab-content">
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
  <div id="sql" class="tab-content">
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
  <div id="typescript" class="tab-content">
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
  <div id="java" class="tab-content">
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

  <div class="apply-bar">
    <!-- Revert confirmation — hidden until user clicks "Revert All Emojis" -->
    <span id="revert-confirm" style="display:none; align-items:center; gap:8px; font-size:0.9em; margin-right:auto;">
      Reset all emojis to defaults?
      <button class="bulk-btn" id="btn-revert-confirm-yes" type="button">Yes, reset</button>
      <button class="bulk-btn" id="btn-revert-confirm-no" type="button">Cancel</button>
    </span>
    <button class="bulk-btn" id="btn-revert-emojis" type="button" style="margin-right:auto;">Revert All Emojis</button>
    <button class="apply-btn" id="btn-apply-settings" type="button">Apply Settings</button>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    // Tab buttons — handled entirely client-side, no round-trip to extension host
    document.querySelectorAll('[data-tab]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var tab = this.dataset.tab;
        document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
        document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
        this.classList.add('active');
        var content = document.getElementById(tab);
        if (content) { content.classList.add('active'); }
      });
    });

    // Master toggle checkboxes, number inputs, and select dropdowns
    document.querySelectorAll('[data-setting-key]').forEach(function(el) {
      el.addEventListener('change', function() {
        var value = this.type === 'checkbox' ? this.checked :
                    this.type === 'number'   ? Number(this.value) :
                    this.value;
        vscode.postMessage({ command: 'toggleSetting', key: this.dataset.settingKey, value: value });
      });
    });

    // Block type color pickers + text inputs.
    // The color picker handles the RGB component; the text input holds the full
    // CSS string (including alpha). They stay in sync:
    //   picker → rebuilds rgba by preserving the current alpha from the text input
    //   text   → parses RGB back into hex to keep the picker's swatch current
    //
    // NOTE: all regex backslashes are doubled (\\d, \\s, \\( etc.) because this
    // code lives inside a JS template literal — Node.js strips a single backslash
    // from unrecognised escape sequences, so \d → d in the output. A double
    // backslash (\\) survives as a single \ in the emitted HTML.
    (function() {
      function parseAlpha(colorStr) {
        var m = colorStr.match(/rgba\\(\\s*\\d+\\s*,\\s*\\d+\\s*,\\s*\\d+\\s*,\\s*([\\d.]+)\\s*\\)/);
        return m ? parseFloat(m[1]) : 1;
      }
      function hexToRgba(hex, alpha) {
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
      }
      function rgbaToHex(colorStr) {
        var m = colorStr.match(/rgba?\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)/);
        if (!m) return null;
        return '#' + [m[1], m[2], m[3]].map(function(n) {
          return parseInt(n, 10).toString(16).padStart(2, '0');
        }).join('');
      }

      // Reset block colors to the defaults baked into package.json / blockDecorator.js.
      // Updates both the picker swatch and the text input so the UI reflects the change
      // immediately, then queues each default via toggleSetting so Apply will persist them.
      var DEFAULT_BLOCK_COLORS = {
        'mojiPro.codeBlocks.functionColor': 'rgba(86,156,214,0.08)',
        'mojiPro.codeBlocks.loopColor':     'rgba(78,201,176,0.08)',
        'mojiPro.codeBlocks.controlColor':  'rgba(197,134,192,0.08)',
        'mojiPro.codeBlocks.objectColor':   'rgba(206,145,120,0.08)',
      };
      var btnResetColors = document.getElementById('btn-reset-block-colors');
      if (btnResetColors) {
        btnResetColors.addEventListener('click', function() {
          document.querySelectorAll('.block-color-row').forEach(function(row) {
            var picker    = row.querySelector('.block-color-picker');
            var textInput = row.querySelector('.block-color-input');
            if (!picker || !textInput) return;
            var key          = picker.dataset.colorKey;
            var defaultColor = DEFAULT_BLOCK_COLORS[key];
            if (!defaultColor) return;
            textInput.value = defaultColor;
            var hex = rgbaToHex(defaultColor);
            if (hex) picker.value = hex;
            vscode.postMessage({ command: 'toggleSetting', key: key, value: defaultColor });
          });
        });
      }

      document.querySelectorAll('.block-color-row').forEach(function(row) {
        var picker    = row.querySelector('.block-color-picker');
        var textInput = row.querySelector('.block-color-input');
        if (!picker || !textInput) return;
        var key = picker.dataset.colorKey;

        // Picker change → rebuild rgba preserving current alpha, sync text input, persist.
        picker.addEventListener('input', function() {
          var alpha   = parseAlpha(textInput.value);
          var newRgba = hexToRgba(picker.value, alpha);
          textInput.value = newRgba;
          vscode.postMessage({ command: 'toggleSetting', key: key, value: newRgba });
        });

        // Text input live → parse RGB back into hex so the picker swatch stays current.
        textInput.addEventListener('input', function() {
          var hex = rgbaToHex(textInput.value);
          if (hex) picker.value = hex;
        });

        // Text input commit (blur/Enter) → persist the full CSS string to VS Code config.
        textInput.addEventListener('change', function() {
          vscode.postMessage({ command: 'toggleSetting', key: key, value: textInput.value });
        });
      });
    })();

    // Bulk select/deselect buttons
    document.querySelectorAll('[data-toggle-all]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var category = this.dataset.toggleAll;
        var value = this.dataset.toggleValue === 'true';
        var section = this.closest('.section') || this.closest('.tab-content');
        if (section) {
          section.querySelectorAll('.emoji-item input[type="checkbox"]').forEach(function(cb) { cb.checked = value; });
        }
        vscode.postMessage({ command: 'toggleDecorationCategory', category: category, enabled: value });
      });
    });

    // Individual emoji checkboxes
    document.querySelectorAll('.emoji-item input[type="checkbox"][data-category]').forEach(function(cb) {
      cb.addEventListener('change', function() {
        vscode.postMessage({
          command: 'toggleDecoration',
          category: this.dataset.category,
          key: this.dataset.key,
          enabled: this.checked
        });
      });
    });

    // ── Emoji customization ──────────────────────────────────────────────
    // Maps webview category names to the decorator's internal key prefix (must
    // match DECORATION_CATEGORIES prefixes and the keys stored in
    // mojiPro.customEmojiOverrides).
    var OVERRIDE_PREFIX_MAP = {
      javascript: '',
      tags:       'tag:',
      void:       'void:',
      attr:       'attr:',
      cssAtRule:  'cssAtRule:',
      cssLayout:  'cssLayout:',
      cssBox:     'cssBox:',
      cssVisual:  'cssVisual:',
      cssPseudo:  'cssPseudo:',
      cssValue:   'cssValue:',
      python:     'py:',
      c:          'c:',
      cpp:        'cpp:',
      csharp:     'csharp:',
      sql:        'sql:',
      typescript: 'ts:',
      java:       'java:'
    };

    // Converts a user-entered string to a single emoji character, or returns null
    // if the input is not recognisable. Accepts:
    //   U+1F600   hex with U+ prefix
    //   1F600     bare hex (4–6 digits)
    //   0x1F600   hex with 0x prefix
    //   🎉         pasted emoji directly (any length up to 4 code points to allow
    //              compound emoji like ZWJ sequences and skin-tone variants)
    function parseUnicodeInputToEmoji(str) {
      str = str.trim();
      var hex = str.replace(/^[Uu]\\+/, '').replace(/^0[Xx]/, '');
      if (/^[0-9a-fA-F]{4,6}$/.test(hex)) {
        var cp = parseInt(hex, 16);
        if (cp >= 1 && cp <= 0x10FFFF) {
          try { return String.fromCodePoint(cp); } catch(e) {}
        }
      }
      // Accept a directly-pasted emoji (1–4 code points covers virtually all real emoji)
      var chars = Array.from(str);
      if (chars.length >= 1 && chars.length <= 4) return str;
      return null;
    }

    // Close all open inline editors and restore their emoji buttons.
    function closeAllEmojiEditors() {
      document.querySelectorAll('.emoji-editor').forEach(function(ed) {
        if (ed.style.display !== 'none') {
          ed.style.display = 'none';
          var btn = ed.previousElementSibling;
          if (btn && btn.classList.contains('emoji-btn')) btn.style.display = '';
          var input = ed.querySelector('.emoji-unicode-input');
          if (input) input.classList.remove('invalid');
        }
      });
    }

    // Open the inline editor for a given .emoji-btn, pre-filled with the
    // current emoji's code point in U+XXXX format.
    document.addEventListener('click', function(e) {
      var emojiBtn = e.target.closest('.emoji-btn');
      if (emojiBtn) {
        var category = emojiBtn.dataset.category;
        var key      = emojiBtn.dataset.key;
        var editor   = document.getElementById('editor-' + category + '-' + key);
        if (!editor) return;

        // If this editor is already open, close it (toggle behaviour)
        if (editor.style.display !== 'none') {
          closeAllEmojiEditors();
          emojiBtn.style.display = '';
          return;
        }

        closeAllEmojiEditors();

        // Pre-fill input with the current emoji's primary code point in U+ format
        var currentEmoji = emojiBtn.textContent.trim();
        var cp           = currentEmoji.codePointAt(0);
        var input        = editor.querySelector('.emoji-unicode-input');
        input.value      = 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');
        input.classList.remove('invalid');

        emojiBtn.style.display = 'none';
        editor.style.display   = 'flex';
        input.focus();
        input.select();
        return;
      }

      // Save button — validate input, send customisation to extension host
      var saveBtn = e.target.closest('.emoji-editor-save');
      if (saveBtn) {
        var editor   = saveBtn.closest('.emoji-editor');
        var input    = editor.querySelector('.emoji-unicode-input');
        var category = editor.dataset.category;
        var key      = editor.dataset.key;
        var emoji    = parseUnicodeInputToEmoji(input.value);

        if (!emoji) {
          input.classList.add('invalid');
          input.focus();
          return;
        }

        var prefix      = OVERRIDE_PREFIX_MAP[category] !== undefined ? OVERRIDE_PREFIX_MAP[category] : '';
        var overrideKey = prefix + key;
        // Send the validated emoji to the extension host for immediate persistence.
        // The extension writes directly to mojiPro.customEmojiOverrides and fires
        // onDidChangeConfiguration, which triggers a decorator rebuild — so the new
        // emoji appears in the editor without requiring an explicit Apply.
        vscode.postMessage({ command: 'saveEmojiCustomization', overrideKey: overrideKey, emoji: emoji });
        return;
      }

      // Cancel button — discard edit, restore button
      var cancelBtn = e.target.closest('.emoji-editor-cancel');
      if (cancelBtn) {
        var editor  = cancelBtn.closest('.emoji-editor');
        var emojiBtn = editor.previousElementSibling;
        editor.style.display = 'none';
        if (emojiBtn && emojiBtn.classList.contains('emoji-btn')) emojiBtn.style.display = '';
        return;
      }

      // Chart open button — derive the Unicode chart anchor from the current emoji
      // and open the full emoji list at that code point in the system browser.
      var chartBtn = e.target.closest('.emoji-chart-open');
      if (chartBtn) {
        var editor      = chartBtn.closest('.emoji-editor');
        var emojiBtnEl  = editor.previousElementSibling;
        var currentEmoji = emojiBtnEl ? emojiBtnEl.textContent.trim() : '';
        var cp          = currentEmoji.codePointAt ? currentEmoji.codePointAt(0) : 0;
        var anchor      = cp ? cp.toString(16).toLowerCase() : '';
        vscode.postMessage({ command: 'openUnicodeChart', anchor: anchor });
        return;
      }

      // Close any open editor when the user clicks outside an emoji item
      if (!e.target.closest('.emoji-item')) {
        closeAllEmojiEditors();
      }
    });

    // Escape key closes any open inline editor
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeAllEmojiEditors();
    });

    // Receive confirmation from extension host and update the emoji button in the UI
    window.addEventListener('message', function(event) {
      var msg = event.data;
      if (msg.command === 'emojiCustomizationSaved') {
        // Find the button whose category+key produced this overrideKey and update its display
        document.querySelectorAll('.emoji-btn').forEach(function(btn) {
          var prefix = OVERRIDE_PREFIX_MAP[btn.dataset.category] !== undefined
            ? OVERRIDE_PREFIX_MAP[btn.dataset.category] : '';
          if (prefix + btn.dataset.key === msg.overrideKey) {
            btn.textContent = msg.emoji;
            btn.classList.add('customized');
            btn.style.display = '';
            var editor = document.getElementById('editor-' + btn.dataset.category + '-' + btn.dataset.key);
            if (editor) editor.style.display = 'none';
          }
        });
      } else if (msg.command === 'allEmojisReverted') {
        // Restore every emoji button to its default emoji (stored in data-default-emoji)
        // and remove the customised indicator.
        document.querySelectorAll('.emoji-btn').forEach(function(btn) {
          btn.textContent = btn.dataset.defaultEmoji || btn.textContent;
          btn.classList.remove('customized');
          btn.style.display = '';
        });
        document.querySelectorAll('.emoji-editor').forEach(function(ed) {
          ed.style.display = 'none';
        });
      }
    });

    (function() {
      // Apply Settings button — flushes all pending changes immediately without
      // requiring the user to close the panel.
      var btnApply = document.getElementById('btn-apply-settings');
      if (btnApply) {
        btnApply.addEventListener('click', function() {
          btnApply.textContent = 'Applying\u2026';
          btnApply.disabled = true;
          vscode.postMessage({ command: 'applySettings' });
          // Re-enable after a short delay to give the extension host time to write config.
          setTimeout(function() {
            btnApply.textContent = 'Apply Settings';
            btnApply.disabled = false;
          }, 800);
        });
      }

      // Revert All Emojis — shows an inline confirmation before sending to extension host.
      // Avoids window.confirm() which is unreliable inside VS Code webviews.
      var btnRevert      = document.getElementById('btn-revert-emojis');
      var revertConfirm  = document.getElementById('revert-confirm');
      var btnRevertYes   = document.getElementById('btn-revert-confirm-yes');
      var btnRevertNo    = document.getElementById('btn-revert-confirm-no');

      if (btnRevert && revertConfirm) {
        btnRevert.addEventListener('click', function() {
          btnRevert.style.display = 'none';
          revertConfirm.style.display = 'flex';
        });
        btnRevertNo.addEventListener('click', function() {
          revertConfirm.style.display = 'none';
          btnRevert.style.display = '';
        });
        btnRevertYes.addEventListener('click', function() {
          revertConfirm.style.display = 'none';
          btnRevert.style.display = '';
          vscode.postMessage({ command: 'revertAllEmojis' });
        });
      }
    })();
  </script>
</body>
</html>`;
}

/**
 * Create HTML for a single emoji keyword row.
 *
 * @param {string} category      - Webview category name (e.g. 'javascript', 'python', 'tags')
 * @param {string} key           - Keyword key within the category map (e.g. 'await', 'div')
 * @param {string} defaultEmoji  - The original emoji from the keyword map — stored in data-default-emoji
 *                                 so the webview can restore it when "Revert All" is triggered.
 * @param {string} effectiveEmoji - The emoji currently in use (custom override or default)
 * @param {string} displayName   - Label shown next to the emoji (may include HTML like &lt;div&gt;)
 * @param {boolean} checked      - Whether the per-keyword toggle is currently enabled
 * @param {boolean} isCustomized - Whether the user has an active custom override for this keyword
 */
function createCheckboxItem(category, key, defaultEmoji, effectiveEmoji, displayName, checked, isCustomized) {
  // The checkbox and emoji button are siblings, not nested — clicking the emoji
  // button must not also toggle the checkbox (which a <label> wrapper would do).
  const safeCategory = escapeHtml(category);
  const safeKey = escapeHtml(key);
  const safeDefault = escapeHtml(defaultEmoji);
  const safeEffective = escapeHtml(effectiveEmoji);
  const safeDisplayName = escapeHtml(displayName);
  return `
    <div class="emoji-item">
      <label class="emoji-item-check" for="cb-${safeCategory}-${safeKey}">
        <input type="checkbox" id="cb-${safeCategory}-${safeKey}" ${checked ? 'checked' : ''} data-category="${safeCategory}" data-key="${safeKey}">
      </label>
      <button class="emoji-btn${isCustomized ? ' customized' : ''}" type="button"
        data-category="${safeCategory}" data-key="${safeKey}"
        data-default-emoji="${safeDefault}"
        title="Click to customize emoji">${safeEffective}</button>
      <span class="emoji-editor" id="editor-${safeCategory}-${safeKey}" data-category="${safeCategory}" data-key="${safeKey}" style="display:none">
        <input class="emoji-unicode-input" type="text" placeholder="U+1F600">
        <button class="emoji-editor-save" type="button" title="Save">&#10003;</button>
        <button class="emoji-editor-cancel" type="button" title="Cancel">&#10005;</button>
        <button class="emoji-chart-open" type="button" data-category="${safeCategory}" data-key="${safeKey}" title="Browse Unicode chart">&#8599;</button>
      </span>
      <span class="name">${safeDisplayName}</span>
    </div>
  `;
}

module.exports = { openSettingsPanel };
