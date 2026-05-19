// Scans a VS Code TextDocument for C++ keyword tokens,
// correctly skipping keywords that appear inside comments or strings.

const { createScanner } = require('./scannerFactory');
const { CPP_KEYWORD_EMOJI_MAP } = require('./cppKeywordMap');

// C++ skip patterns (comments and strings)
const SKIP_PATTERNS = [
  '(\\/\\/[^\\n]*)',                            // 1  line comment
  '(\\/\\*[\\s\\S]*?\\*\\/)',                   // 2  block comment
  '(R"[^(]*\\([\\s\\S]*?\\)[^"]*")',            // 3  raw string literal
  "('(?:[^'\\\\]|\\\\.)*')",                    // 4  character literal
  '("(?:[^"\\\\]|\\\\.)*")',                    // 5  string literal
];

// Create scanner using factory (with 'cpp:' prefix)
const scanCppKeywords = createScanner(CPP_KEYWORD_EMOJI_MAP, SKIP_PATTERNS, 'g', 'cpp:');

module.exports = { scanCppKeywords };
