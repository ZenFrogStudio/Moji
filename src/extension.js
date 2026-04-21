// Extension entry point – wires up activation, commands, and event listeners.

const vscode = require('vscode');
const { KeywordDecorator } = require('./decorator');
const { BlockDecorator }   = require('./blockDecorator');
const { ComponentOutlineDecorator } = require('./componentOutlineDecorator');
const { openSettingsPanel } = require('./settingsPanel');
const { DECORATION_CATEGORIES } = require('./decorationCategories');
const settingsStore = require('./settingsStore');

/** @type {KeywordDecorator | undefined} */
let decorator;

/** @type {BlockDecorator | undefined} */
let blockDecorator;

/** @type {ComponentOutlineDecorator | undefined} */
let componentOutlineDecorator;

async function migrateLegacyDecorationSettings(context) {
  const MIGRATION_KEY = 'settingsMigration.compactDecorations.v1';
  if (context.globalState.get(MIGRATION_KEY)) return;

  let nextDisabledDecorations = settingsStore.getDisabledDecorations();
  const legacyKeysToRemove = [];

  for (const { id, legacyConfigNs, map } of DECORATION_CATEGORIES) {
    const legacyConfig = vscode.workspace.getConfiguration(legacyConfigNs);

    for (const key of Object.keys(map)) {
      const inspected = legacyConfig.inspect(key);
      if (!inspected || typeof inspected.globalValue === 'undefined') continue;

      if (inspected.globalValue === false) {
        nextDisabledDecorations = settingsStore.setDecorationEnabled(
          nextDisabledDecorations,
          id,
          key,
          false
        );
      }

      if (inspected.globalValue === true || inspected.globalValue === false) {
        legacyKeysToRemove.push({ legacyConfigNs, key });
      }
    }
  }

  try {
    if (legacyKeysToRemove.length > 0) {
      await settingsStore.saveDisabledDecorations(nextDisabledDecorations);

      for (const { legacyConfigNs, key } of legacyKeysToRemove) {
        await vscode.workspace
          .getConfiguration(legacyConfigNs)
          .update(key, undefined, vscode.ConfigurationTarget.Global);
      }
    }

    await context.globalState.update(MIGRATION_KEY, true);
  } catch (err) {
    vscode.window.showWarningMessage(`Moji: Could not migrate legacy decoration settings - ${err.message}`);
  }
}

async function activate(context) {






  await migrateLegacyDecorationSettings(context);






  // ── Decorator setup ────────────────────────────────────────────────────

  const config  = vscode.workspace.getConfiguration('mojiPro');
  const enabled = config.get('enabled', true);

  decorator          = new KeywordDecorator();
  decorator.enabled  = enabled;

  // Block highlighting is opt-in — reads its own enabled flag from settings.
  blockDecorator         = new BlockDecorator();
  blockDecorator.enabled = vscode.workspace
    .getConfiguration('mojiPro.codeBlocks')
    .get('enabled', true);

  // React component outlines are opt-in — reads its own enabled flag from settings.
  componentOutlineDecorator         = new ComponentOutlineDecorator();
  componentOutlineDecorator.enabled = vscode.workspace
    .getConfiguration('mojiPro.reactComponentOutlines')
    .get('enabled', false);

  if (vscode.window.activeTextEditor) {
    decorator.updateEditor(vscode.window.activeTextEditor);
    blockDecorator.updateEditor(vscode.window.activeTextEditor);
    componentOutlineDecorator.updateEditor(vscode.window.activeTextEditor);
  }

  function reloadDecoratorConfig() {
    decorator.reloadConfig();
    decorator.enabled = vscode.workspace
      .getConfiguration('mojiPro')
      .get('enabled', true);

    blockDecorator.reloadConfig();
    blockDecorator.enabled = vscode.workspace
      .getConfiguration('mojiPro.codeBlocks')
      .get('enabled', true);

    componentOutlineDecorator.reloadConfig();
    componentOutlineDecorator.enabled = vscode.workspace
      .getConfiguration('mojiPro.reactComponentOutlines')
      .get('enabled', false);
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

  async function toggleBooleanSetting(section, key, fallback, label) {
    const config = vscode.workspace.getConfiguration(section);
    const enabled = !config.get(key, fallback);

    await config.update(key, enabled, vscode.ConfigurationTarget.Global);
    reloadDecoratorConfig();
    repaintEditors();

    vscode.window.showInformationMessage(
      `Moji: ${label} ${enabled ? 'enabled' : 'disabled'}`
    );
  }





  // ── Commands ───────────────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand('mojiPro.toggle', async () => {
      await toggleBooleanSetting('mojiPro', 'enabled', true, 'Emoji decorations');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mojiPro.toggleCodeBlocks', async () => {
      await toggleBooleanSetting('mojiPro.codeBlocks', 'enabled', true, 'Code Block Highlighting');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mojiPro.toggleReactComponentOutlines', async () => {
      await toggleBooleanSetting('mojiPro.reactComponentOutlines', 'enabled', false, 'React Component Outlines');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mojiPro.openSettings', () => {
      openSettingsPanel(context, () => {
        // Reload all decorator configs and repaint every visible editor once
        // the settings panel has written its pending changes to VS Code config.
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

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        // Flush any pending config debounce immediately so the editor renders
        // with the latest settings on first paint rather than flickering.
        if (configTimer) {
          clearTimeout(configTimer);
          configTimer = undefined;
          decorator.reloadConfig();
          decorator.enabled = vscode.workspace
            .getConfiguration('mojiPro')
            .get('enabled', true);
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

  let configTimer;
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration('mojiPro') ||
        event.affectsConfiguration('editor.fontSize') ||
        event.affectsConfiguration('mojiPro.codeBlocks')
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





  
  // ── Cleanup ────────────────────────────────────────────────────────────

  context.subscriptions.push({ dispose: () => decorator.dispose() });
  context.subscriptions.push({ dispose: () => blockDecorator.dispose() });
  context.subscriptions.push({ dispose: () => componentOutlineDecorator.dispose() });
  // Clear any in-flight debounce timers so their callbacks don't fire against
  // disposed decorator objects after the extension is deactivated.
  context.subscriptions.push({ dispose: () => { clearTimeout(updateTimer); clearTimeout(configTimer); } });
}

function deactivate() {
  // Disposables registered via context.subscriptions are cleaned up by VS Code.
}

module.exports = { activate, deactivate };
