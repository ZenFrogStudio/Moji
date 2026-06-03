// Adds visual outlines around React components in JSX/TSX files.
// Uses three decoration types (top / middle / bottom lines) so that only the
// relevant border edges are drawn on each line, producing a single rectangular
// wireframe around the full component block rather than a box around each line.
//
// Each decoration type uses VS Code's native borderWidth with the CSS 4-value
// shorthand (top right bottom left) to zero-out the sides that must not show,
// which applies cleanly to the full-line overlay container used by isWholeLine.

const vscode = require('vscode');
const appSettingsStore = require('./appSettingsStore');
const { detectReactComponents } = require('./reactComponentDetector');

const SUPPORTED_LANGUAGES = new Set(['javascriptreact', 'typescriptreact']);

const DEFAULT_COLOR = 'rgba(207,130,58,1)';
const DEFAULT_WIDTH = 1;
const DEFAULT_STYLE = 'solid';

class ComponentOutlineDecorator {
  constructor() {
    /** @type {vscode.TextEditorDecorationType | undefined} */
    this._topDecType    = undefined; // first line  — top + left + right
    /** @type {vscode.TextEditorDecorationType | undefined} */
    this._midDecType    = undefined; // inner lines  — left + right only
    /** @type {vscode.TextEditorDecorationType | undefined} */
    this._botDecType    = undefined; // last line    — bottom + left + right
    /** @type {vscode.TextEditorDecorationType | undefined} */
    this._singleDecType = undefined; // single-line  — all four sides

    /** @type {Map<string, {version: number, components: Array}>} */
    this._componentCache = new Map();

    this.enabled = false;

    this._cfgColor = DEFAULT_COLOR;
    this._cfgWidth = DEFAULT_WIDTH;
    this._cfgStyle = DEFAULT_STYLE;

    this._buildDecorationTypes();
  }

  // ── Decoration type management ─────────────────────────────────────────────

  _buildDecorationTypes() {
    this._disposeDecorationTypes();

    const color = appSettingsStore.get('reactComponentOutlines.color', DEFAULT_COLOR);
    const width = appSettingsStore.get('reactComponentOutlines.width', DEFAULT_WIDTH);
    const style = appSettingsStore.get('reactComponentOutlines.style', DEFAULT_STYLE);

    this._cfgColor = color;
    this._cfgWidth = width;
    this._cfgStyle = style;

    const w  = `${width}px`;
    // Derive a subtle background tint from the border color at ~6% opacity.
    const hexMatch  = color.match(/^#([0-9a-fA-F]{6})$/);
    const rgbaMatch = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    const bg = hexMatch  ? `#${hexMatch[1]}10`
             : rgbaMatch ? `rgba(${rgbaMatch[1]},${rgbaMatch[2]},${rgbaMatch[3]},0.06)`
             : undefined;

    const base = { isWholeLine: true, ...(bg ? { backgroundColor: bg } : {}) };

    // borderWidth uses the CSS 4-value shorthand: top right bottom left.
    // Setting a side to 0 removes that edge without creating an invisible gap,
    // so adjacent decoration types join flush into one continuous rectangle.

    this._topDecType = vscode.window.createTextEditorDecorationType({
      ...base,
      borderStyle: style,
      borderColor: color,
      borderWidth: `${w} ${w} 0 ${w}`,   // top + right + left, no bottom
    });

    this._midDecType = vscode.window.createTextEditorDecorationType({
      ...base,
      borderStyle: style,
      borderColor: color,
      borderWidth: `0 ${w} 0 ${w}`,       // right + left only
    });

    this._botDecType = vscode.window.createTextEditorDecorationType({
      ...base,
      borderStyle: style,
      borderColor: color,
      borderWidth: `0 ${w} ${w} ${w}`,    // right + bottom + left, no top
    });

    this._singleDecType = vscode.window.createTextEditorDecorationType({
      ...base,
      borderStyle: style,
      borderColor: color,
      borderWidth: w,                      // all four sides equal
    });
  }

  _disposeDecorationTypes() {
    for (const key of ['_topDecType', '_midDecType', '_botDecType', '_singleDecType']) {
      if (this[key]) { this[key].dispose(); this[key] = undefined; }
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  updateEditor(editor) {
    if (!editor || !SUPPORTED_LANGUAGES.has(editor.document.languageId)) return;

    if (!this.enabled) {
      this._clearAll(editor);
      return;
    }

    const docKey     = editor.document.uri.toString();
    const docVersion = editor.document.version;
    const cached     = this._componentCache.get(docKey);

    let components;
    if (cached && cached.version === docVersion) {
      components = cached.components;
    } else {
      components = detectReactComponents(editor.document);
      this._componentCache.set(docKey, { version: docVersion, components });
    }

    const topRanges    = [];
    const midRanges    = [];
    const botRanges    = [];
    const singleRanges = [];
    const doc          = editor.document;

    for (const { startLine, endLine } of components) {
      if (startLine === endLine) {
        singleRanges.push(new vscode.Range(startLine, 0, startLine, doc.lineAt(startLine).text.length));
        continue;
      }

      topRanges.push(new vscode.Range(startLine, 0, startLine, doc.lineAt(startLine).text.length));

      for (let ln = startLine + 1; ln < endLine; ln++) {
        midRanges.push(new vscode.Range(ln, 0, ln, doc.lineAt(ln).text.length));
      }

      botRanges.push(new vscode.Range(endLine, 0, endLine, doc.lineAt(endLine).text.length));
    }

    editor.setDecorations(this._topDecType,    topRanges);
    editor.setDecorations(this._midDecType,    midRanges);
    editor.setDecorations(this._botDecType,    botRanges);
    editor.setDecorations(this._singleDecType, singleRanges);
  }

  toggle() {
    this.enabled = !this.enabled;
    const editor = vscode.window.activeTextEditor;
    if (editor) this.updateEditor(editor);
    vscode.window.showInformationMessage(
      `Moji: React Component Outlines ${this.enabled ? 'enabled' : 'disabled'}`
    );
  }

  reloadConfig() {
    const newColor = appSettingsStore.get('reactComponentOutlines.color', DEFAULT_COLOR);
    const newWidth = appSettingsStore.get('reactComponentOutlines.width', DEFAULT_WIDTH);
    const newStyle = appSettingsStore.get('reactComponentOutlines.style', DEFAULT_STYLE);

    const styleChanged = newColor !== this._cfgColor ||
                         newWidth !== this._cfgWidth ||
                         newStyle !== this._cfgStyle;

    if (styleChanged) this._buildDecorationTypes();

    this.enabled = appSettingsStore.get('reactComponentOutlines.enabled', false);
    this._componentCache.clear();
  }

  clearCacheForDocument(uri) {
    this._componentCache.delete(uri);
  }

  dispose() {
    this._disposeDecorationTypes();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _clearAll(editor) {
    for (const key of ['_topDecType', '_midDecType', '_botDecType', '_singleDecType']) {
      if (this[key]) editor.setDecorations(this[key], []);
    }
  }
}

module.exports = { ComponentOutlineDecorator };
