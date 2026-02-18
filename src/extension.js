// Extension entry point – wires up activation, commands, and event listeners.

const vscode = require('vscode');
const { KeywordDecorator } = require('./decorator');
const { openSettingsPanel } = require('./settingsPanel');

/** @type {KeywordDecorator | undefined} */
let decorator;

function activate(context) {
  const config = vscode.workspace.getConfiguration('emojiCode');
  const enabled = config.get('enabled', true);

  decorator = new KeywordDecorator();
  decorator.enabled = enabled;

  // ── Decorate the active editor on startup ──────────────────────────────

  if (vscode.window.activeTextEditor) {
    decorator.updateEditor(vscode.window.activeTextEditor);
  }

  // ── Commands ───────────────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand('emojiCode.toggle', () => {
      decorator.toggle();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('emojiCode.openSettings', () => {
      // No callback needed - debounced config change handler handles updates
      openSettingsPanel(context);
    }),
  );

  // ── Editor lifecycle events ────────────────────────────────────────────

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        decorator.updateEditor(editor);
      }
    }),
  );

  // Debounced document-change handler to avoid re-scanning on every keystroke.
  let updateTimer;
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && event.document === editor.document) {
        clearTimeout(updateTimer);
        updateTimer = setTimeout(() => decorator.updateEditor(editor), 100);
      }
    }),
  );

  // ── Configuration changes ──────────────────────────────────────────────

  let configTimer;
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration('emojiCode') ||
        event.affectsConfiguration('editor.fontSize')
      ) {
        // Debounce to batch rapid config changes (e.g., "Select All" updates 30+ settings)
        clearTimeout(configTimer);
        configTimer = setTimeout(() => {
          // Read the enabled setting explicitly so toggling via settings works.
          const newEnabled = vscode.workspace
            .getConfiguration('emojiCode')
            .get('enabled', true);

          decorator.reloadConfig();
          decorator.enabled = newEnabled;

          if (vscode.window.activeTextEditor) {
            decorator.updateEditor(vscode.window.activeTextEditor);
          }
        }, 100);
      }
    }),
  );

  // ── Cleanup ────────────────────────────────────────────────────────────

  context.subscriptions.push({ dispose: () => decorator.dispose() });
}

function deactivate() {
  // Disposables registered via context.subscriptions are cleaned up by VS Code.
}

module.exports = { activate, deactivate };
