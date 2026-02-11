// Scans a VS Code TextDocument for TypeScript keyword tokens,
// correctly skipping keywords that appear inside comments or strings.
//
// Strategy: a single combined regex matches comments, strings, and keywords
// in left-to-right order. Because string / comment patterns appear first
// in the alternation, they consume their content before the keyword branch
// can see anything inside them.

const vscode = require('vscode');
const { TYPESCRIPT_KEYWORD_EMOJI_MAP } = require('./typescriptKeywordMap');

// ── Build the combined tokenizer regex ─────────────────────────────────────

const KEYWORDS = Object.keys(TYPESCRIPT_KEYWORD_EMOJI_MAP);

// Sort longest-first so that e.g. "instanceof" matches before "in".
const sorted = KEYWORDS.slice().sort((a, b) => b.length - a.length);
const KEYWORD_ALT = sorted.join('|');

// Each capture group consumes one kind of "uninteresting" token that can
// contain keyword-like text we must ignore.
//
// Group 1 – single-line comment      //…
// Group 2 – block comment            /*…*/
// Group 3 – template literal         `…` (with ${} interpolation)
// Group 4 – double-quoted string     "…"
// Group 5 – single-quoted string     '…'
// Group 6 – regex literal            /…/ (simplified)
// Group 7 – keyword                  \bkeyword\b (not preceded by ".")

const TOKEN_REGEX = new RegExp(
  [
    '(\\/\\/[^\\n]*)',                        // 1  line comment
    '(\\/\\*[\\s\\S]*?\\*\\/)',               // 2  block comment
    '(`(?:[^`\\\\]|\\\\.)*`)',                // 3  template literal (simplified)
    '("(?:[^"\\\\]|\\\\.)*")',                // 4  double-quoted string
    "('(?:[^'\\\\]|\\\\.)*')",                // 5  single-quoted string
    '(\\/(?![*/])[^\\/\\n]*\\/[gimsuy]*)',    // 6  regex literal (simplified)
    `(?<!\\.)\\b(${KEYWORD_ALT})\\b`,         // 7  keyword (not after .)
  ].join('|'),
  'g',
);

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns an array of { keyword: string, range: vscode.Range } for every
 * real keyword occurrence in `document`.
 */
function scanTypescriptKeywords(document) {
  const text = document.getText();
  const results = [];

  // Reset the stateful regex before each scan.
  TOKEN_REGEX.lastIndex = 0;

  let match;
  while ((match = TOKEN_REGEX.exec(text)) !== null) {
    // Groups 1-6 are non-keyword tokens – skip them.
    const keyword = match[7];
    if (!keyword) continue;

    const startPos = document.positionAt(match.index);
    const endPos   = document.positionAt(match.index + keyword.length);

    results.push({
      keyword,
      range: new vscode.Range(startPos, endPos),
    });
  }

  return results;
}

module.exports = { scanTypescriptKeywords };
