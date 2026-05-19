// Scans a VS Code TextDocument for C# keyword tokens,
// correctly skipping keywords that appear inside comments or strings.

const { createScanner } = require('./scannerFactory');
const { CSHARP_KEYWORD_EMOJI_MAP } = require('./csharpKeywordMap');

// C# skip patterns (comments and strings)
const SKIP_PATTERNS = [
  '(\\/\\/[^\\n]*)',                                    // 1  line comment
  '(\\/\\*[\\s\\S]*?\\*\\/)',                           // 2  block comment
  '(@"(?:[^"]|"")*")',                                  // 3  verbatim string
  '(\\$@?"(?:[^"\\\\]|\\\\.)*")',                       // 4  interpolated string (simplified)
  "('(?:[^'\\\\]|\\\\.)*')",                            // 5  character literal
  '("(?:[^"\\\\]|\\\\.)*")',                            // 6  regular string
];

// Create scanner using factory (with 'cs:' prefix)
const scanCsharpKeywords = createScanner(CSHARP_KEYWORD_EMOJI_MAP, SKIP_PATTERNS, 'g', 'csharp:');

module.exports = { scanCsharpKeywords };
