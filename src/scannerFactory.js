// Generic scanner factory that creates keyword scanners for any language.
// Eliminates code duplication across 8+ language-specific scanner files.

const vscode = require('vscode');

/**
 * Creates a keyword scanner function for a specific language.
 *
 * @param {Object} keywordMap - Map of keyword -> emoji
 * @param {string[]} skipPatterns - Array of regex patterns to skip (comments, strings, etc.)
 * @param {string} flags - Regex flags (default: 'g')
 * @param {string} keywordPrefix - Optional prefix to add to matched keywords (e.g., 'py:')
 * @returns {function} Scanner function that takes a TextDocument and returns matches
 */
function createScanner(keywordMap, skipPatterns, flags = 'g', keywordPrefix = '') {
  // Build keyword alternation, sorted longest-first for proper matching
  const keywords = Object.keys(keywordMap);
  const sorted = keywords.slice().sort((a, b) => b.length - a.length);
  const keywordAlt = sorted.join('|');

  // Build the combined tokenizer regex:
  // - Skip patterns come first (consume non-keyword tokens)
  // - Keyword pattern comes last (captures real keywords)
  const patterns = [
    ...skipPatterns,
    `(?<![.])\\b(${keywordAlt})\\b`,  // Keyword pattern (negative lookbehind for ".")
  ];

  const regex = new RegExp(patterns.join('|'), flags);
  const keywordGroupIndex = skipPatterns.length + 1;  // Keyword is always the last group

  // Return the scanner function
  return function(document) {
    const text = document.getText();
    const results = [];

    // Reset stateful regex before each scan
    regex.lastIndex = 0;

    let match;
    while ((match = regex.exec(text)) !== null) {
      // Skip non-keyword matches (comments, strings, etc.)
      const keyword = match[keywordGroupIndex];
      if (!keyword) continue;

      // Calculate positions (optimize: avoid double positionAt call)
      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + keyword.length);

      results.push({
        keyword: keywordPrefix ? `${keywordPrefix}${keyword}` : keyword,
        range: new vscode.Range(startPos, endPos),
      });
    }

    return results;
  };
}

module.exports = { createScanner };
