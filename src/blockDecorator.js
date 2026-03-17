// Adds depth-based block highlighting to the editor: tinted backgrounds that
// stack per nesting level plus a thin border outline, so users can quickly
// identify code block boundaries and their contents.
//
// Supported block strategies:
//   bracket-based  – JS, TS, Java, C, C++, C#, CSS/SCSS/Less  ({} delimiters)
//   indent-based   – Python  (indentation level as depth proxy)
//
// Background stacking model:
//   Ten decoration types share the same backgroundColor value.
//   A block at nesting depth D contributes its range to layers 0..D, so each
//   line inside D+1 nested blocks receives D+1 stacked background layers,
//   producing a progressively darker tint for deeper code — no per-depth
//   colour calculation required.

const vscode = require('vscode');

const BRACKET_BLOCK_LANGUAGES = new Set([
  'javascript', 'javascriptreact',
  'typescript', 'typescriptreact',
  'java', 'c', 'cpp', 'csharp',
  'css', 'scss', 'less',
]);

const INDENT_BLOCK_LANGUAGES = new Set(['python']);

const BLOCK_SUPPORTED_LANGUAGES = new Set([
  ...BRACKET_BLOCK_LANGUAGES,
  ...INDENT_BLOCK_LANGUAGES,
]);

// Number of stackable background-layer decoration types.
// Covers up to 10 levels of nesting before the tint stops darkening further.
const MAX_DEPTH_LAYERS = 10;

class BlockDecorator {
  constructor() {
    /** @type {vscode.TextEditorDecorationType[]} One per background stacking layer. */
    this._bgDecTypes = [];
    /** @type {vscode.TextEditorDecorationType | null} Thin border around every block line. */
    this._outlineDecType = null;

    /** @type {Map<string, {version: number, blocks: Array}>} Per-document scan cache. */
    this._blockCache = new Map();

    this.enabled = false;

    // Cached config values — used in reloadConfig to detect style changes that
    // require rebuilding decoration types (unavoidable dispose/recreate).
    this._cfgBorderColor     = null;
    this._cfgBackgroundColor = null;
    this._cfgBorderWidth     = null;

    this._buildDecorationTypes();
  }

  // ── Decoration type management ─────────────────────────────────────────────

