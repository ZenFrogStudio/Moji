// Extension entry point – wires up activation, commands, and event listeners.

const vscode = require('vscode');
const appSettingsStore = require('./appSettingsStore');
const { KeywordDecorator } = require('./decorator');
const { BlockDecorator }   = require('./blockDecorator');
const { ComponentOutlineDecorator } = require('./componentOutlineDecorator');
const { openSettingsPanel } = require('./settingsPanel');

/** @type {KeywordDecorator | undefined} */
let decorator;

/** @type {BlockDecorator | undefined} */
let blockDecorator;

/** @type {ComponentOutlineDecorator | undefined} */
let componentOutlineDecorator;

async function activate(context) {
  await appSettingsStore.initialize(context);

  // ── Decorator setup ────────────────────────────────────────────────────

  const enabled = appSettingsStore.get('enabled', true);

  decorator          = new KeywordDecorator();
  decorator.enabled  = enabled;

  // Block highlighting is opt-in — reads its own enabled flag from settings.
  blockDecorator         = new BlockDecorator();
  blockDecorator.enabled = appSettingsStore.get('codeBlocks.enabled', false);

  // React component outlines are opt-in — reads its own enabled flag from settings.
  componentOutlineDecorator         = new ComponentOutlineDecorator();
  componentOutlineDecorator.enabled = appSettingsStore.get('reactComponentOutlines.enabled', false);

  if (vscode.window.activeTextEditor) {
    decorator.updateEditor(vscode.window.activeTextEditor);
    blockDecorator.updateEditor(vscode.window.activeTextEditor);
    componentOutlineDecorator.updateEditor(vscode.window.activeTextEditor);
  }

  function reloadDecoratorConfig() {
    decorator.reloadConfig();
    decorator.enabled = appSettingsStore.get('enabled', true);

    blockDecorator.reloadConfig();
    blockDecorator.enabled = appSettingsStore.get('codeBlocks.enabled', false);

    componentOutlineDecorator.reloadConfig();
    componentOutlineDecorator.enabled = appSettingsStore.get('reactComponentOutlines.enabled', false);
  }

  function repaintEditors() {
    const editors = vscode.window.visibleTextEditors.length
      ? vscode.window.visibleTextEditors
      : (vscode.window.activeTextEditor ? [vscode.window.activeTextEditor] : []);

    for (const editor of editors) {
      decorator.updateEditor(editor);
      blockDecorator.updateEditor(editor);
      componentOutlineDecorator.updateEditor(editor);
    }
  }

  async function toggleBooleanSetting(settingPath, fallback, label) {
    const enabled = !appSettingsStore.get(settingPath, fallback);
    await appSettingsStore.update(settingPath, enabled);

    vscode.window.showInformationMessage(
      `Moji: ${label} ${enabled ? 'enabled' : 'disabled'}`
    );
  }





  // ── Commands ───────────────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand('mojiPro.toggle', async () => {
      await toggleBooleanSetting('enabled', true, 'Emoji decorations');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mojiPro.toggleCodeBlocks', async () => {
      await toggleBooleanSetting('codeBlocks.enabled', false, 'Code Block Highlighting');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mojiPro.toggleReactComponentOutlines', async () => {
      await toggleBooleanSetting('reactComponentOutlines.enabled', false, 'React Component Outlines');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mojiPro.openSettings', () => {
      openSettingsPanel(context, () => {
        // Reload all decorator configs and repaint every visible editor once
        // the settings panel has written its pending changes to the app settings file.
        // visibleTextEditors is used because activeTextEditor is undefined while
        // the webview panel has focus, and remains undefined until an editor tab
        // is explicitly clicked after the panel closes.
        reloadDecoratorConfig();
        repaintEditors();
      });
    })
  );






  // ── Editor lifecycle events ────────────────────────────────────────────

  // Timestamp of the last decorator reload triggered by an editor tab switch.
  // Used to suppress redundant reloads from delayed onDidChangeConfiguration
  // events that arrive after the editor switch has already handled the refresh.
  let lastEditorSwitchRefresh = 0;
  let refreshTimer;

  function scheduleSettingsRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      if (Date.now() - lastEditorSwitchRefresh < 500) return;
      reloadDecoratorConfig();
      repaintEditors();
    }, 100);
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        // Flush any pending settings refresh immediately so the editor renders
        // with the latest settings on first paint rather than flickering.
        if (refreshTimer) {
          clearTimeout(refreshTimer);
          refreshTimer = undefined;
          decorator.reloadConfig();
          decorator.enabled = appSettingsStore.get('enabled', true);
          blockDecorator.reloadConfig();
          componentOutlineDecorator.reloadConfig();
          lastEditorSwitchRefresh = Date.now();
        }
        decorator.updateEditor(editor);
        blockDecorator.updateEditor(editor);
        componentOutlineDecorator.updateEditor(editor);
      }
    })
  );

  // Evict scan caches when a document is closed to prevent unbounded memory growth.
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      const uri = document.uri.toString();
      decorator.clearCacheForDocument(uri);
      blockDecorator.clearCacheForDocument(uri);
      componentOutlineDecorator.clearCacheForDocument(uri);
    })
  );

  // Debounced document-change handler to avoid re-scanning on every keystroke.
  let updateTimer;
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && event.document === editor.document) {
        clearTimeout(updateTimer);
        updateTimer = setTimeout(() => {
          decorator.updateEditor(editor);
          blockDecorator.updateEditor(editor);
          componentOutlineDecorator.updateEditor(editor);
        }, 100);
      }
    })
  );






  // ── Configuration changes ──────────────────────────────────────────────

  // App-owned Moji settings now refresh through the store event; only editor
  // settings remain on VS Code's configuration change event.
  let configTimer;
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration('editor.fontSize') ||
        event.affectsConfiguration('editor.tabSize')
      ) {
        // Debounce to batch rapid config changes (e.g., "Select All" updates 30+ settings)
        clearTimeout(configTimer);
        configTimer = setTimeout(() => {
          // Skip if an editor tab switch already handled this reload recently.
          // Delayed onDidChangeConfiguration events (from async settings.json writes)
          // can arrive after the editor switch has already applied the correct config.
          if (Date.now() - lastEditorSwitchRefresh < 500) return;

          reloadDecoratorConfig();

          // Use visibleTextEditors (not activeTextEditor) so that settings changes
          // made from the settings panel — which causes activeTextEditor to be
          // undefined — still immediately apply to all open code editors.
          repaintEditors();
        }, 100);
      }
    })
  );

  context.subscriptions.push(
    appSettingsStore.onDidChange(() => {
      scheduleSettingsRefresh();
    })
  );





  
  // ── Cleanup ────────────────────────────────────────────────────────────

  context.subscriptions.push({ dispose: () => decorator.dispose() });
  context.subscriptions.push({ dispose: () => blockDecorator.dispose() });
  context.subscriptions.push({ dispose: () => componentOutlineDecorator.dispose() });
  // Clear any in-flight debounce timers so their callbacks don't fire against
  // disposed decorator objects after the extension is deactivated.
  context.subscriptions.push({ dispose: () => { clearTimeout(updateTimer); clearTimeout(configTimer); clearTimeout(refreshTimer); } });
}

function deactivate() {
  // Disposables registered via context.subscriptions are cleaned up by VS Code.
}

module.exports = { activate, deactivate };
