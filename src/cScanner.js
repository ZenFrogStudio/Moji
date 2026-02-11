// Scans a VS Code TextDocument for C keyword tokens,
// correctly skipping keywords that appear inside comments or strings.
//
// Strategy: a single combined regex matches comments, strings, and keywords
// in left-to-right order. Because string / comment patterns appear first
// in the alternation, they consume their content before the keyword branch
// can see anything inside them.

const vscode = require('vscode');
const { C_KEYWORD_EMOJI_MAP } = require('./cKeywordMap');

// ── Build the combined tokenizer regex ─────────────────────────────────────

const KEYWORDS = Object.keys(C_KEYWORD_EMOJI_MAP);

// Sort longest-first so that e.g. "unsigned" matches before "un".
const sorted = KEYWORDS.slice().sort((a, b) => b.length - a.length);
const KEYWORD_ALT = sorted.join('|');

// Each capture group consumes one kind of "uninteresting" token that can
// contain keyword-like text we must ignore.
//
// Group 1 – single-line comment    //…
// Group 2 – block comment          /*…*/
// Group 3 – character literal      '…'
// Group 4 – string literal         "…"
// Group 5 – keyword                \bkeyword\b (not preceded by ".")

const TOKEN_REGEX = new RegExp(
  [
    '(\\/\\/[^\\n]*)',                            // 1  line comment
    '(\\/\\*[\\s\\S]*?\\*\\/)',                   // 2  block comment
    "('(?:[^'\\\\]|\\\\.)*')",                    // 3  character literal
    '("(?:[^"\\\\]|\\\\.)*")',                    // 4  string literal
    `(?<![.])\\b(${KEYWORD_ALT})\\b`,             // 5  keyword (negative lookbehind for ".")
  ].join('|'),
  'g',
);

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns an array of { keyword: string, range: vscode.Range } for every
 * real keyword occurrence in `document`.
 */
function scanCKeywords(document) {
  const text = document.getText();
  const results = [];

  // Reset the stateful regex before each scan.
  TOKEN_REGEX.lastIndex = 0;

  let match;
  while ((match = TOKEN_REGEX.exec(text)) !== null) {
    // Groups 1-4 are non-keyword tokens – skip them.
    const keyword = match[5];
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

module.exports = { scanCKeywords };
