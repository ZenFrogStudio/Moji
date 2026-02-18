// Scans a VS Code TextDocument for JavaScript keyword tokens,
// correctly skipping keywords that appear inside comments or strings.

const { createScanner } = require('./scannerFactory');
const { KEYWORD_EMOJI_MAP } = require('./keywordMap');

// JavaScript skip patterns (comments and strings)
const SKIP_PATTERNS = [
  '(\\/\\/[^\\n]*)',                            // 1  line comment
  '(\\/\\*[\\s\\S]*?\\*\\/)',                   // 2  block comment
  "(\'(?:[^\'\\\\]|\\\\.)*\')",                 // 3  single-quoted string
  '("(?:[^"\\\\]|\\\\.)*")',                    // 4  double-quoted string
  '(`(?:[^`\\\\]|\\\\.)*`)',                    // 5  template literal
];

// Create scanner using factory
const scanKeywords = createScanner(KEYWORD_EMOJI_MAP, SKIP_PATTERNS);

module.exports = { scanKeywords };
