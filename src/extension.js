// Extension entry point – wires up activation, commands, and event listeners.

const vscode = require('vscode');
const { KeywordDecorator } = require('./decorator');
const { openSettingsPanel } = require('./settingsPanel');
const { LicenseManager }   = require('./licenseManager');

/** @type {KeywordDecorator | undefined} */
let decorator;

/** @type {LicenseManager | undefined} */
let licenseManager;

const PURCHASE_URL = 'https://lucidiancreative.com/moji-checkout.html';

async function activate(context) {
  // ── License check ──────────────────────────────────────────────────────

  licenseManager = new LicenseManager(context.secrets, context.globalState);
  const isLicensed = await licenseManager.initialize();

  if (!isLicensed) {
    vscode.window.showInformationMessage(
      'Moji Pro: JS, HTML, and CSS emojis are free. Activate a license to unlock all languages.',
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

  decorator          = new KeywordDecorator();
  decorator.enabled  = enabled;
  decorator.licensed = isLicensed;

  if (vscode.window.activeTextEditor) {
    decorator.updateEditor(vscode.window.activeTextEditor);
  }

  // ── Commands ───────────────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand('mojiPro.toggle', () => {
      decorator.toggle();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mojiPro.openSettings', () => {
      openSettingsPanel(context, licenseManager);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mojiPro.purchaseLicense', () => {
      vscode.env.openExternal(vscode.Uri.parse(PURCHASE_URL));
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mojiPro.activateLicense', async () => {
      // If not yet licensed, prompt the user to buy or enter their key.
      if (!licenseManager.isValid) {
        const choice = await vscode.window.showInformationMessage(
          'Moji Pro: Unlock all languages with a Pro license.',
          'I have a key',
          'Buy Moji Pro'
        );
        if (choice === 'Buy Moji Pro') {
          vscode.env.openExternal(vscode.Uri.parse(PURCHASE_URL));
          return;
        }
        if (choice !== 'I have a key') return; // dismissed
      }

      const key = await vscode.window.showInputBox({
        prompt:         'Enter your Moji Pro license key',
        placeHolder:    'MOJI-XXXX-XXXX-XXXX-XXXX',
        password:       true,
        ignoreFocusOut: true,
      });

      if (!key) return; // user pressed Escape

      const result = await licenseManager.activate(key.trim());

      if (result.success) {
        vscode.window.showInformationMessage(
          'Moji Pro: License activated successfully! Enjoy your emojis.'
        );
        decorator.licensed = true;
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
    vscode.commands.registerCommand('mojiPro.licenseStatus', () => {
      const { isPremium, activeDevices, maxDevices } = licenseManager.getLicenseStatus();
      if (isPremium) {
        vscode.window.showInformationMessage(
          `Moji Pro: Premium active — ${activeDevices} of ${maxDevices} device slots in use.`
        );
      } else {
        vscode.window.showInformationMessage(
          'Moji Pro: Free tier — JS, HTML, and CSS emojis are active. Activate a license to unlock all languages.',
          'Activate License'
        ).then(selection => {
          if (selection === 'Activate License') {
            vscode.commands.executeCommand('mojiPro.activateLicense');
          }
        });
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

      decorator.licensed = false;
      if (vscode.window.activeTextEditor) {
        decorator.updateEditor(vscode.window.activeTextEditor);
      }

      vscode.window.showInformationMessage(
        'Moji Pro: License deactivated. JS, HTML, and CSS emojis remain active.'
      );
    })
  );

  // Internal command used by the settings panel to re-apply or clear decorations
  // after license state changes without directly coupling settingsPanel to decorator.
  context.subscriptions.push(
    vscode.commands.registerCommand('mojiPro._refreshDecorator', () => {
      decorator.licensed = licenseManager.isValid;
      decorator.enabled = vscode.workspace
        .getConfiguration('mojiPro')
        .get('enabled', true);
      if (vscode.window.activeTextEditor) {
        decorator.updateEditor(vscode.window.activeTextEditor);
      }
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
          lastEditorSwitchRefresh = Date.now();
        }
        decorator.updateEditor(editor);
      }
    })
  );

  // Evict scan cache when a document is closed to prevent unbounded memory growth.
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      decorator.clearCacheForDocument(document.uri.toString());
    })
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
          // Skip if an editor tab switch already handled this reload recently.
          // Delayed onDidChangeConfiguration events (from async settings.json writes)
          // can arrive after the editor switch has already applied the correct config.
          if (Date.now() - lastEditorSwitchRefresh < 500) return;

          const newEnabled = vscode.workspace
            .getConfiguration('mojiPro')
            .get('enabled', true);

          decorator.reloadConfig();
          decorator.enabled = newEnabled;

          if (vscode.window.activeTextEditor) {
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
