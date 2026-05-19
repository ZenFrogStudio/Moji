// Scans a VS Code TextDocument for Java keyword tokens,
// correctly skipping keywords that appear inside comments or strings.

const { createScanner } = require('./scannerFactory');
const { JAVA_KEYWORD_EMOJI_MAP } = require('./javaKeywordMap');

// Java skip patterns (comments and strings)
const SKIP_PATTERNS = [
  '(\\/\\/[^\\n]*)',                        // 1  line comment
  '(\\/\\*[\\s\\S]*?\\*\\/)',               // 2  block comment
  '("""[\\s\\S]*?""")',                     // 3  text block
  "('(?:[^'\\\\]|\\\\.)*')",                // 4  character literal
  '("(?:[^"\\\\]|\\\\.)*")',                // 5  string literal
];

// Create scanner using factory (with 'java:' prefix)
const scanJavaKeywords = createScanner(JAVA_KEYWORD_EMOJI_MAP, SKIP_PATTERNS, 'g', 'java:');

module.exports = { scanJavaKeywords };
