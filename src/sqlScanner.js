// Scans a VS Code TextDocument for SQL keyword tokens,
// correctly skipping keywords that appear inside comments or strings.

const { createScanner } = require('./scannerFactory');
const { SQL_KEYWORD_EMOJI_MAP } = require('./sqlKeywordMap');

// SQL skip patterns (comments and strings)
const SKIP_PATTERNS = [
  '(--[^\\n]*)',                              // 1  line comment
  '(\\/\\*[\\s\\S]*?\\*\\/)',                 // 2  block comment
  "('(?:[^']|'')*')",                         // 3  single-quoted string
  '("(?:[^"]|"")*")',                         // 4  double-quoted identifier
];

// Create scanner using factory (with 'sql:' prefix and case-insensitive)
const scanSqlKeywords = createScanner(SQL_KEYWORD_EMOJI_MAP, SKIP_PATTERNS, 'gi', 'sql:');

module.exports = { scanSqlKeywords };