  _buildDecorationTypes() {
    this._disposeDecorationTypes();

    const cfg = vscode.workspace.getConfiguration('mojiPro.codeBlocks');
    this._cfgBorderColor     = cfg.get('borderColor',     'rgba(128,128,128,0.35)');
    this._cfgBackgroundColor = cfg.get('backgroundColor', 'rgba(128,128,128,0.04)');
    this._cfgBorderWidth     = cfg.get('borderWidth',     1);

    // One decoration type per stacking layer — each contributes one background pass.
    for (let i = 0; i < MAX_DEPTH_LAYERS; i++) {
      this._bgDecTypes.push(
        vscode.window.createTextEditorDecorationType({
          isWholeLine: true,
          backgroundColor: this._cfgBackgroundColor,
        })
      );
    }

    // Outline: border on every line of every block.
    // isWholeLine means adjacent lines share a border edge, giving the appearance
    // of a continuous rectangular outline around the full block.
    this._outlineDecType = vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      border: `${this._cfgBorderWidth}px solid ${this._cfgBorderColor}`,
    });
  }

  _disposeDecorationTypes() {
    for (const dt of this._bgDecTypes) dt.dispose();
    this._bgDecTypes = [];
    if (this._outlineDecType) {
      this._outlineDecType.dispose();
      this._outlineDecType = null;
    }
  }

  // ── Block detection ────────────────────────────────────────────────────────

  /**
   * Returns [{startLine, endLine, depth}] for all multi-line blocks in the document.
   * Routes to the appropriate detection strategy based on language.
   * @param {vscode.TextDocument} document
   * @returns {{startLine: number, endLine: number, depth: number}[]}
   */
  _detectBlocks(document) {
    if (INDENT_BLOCK_LANGUAGES.has(document.languageId)) {
      return this._detectIndentBlocks(document);
    }
    return this._detectBracketBlocks(document);
  }

  /**
   * Bracket-based block detection for C-family and CSS languages.
   * Walks the raw text, skipping string literals and comments, tracking { } pairs.
   * Only multi-line blocks are recorded — single-line {} add visual noise.
   * @param {vscode.TextDocument} document
   */
  _detectBracketBlocks(document) {
    const text      = document.getText();
    const blocks    = [];
    const stack     = []; // {startLine, depth} entries pushed on '{'
    let currentDepth = 0;

    // Build a line-start-index array so char positions can be converted to
    // line numbers in O(log n) via binary search.
    const lineStarts = [0];
    for (let k = 0; k < text.length; k++) {
      if (text[k] === '\n') lineStarts.push(k + 1);
    }

    /** @param {number} charIndex @returns {number} zero-based line number */
    const charToLine = (charIndex) => {
      let lo = 0, hi = lineStarts.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (lineStarts[mid] <= charIndex) lo = mid; else hi = mid - 1;
      }
      return lo;
    };

    let i = 0;
    while (i < text.length) {
      const ch = text[i];

      // Skip single-line comments: // …\n
      if (ch === '/' && text[i + 1] === '/') {
        while (i < text.length && text[i] !== '\n') i++;
        continue;
      }

      // Skip block comments: /* … */
      if (ch === '/' && text[i + 1] === '*') {
        i += 2;
        while (i + 1 < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
        i += 2;
        continue;
      }

      // Skip string literals, handling escape sequences and template expressions.
      if (ch === '"' || ch === "'" || ch === '`') {
        const quote = ch;
        i++;
        while (i < text.length) {
          if (text[i] === '\\') { i += 2; continue; } // skip escaped char
          if (text[i] === quote) { i++; break; }
          // Template literal ${…} — skip nested expression to avoid treating
          // its braces as block delimiters.
          if (quote === '`' && text[i] === '$' && text[i + 1] === '{') {
            i += 2;
            let nestLevel = 1;
            while (i < text.length && nestLevel > 0) {
              if      (text[i] === '{') nestLevel++;
              else if (text[i] === '}') nestLevel--;
              i++;
            }
            continue;
          }
          i++;
        }
        continue;
      }

      if (ch === '{') {
        stack.push({ startLine: charToLine(i), depth: currentDepth });
        currentDepth++;
      } else if (ch === '}') {
        if (stack.length > 0) {
          currentDepth = Math.max(0, currentDepth - 1);
          const open    = stack.pop();
          const endLine = charToLine(i);
          if (endLine > open.startLine) {
            // Only record multi-line blocks — single-line {} clutter the view.
            blocks.push({ startLine: open.startLine, endLine, depth: open.depth });
          }
        } else {
          // Unmatched closing brace — keep depth from going negative.
          currentDepth = Math.max(0, currentDepth - 1);
        }
      }

      i++;
    }

    return blocks;
  }

  /**
   * Indentation-based block detection for Python.
   * For each indent level L (1, 2, …), finds contiguous runs of lines whose
   * effective indent >= L and records each run as a block at depth L-1.
   * Blank lines are treated as continuations of the current block (they don't
   * break a run) but are trimmed from the block's end.
   * @param {vscode.TextDocument} document
   */
  _detectIndentBlocks(document) {
    const lineCount = document.lineCount;
    const tabSize   = vscode.workspace.getConfiguration('editor').get('tabSize', 4);
    const blocks    = [];

    // Compute effective indent level for every line (null = blank/whitespace-only).
    const indentLevels = [];
    for (let l = 0; l < lineCount; l++) {
      const line = document.lineAt(l);
      if (line.isEmptyOrWhitespace) {
        indentLevels.push(null);
        continue;
      }
      let spaces = 0;
      for (const ch of line.text) {
        if      (ch === ' ')  spaces++;
        else if (ch === '\t') spaces = spaces + tabSize - (spaces % tabSize);
        else break;
      }
      indentLevels.push(Math.floor(spaces / tabSize));
    }

    const maxLevel = Math.max(0, ...indentLevels.filter(l => l !== null));

    for (let level = 1; level <= maxLevel && level <= MAX_DEPTH_LAYERS; level++) {
      let blockStart = -1;

      // Iterate one past the last line so any open block is closed by the sentinel.
      for (let l = 0; l <= lineCount; l++) {
        const indent  = l < lineCount ? indentLevels[l] : -1; // -1 sentinel closes open blocks
        const inBlock = indent === null ? (blockStart >= 0) : (indent >= level);

        if (inBlock && blockStart < 0) {
          blockStart = l;
        } else if (!inBlock && blockStart >= 0) {
          // Trim trailing blank lines from the recorded block end.
          let endLine = l - 1;
          while (endLine > blockStart && indentLevels[endLine] === null) endLine--;
          if (endLine > blockStart) {
            blocks.push({ startLine: blockStart, endLine, depth: level - 1 });
          }
          blockStart = -1;
        }
      }
    }

    return blocks;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Detect blocks in `editor`'s document and apply (or clear) decorations. */
  updateEditor(editor) {
    if (!editor || !BLOCK_SUPPORTED_LANGUAGES.has(editor.document.languageId)) {
      return;
    }

    if (!this.enabled) {
      this._clearAll(editor);
      return;
    }

    // Use the per-document scan cache to avoid re-scanning on every keystroke.
    const docKey     = editor.document.uri.toString();
    const docVersion = editor.document.version;
    const cached     = this._blockCache.get(docKey);

    let blocks;
    if (cached && cached.version === docVersion) {
      blocks = cached.blocks;
    } else {
      blocks = this._detectBlocks(editor.document);
      this._blockCache.set(docKey, { version: docVersion, blocks });
    }

    // Build per-layer background range arrays and the shared outline range array.
    //
    // A block at depth D contributes its range to layers 0..D so that every line
    // inside D+1 enclosing blocks receives D+1 stacked background layers,
    // producing the depth-proportional tint without per-depth colour values.
    const depthRanges   = Array.from({ length: MAX_DEPTH_LAYERS }, () => []);
    const outlineRanges = [];

    for (const { startLine, endLine, depth } of blocks) {
      const endChar    = editor.document.lineAt(endLine).text.length;
      const blockRange = new vscode.Range(startLine, 0, endLine, endChar);

      const clampedDepth = Math.min(depth, MAX_DEPTH_LAYERS - 1);
      for (let d = 0; d <= clampedDepth; d++) {
        depthRanges[d].push(blockRange);
      }

      outlineRanges.push(blockRange);
    }

    for (let d = 0; d < MAX_DEPTH_LAYERS; d++) {
      editor.setDecorations(this._bgDecTypes[d], depthRanges[d]);
    }
    editor.setDecorations(this._outlineDecType, outlineRanges);
  }

  /** Toggle the feature on/off and refresh the active editor. */
  toggle() {
    this.enabled = !this.enabled;
    const editor = vscode.window.activeTextEditor;
    if (editor) this.updateEditor(editor);
    vscode.window.showInformationMessage(
      `Moji Pro: Code Block Highlighting ${this.enabled ? 'enabled' : 'disabled'}`
    );
  }

  /**
   * Re-read settings after a configuration change.
   * Rebuilds decoration types only when the visual style changed; otherwise
   * just updates the enabled flag to avoid a dispose/recreate flash.
   */
  reloadConfig() {
    const cfg            = vscode.workspace.getConfiguration('mojiPro.codeBlocks');
    const newBorderColor = cfg.get('borderColor',     'rgba(128,128,128,0.35)');
    const newBgColor     = cfg.get('backgroundColor', 'rgba(128,128,128,0.04)');
    const newBorderWidth = cfg.get('borderWidth',     1);

    const styleChanged =
      newBorderColor  !== this._cfgBorderColor  ||
      newBgColor      !== this._cfgBackgroundColor ||
      newBorderWidth  !== this._cfgBorderWidth;

    if (styleChanged) {
      // Visual style changed — must recreate decoration types (unavoidable full rebuild).
      this._buildDecorationTypes();
    }

    this.enabled = cfg.get('enabled', false);
    // Force re-scan so any layout-affecting config changes are reflected.
    this._blockCache.clear();
  }

  /** Evict the scan cache entry for a document that has been closed. */
  clearCacheForDocument(uri) {
    this._blockCache.delete(uri);
  }

  /** Dispose all managed decoration types. */
  dispose() {
    this._disposeDecorationTypes();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _clearAll(editor) {
    for (const dt of this._bgDecTypes) editor.setDecorations(dt, []);
    if (this._outlineDecType) editor.setDecorations(this._outlineDecType, []);
  }
}

module.exports = { BlockDecorator };
