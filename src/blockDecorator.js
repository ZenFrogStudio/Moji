// Adds code block highlighting to the editor: a faint background tint applied
// to every line within each detected multi-line block. Each block type gets a
// distinct color so the nature of the block (function, loop, control flow, or
// object/data) is visually apparent at a glance without being distracting.
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

// All recognized block types — order is stable and used for setDecorations calls.
const BLOCK_TYPES = ['function', 'loop', 'control', 'object'];

// Default faint tints tuned to VS Code's default token color palette so the
// block types feel semantically consistent with the editor's existing syntax colors.
const DEFAULT_COLORS = {
  function: 'rgba(86,156,214,0.08)',   // blue   — aligns with VS Code's function token color
  loop:     'rgba(78,201,176,0.08)',   // teal   — aligns with VS Code's iteration token color
  control:  'rgba(197,134,192,0.08)', // purple — aligns with VS Code's control-flow token color
  object:   'rgba(206,145,120,0.08)', // orange — aligns with VS Code's property/object token color
};

class BlockDecorator {
  constructor() {
    /**
     * One decoration type per block type, keyed by BLOCK_TYPES string.
     * @type {Map<string, vscode.TextEditorDecorationType>}
     */
    this._decTypes = new Map();

    /** @type {Map<string, {version: number, blocks: Array}>} Per-document scan cache. */
    this._blockCache = new Map();

    this.enabled = false;

    // Cached color values — compared in reloadConfig to detect changes that
    // require rebuilding decoration types (VS Code forces dispose/recreate).
    this._cfgColors = {};

    this._buildDecorationTypes();
  }

  // ── Decoration type management ─────────────────────────────────────────────

  _buildDecorationTypes() {
    this._disposeDecorationTypes();

    const cfg = vscode.workspace.getConfiguration('mojiPro.codeBlocks');
    for (const blockType of BLOCK_TYPES) {
      const color = cfg.get(`${blockType}Color`, DEFAULT_COLORS[blockType]);
      this._cfgColors[blockType] = color;

      this._decTypes.set(blockType, vscode.window.createTextEditorDecorationType({
        isWholeLine: true,
        backgroundColor: color,
      }));
    }
  }

  _disposeDecorationTypes() {
    for (const decType of this._decTypes.values()) decType.dispose();
    this._decTypes.clear();
    this._cfgColors = {};
  }

  // ── Block classification ────────────────────────────────────────────────────

  /**
   * Classifies a bracket-based block by inspecting the text of the line that
   * contains the opening `{`. Priority order: loop → control → function → object,
   * so `if (fn()) {` is correctly classified as control rather than function.
   * @param {vscode.TextDocument} document
   * @param {number} startLine  Zero-based line number of the opening `{`.
   * @returns {'loop'|'control'|'function'|'object'}
   */
  _classifyBracketBlock(document, startLine) {
    const lineText = document.lineAt(startLine).text;

    // Loop: for/while/do always introduce a repeating body block.
    if (/\b(for|while|do)\b/.test(lineText)) return 'loop';

    // Control flow: if/else/switch/try/catch/finally introduce conditional
    // or error-handling blocks — checked before function to handle `if (fn()) {`.
    if (/\b(if|else|switch|try|catch|finally)\b/.test(lineText)) return 'control';

    // Function/class: explicit `function`/`class` keyword, arrow `=>`, or a
    // method-like signature pattern (e.g. `methodName(args) {`).
    if (
      /\b(function|class)\b/.test(lineText) ||
      /=>/.test(lineText) ||
      /\w+\s*\([^)]*\)\s*\{/.test(lineText)
    ) {
      return 'function';
    }

    // Default: object literal, namespace block, module pattern, or other unlabeled block.
    return 'object';
  }

  /**
   * Classifies an indent-based (Python) block by inspecting the header line
   * immediately before the block body — the line ending with a colon that
   * introduces the indented block.
   * @param {vscode.TextDocument} document
   * @param {number} startLine  Zero-based first line of the indented block body.
   * @returns {'loop'|'control'|'function'|'object'}
   */
  _classifyIndentBlock(document, startLine) {
    if (startLine === 0) return 'object';
    const headerText = document.lineAt(startLine - 1).text.trimStart();

    if (/^(for|while)\b/.test(headerText)) return 'loop';
    if (/^(if|elif|else|try|except|finally|with)\b/.test(headerText)) return 'control';
    if (/^(async\s+)?def\b/.test(headerText) || /^class\b/.test(headerText)) return 'function';

    return 'object';
  }

  // ── Block detection ────────────────────────────────────────────────────────

  /**
   * Returns [{startLine, endLine, blockType}] for all multi-line blocks.
   * Routes to the appropriate detection strategy based on language.
   * @param {vscode.TextDocument} document
   * @returns {{startLine: number, endLine: number, blockType: string}[]}
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
          const blockType = this._classifyBracketBlock(document, startLine);
          blocks.push({ startLine, endLine, blockType });
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
            const blockType = this._classifyIndentBlock(document, blockStart);
            blocks.push({ startLine: blockStart, endLine, blockType });
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

    // Group ranges by block type — VS Code requires one setDecorations call per
    // decoration type, so we can't mix all blocks into a single call.
    const rangesByType = {};
    for (const blockType of BLOCK_TYPES) rangesByType[blockType] = [];

    for (const { startLine, endLine, blockType } of blocks) {
      rangesByType[blockType].push(
        new vscode.Range(startLine, 0, endLine, editor.document.lineAt(endLine).text.length)
      );
    }

    for (const blockType of BLOCK_TYPES) {
      editor.setDecorations(this._decTypes.get(blockType), rangesByType[blockType]);
    }
  }

  /** Toggle the feature on/off and refresh the active editor. */
  toggle() {
    this.enabled = !this.enabled;
    const editor = vscode.window.activeTextEditor;
    if (editor) this.updateEditor(editor);
    vscode.window.showInformationMessage(
      `Moji: Code Block Highlighting ${this.enabled ? 'enabled' : 'disabled'}`
    );
  }

  /**
   * Re-read settings after a configuration change.
   * Rebuilds decoration types only when a color changed; otherwise just updates
   * the enabled flag to avoid a dispose/recreate flash.
   */
  reloadConfig() {
    const cfg = vscode.workspace.getConfiguration('mojiPro.codeBlocks');

    // Rebuild only if any block type color actually changed — avoids a visible
    // decoration flash when unrelated settings change in the same config event.
    const anyColorChanged = BLOCK_TYPES.some(blockType =>
      cfg.get(`${blockType}Color`, DEFAULT_COLORS[blockType]) !== this._cfgColors[blockType]
    );

    if (anyColorChanged) {
      this._buildDecorationTypes();
    }

    this.enabled = cfg.get('enabled', true);
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
    for (const decType of this._decTypes.values()) editor.setDecorations(decType, []);
  }
}

module.exports = { BlockDecorator };
