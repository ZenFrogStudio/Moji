// Scans a VS Code TextDocument for Python keyword tokens,
// correctly skipping keywords that appear inside comments or strings.
//
// Strategy: a single combined regex matches comments, strings, and keywords
// in left-to-right order. Because string / comment patterns appear first
// in the alternation, they consume their content before the keyword branch
// can see anything inside them.

const vscode = require('vscode');
const { PYTHON_KEYWORD_EMOJI_MAP } = require('./pythonKeywordMap');

// ── Build the combined tokenizer regex ─────────────────────────────────────

const KEYWORDS = Object.keys(PYTHON_KEYWORD_EMOJI_MAP);

// Sort longest-first so that e.g. "nonlocal" matches before "non".
const sorted = KEYWORDS.slice().sort((a, b) => b.length - a.length);
const KEYWORD_ALT = sorted.join('|');

// Each capture group consumes one kind of "uninteresting" token that can
// contain keyword-like text we must ignore.
//
// Group 1 – single-line comment    #…
// Group 2 – triple double-quoted   """…"""
// Group 3 – triple single-quoted   '''…'''
// Group 4 – single-quoted string   '…' (with optional prefix: r, f, b, rf, fr, br, rb)
// Group 5 – double-quoted string   "…" (with optional prefix: r, f, b, rf, fr, br, rb)
// Group 6 – keyword                \bkeyword\b (not preceded by ".")

const TOKEN_REGEX = new RegExp(
  [
    '(#[^\\n]*)',                                           // 1  line comment
    '([rRfFbBuU]{0,2}"""[\\s\\S]*?""")',                   // 2  triple double-quoted string
    "([rRfFbBuU]{0,2}'''[\\s\\S]*?''')",                   // 3  triple single-quoted string
    "([rRfFbBuU]{0,2}'(?:[^'\\\\\\n]|\\\\.)*')",           // 4  single-quoted string
    '([rRfFbBuU]{0,2}"(?:[^"\\\\\\n]|\\\\.)*")',           // 5  double-quoted string
    `(?<![.])\\b(${KEYWORD_ALT})\\b`,                      // 6  keyword (negative lookbehind for ".")
  ].join('|'),
  'g',
);

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns an array of { keyword: string, range: vscode.Range } for every
 * real keyword occurrence in `document`.
 */
function scanPythonKeywords(document) {
  const text = document.getText();
  const results = [];

  // Reset the stateful regex before each scan.
  TOKEN_REGEX.lastIndex = 0;

  let match;
  while ((match = TOKEN_REGEX.exec(text)) !== null) {
    // Groups 1-5 are non-keyword tokens – skip them.
    const keyword = match[6];
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

module.exports = { scanPythonKeywords };
