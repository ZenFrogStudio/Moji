// Scans a VS Code TextDocument for Python keyword tokens,
// correctly skipping keywords that appear inside comments or strings.

const { createScanner } = require('./scannerFactory');
const { PYTHON_KEYWORD_EMOJI_MAP } = require('./pythonKeywordMap');

// Python skip patterns (comments and strings)
const SKIP_PATTERNS = [
  '(#[^\\n]*)',                                           // 1  line comment
  '([rRfFbBuU]{0,2}"""[\\s\\S]*?""")',                   // 2  triple double-quoted string
  "([rRfFbBuU]{0,2}'''[\\s\\S]*?''')",                   // 3  triple single-quoted string
  "([rRfFbBuU]{0,2}'(?:[^'\\\\\\n]|\\\\.)*')",           // 4  single-quoted string
  '([rRfFbBuU]{0,2}"(?:[^"\\\\\\n]|\\\\.)*")',           // 5  double-quoted string
];

// Create scanner using factory (with 'py:' prefix)
const scanPythonKeywords = createScanner(PYTHON_KEYWORD_EMOJI_MAP, SKIP_PATTERNS, 'g', 'py:');

module.exports = { scanPythonKeywords };
