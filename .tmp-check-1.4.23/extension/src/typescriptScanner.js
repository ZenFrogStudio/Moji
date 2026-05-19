// Scans a VS Code TextDocument for TypeScript keyword tokens,
// correctly skipping keywords that appear inside comments or strings.

const { createScanner } = require('./scannerFactory');
const { TYPESCRIPT_KEYWORD_EMOJI_MAP } = require('./typescriptKeywordMap');

// TypeScript skip patterns (comments and strings)
const SKIP_PATTERNS = [
  '(\\/\\/[^\\n]*)',                        // 1  line comment
  '(\\/\\*[\\s\\S]*?\\*\\/)',               // 2  block comment
  '(`(?:[^`\\\\]|\\\\.)*`)',                // 3  template literal (simplified)
  '("(?:[^"\\\\]|\\\\.)*")',                // 4  double-quoted string
  "('(?:[^'\\\\]|\\\\.)*')",                // 5  single-quoted string
  '(\\/(?![*/])[^\\/\\n]*\\/[gimsuy]*)',    // 6  regex literal (simplified)
];

// Create scanner using factory (with 'ts:' prefix)
const scanTypescriptKeywords = createScanner(TYPESCRIPT_KEYWORD_EMOJI_MAP, SKIP_PATTERNS, 'g', 'ts:');

module.exports = { scanTypescriptKeywords };
