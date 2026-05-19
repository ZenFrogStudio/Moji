// Scans a VS Code TextDocument for C keyword tokens,
// correctly skipping keywords that appear inside comments or strings.

const { createScanner } = require('./scannerFactory');
const { C_KEYWORD_EMOJI_MAP } = require('./cKeywordMap');

// C skip patterns (comments and strings)
const SKIP_PATTERNS = [
  '(\\/\\/[^\\n]*)',                            // 1  line comment
  '(\\/\\*[\\s\\S]*?\\*\\/)',                   // 2  block comment
  "('(?:[^'\\\\]|\\\\.)*')",                    // 3  character literal
  '("(?:[^"\\\\]|\\\\.)*")',                    // 4  string literal
];

// Create scanner using factory (with 'c:' prefix)
const scanCKeywords = createScanner(C_KEYWORD_EMOJI_MAP, SKIP_PATTERNS, 'g', 'c:');

module.exports = { scanCKeywords };
