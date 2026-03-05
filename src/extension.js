// Extension entry point – wires up activation, commands, and event listeners.

const vscode = require('vscode');
const { KeywordDecorator } = require('./decorator');
const { openSettingsPanel } = require('./settingsPanel');
const { LicenseManager }   = require('./licenseManager');

/** @type {KeywordDecorator | undefined} */
let decorator;

/** @type {LicenseManager | undefined} */
let licenseManager;

async function activate(context) {
  // ── License check (must run first – gates all decoration) ─────────────

  licenseManager = new LicenseManager(context.secrets);
  const isLicensed = await licenseManager.initialize();

  if (!isLicensed) {
    vscode.window.showInformationMessage(
      'Moji Pro requires a license key to enable emoji decorations.',
      'Activate License'
    ).then(selection => {
      if (selection === 'Activate License') {
        vscode.commands.executeCommand('mojiPro.activateLicense');
      }
    });
  }

  // ── Decorator setup ────────────────────────────────────────────────────

  const config  = vscode.workspace.getConfiguration('mojiPro');
  const enabled = config.get('enabled', true);

  decorator         = new KeywordDecorator();
  decorator.enabled = enabled;

  if (licenseManager.isValid && vscode.window.activeTextEditor) {
    decorator.updateEditor(vscode.window.activeTextEditor);
  }

  // ── Commands ───────────────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand('mojiPro.toggle', () => {
      if (!licenseManager.isValid) {
        vscode.window.showWarningMessage(
          'Moji Pro: A license key is required. Use "Moji Pro: Activate License".'
        );
        return;
      }
      decorator.toggle();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mojiPro.openSettings', () => {
      openSettingsPanel(context, licenseManager);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mojiPro.activateLicense', async () => {
      const key = await vscode.window.showInputBox({
        prompt:         'Enter your Moji Pro license key',
        placeHolder:    'XXXX-XXXX-XXXX-XXXX',
        password:       true,
        ignoreFocusOut: true,
      });

      if (!key) return; // user pressed Escape

      const result = await licenseManager.activate(key.trim());

      if (result.success) {
        vscode.window.showInformationMessage(
          'Moji Pro: License activated successfully! Enjoy your emojis.'
        );
        decorator.enabled = vscode.workspace
          .getConfiguration('mojiPro')
          .get('enabled', true);
        if (vscode.window.activeTextEditor) {
          decorator.updateEditor(vscode.window.activeTextEditor);
        }
      } else {
        vscode.window.showErrorMessage(
          `Moji Pro: Activation failed — ${result.error}`
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mojiPro.deactivateLicense', async () => {
      const confirm = await vscode.window.showWarningMessage(
        'Deactivate your Moji Pro license on this machine?',
        { modal: true },
        'Deactivate'
      );
      if (confirm !== 'Deactivate') return;

      await licenseManager.deactivate();

      decorator.enabled = false;
      if (vscode.window.activeTextEditor) {
        decorator.updateEditor(vscode.window.activeTextEditor);
      }

      vscode.window.showInformationMessage(
        'Moji Pro: License deactivated. Enter a new key to re-enable.'
      );
    })
  );

  // Internal command used by the settings panel to re-apply or clear decorations
  // after license state changes without directly coupling settingsPanel to decorator.
  context.subscriptions.push(
    vscode.commands.registerCommand('mojiPro._refreshDecorator', () => {
      if (licenseManager.isValid) {
        decorator.enabled = vscode.workspace
          .getConfiguration('mojiPro')
          .get('enabled', true);
        if (vscode.window.activeTextEditor) {
          decorator.updateEditor(vscode.window.activeTextEditor);
        }
      } else {
        decorator.enabled = false;
        if (vscode.window.activeTextEditor) {
          decorator.updateEditor(vscode.window.activeTextEditor);
        }
      }
    })
  );

  // ── Editor lifecycle events ────────────────────────────────────────────

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && licenseManager.isValid) {
        decorator.updateEditor(editor);
      }
    })
  );

  // Debounced document-change handler to avoid re-scanning on every keystroke.
  let updateTimer;
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && event.document === editor.document && licenseManager.isValid) {
        clearTimeout(updateTimer);
        updateTimer = setTimeout(() => decorator.updateEditor(editor), 100);
      }
    })
  );

  // ── Configuration changes ──────────────────────────────────────────────

  let configTimer;
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration('mojiPro') ||
        event.affectsConfiguration('editor.fontSize')
      ) {
        // Debounce to batch rapid config changes (e.g., "Select All" updates 30+ settings)
        clearTimeout(configTimer);
        configTimer = setTimeout(() => {
          const newEnabled = vscode.workspace
            .getConfiguration('mojiPro')
            .get('enabled', true);

          decorator.reloadConfig();
          decorator.enabled = newEnabled;

          if (licenseManager.isValid && vscode.window.activeTextEditor) {
            decorator.updateEditor(vscode.window.activeTextEditor);
          }
        }, 100);
      }
    })
  );

  // ── Cleanup ────────────────────────────────────────────────────────────

  context.subscriptions.push({ dispose: () => decorator.dispose() });
}

function deactivate() {
  // Disposables registered via context.subscriptions are cleaned up by VS Code.
}

module.exports = { activate, deactivate };
