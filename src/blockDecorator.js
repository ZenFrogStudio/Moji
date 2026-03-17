// Adds code block highlighting to the editor: a configurable background tint
// applied to every line within each detected multi-line block, so users can
// quickly identify code block boundaries and their contents at a glance.
//
// Supported block strategies:
//   bracket-based  – JS, TS, Java, C, C++, C#, CSS/SCSS/Less  ({} delimiters)
//   indent-based   – Python  (indentation level as depth proxy)

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

class BlockDecorator {
  constructor() {
    /** @type {vscode.TextEditorDecorationType | null} Background fill for all lines within a block. */
    this._bgDecType = null;

    /** @type {Map<string, {version: number, blocks: Array}>} Per-document scan cache. */
    this._blockCache = new Map();

    this.enabled = false;

    // Cached config value — compared in reloadConfig to detect style changes
    // that require rebuilding the decoration type (unavoidable dispose/recreate).
    this._cfgBackgroundColor = null;

    this._buildDecorationTypes();
  }

  // ── Decoration type management ─────────────────────────────────────────────

  _buildDecorationTypes() {
    this._disposeDecorationTypes();

    const cfg = vscode.workspace.getConfiguration('mojiPro.codeBlocks');
    this._cfgBackgroundColor = cfg.get('backgroundColor', 'rgba(128,128,128,0.06)');

    this._bgDecType = vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      backgroundColor: this._cfgBackgroundColor,
    });
  }

  _disposeDecorationTypes() {
    if (this._bgDecType) this._bgDecType.dispose();
    this._bgDecType = null;
  }

  // ── Block detection ────────────────────────────────────────────────────────

  /**
   * Returns [{startLine, endLine}] for all multi-line blocks in the document.
   * Routes to the appropriate detection strategy based on language.
   * @param {vscode.TextDocument} document
   * @returns {{startLine: number, endLine: number}[]}
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
    const text   = document.getText();
    const blocks = [];
    const stack  = []; // startLine values pushed on '{'

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
        stack.push(charToLine(i));
      } else if (ch === '}' && stack.length > 0) {
        const startLine = stack.pop();
        const endLine   = charToLine(i);
        if (endLine > startLine) {
          // Only record multi-line blocks — single-line {} clutter the view.
          blocks.push({ startLine, endLine });
        }
      }

      i++;
    }

    return blocks;
  }

  /**
   * Indentation-based block detection for Python.
   * For each indent level L (1, 2, …), finds contiguous runs of lines whose
   * effective indent >= L and records each run as one block.
   * Blank lines are treated as continuations (don't break a run) but are
   * trimmed from the recorded block end.
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

    // Use reduce instead of spread+Math.max — spread into Math.max throws a
    // RangeError on large Python files (V8 has a ~65k argument count limit).
    const maxLevel = indentLevels.reduce((max, l) => (l !== null && l > max ? l : max), 0);

    for (let level = 1; level <= maxLevel && level <= 20; level++) {
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
            blocks.push({ startLine: blockStart, endLine });
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

    const bgRanges = blocks.map(({ startLine, endLine }) =>
      new vscode.Range(startLine, 0, endLine, editor.document.lineAt(endLine).text.length)
    );

    editor.setDecorations(this._bgDecType, bgRanges);
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
    const cfg        = vscode.workspace.getConfiguration('mojiPro.codeBlocks');
    const newBgColor = cfg.get('backgroundColor', 'rgba(128,128,128,0.06)');

    if (newBgColor !== this._cfgBackgroundColor) {
      // Background color changed — must recreate the decoration type (unavoidable full rebuild).
      this._buildDecorationTypes();
    }

    this.enabled = cfg.get('enabled', false);
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
    if (this._bgDecType) editor.setDecorations(this._bgDecType, []);
  }
}

module.exports = { BlockDecorator };
