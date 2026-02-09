// Scans a VS Code TextDocument for HTML tokens: tag names, void elements,
// and attribute names – correctly skipping comments, DOCTYPE declarations,
// and the raw content of <script> and <style> blocks.
//
// Strategy: a character-by-character state machine that tracks whether we
// are inside a tag, inside an attribute value, etc.  This avoids the
// context-sensitivity pitfalls of a single flat regex.

const vscode = require('vscode');
const {
  HTML_TAG_EMOJI_MAP,
  HTML_VOID_EMOJI_MAP,
  HTML_ATTR_EMOJI_MAP,
} = require('./htmlKeywordMap');

// ── Helpers ──────────────────────────────────────────────────────────────────

const WORD_CHAR = /[\w-]/;
const WHITESPACE = /\s/;

/**
 * Scan attributes inside an opening tag.
 * `i` should point to the first character after the tag name.
 * Returns the updated index (pointing at '>' or '/' of '/>').
 */
function _scanAttributes(text, i, len, document, results) {
  while (i < len) {
    const ch = text[i];

    // End of tag
    if (ch === '>') break;
    if (ch === '/' && i + 1 < len && text[i + 1] === '>') break;

    // Skip whitespace
    if (WHITESPACE.test(ch)) { i++; continue; }

    // ── Attribute name ────────────────────────────────────────────────────
    const attrStart = i;
    while (i < len && WORD_CHAR.test(text[i])) i++;

    if (i === attrStart) {
      // Not a valid attribute-name character – skip and continue.
      i++;
      continue;
    }

    const attrName = text.substring(attrStart, i).toLowerCase();

    if (HTML_ATTR_EMOJI_MAP.hasOwnProperty(attrName)) {
      results.push({
        keyword: `attr:${attrName}`,
        range: new vscode.Range(
          document.positionAt(attrStart),
          document.positionAt(i),
        ),
      });
    }

    // ── Optional attribute value ──────────────────────────────────────────
    // Skip whitespace before potential '='
    while (i < len && WHITESPACE.test(text[i])) i++;

    if (i < len && text[i] === '=') {
      i++; // skip '='
      while (i < len && WHITESPACE.test(text[i])) i++;

      if (i < len && text[i] === '"') {
        i++; // opening "
        while (i < len && text[i] !== '"') i++;
        if (i < len) i++; // closing "
      } else if (i < len && text[i] === "'") {
        i++; // opening '
        while (i < len && text[i] !== "'") i++;
        if (i < len) i++; // closing '
      } else {
        // Unquoted value – consume until whitespace or >
        while (i < len && !WHITESPACE.test(text[i]) && text[i] !== '>') i++;
      }
    }
  }

  return i;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns an array of { keyword: string, range: vscode.Range } for every
 * recognised HTML token in `document`.
 *
 * `keyword` is prefixed with its category:
 *   - "tag:<name>"   for non-void element tag names
 *   - "void:<name>"  for void element tag names
 *   - "attr:<name>"  for attribute names
 */
function scanHtmlTokens(document) {
  const text = document.getText();
  const results = [];
  const len = text.length;
  let i = 0;

  while (i < len) {
    // Only care about '<' – everything else is plain text content.
    if (text[i] !== '<') { i++; continue; }

    i++; // skip '<'
    if (i >= len) break;

    // ── HTML comment  <!-- … --> ──────────────────────────────────────────
    if (text[i] === '!' && text[i + 1] === '-' && text[i + 2] === '-') {
      const end = text.indexOf('-->', i + 3);
      i = end === -1 ? len : end + 3;
      continue;
    }

    // ── DOCTYPE / CDATA / processing instruction ──────────────────────────
    if (text[i] === '!' || text[i] === '?') {
      while (i < len && text[i] !== '>') i++;
      if (i < len) i++;
      continue;
    }

    // ── Closing tag? ──────────────────────────────────────────────────────
    const isClosing = text[i] === '/';
    if (isClosing) i++;

    // ── Tag name ──────────────────────────────────────────────────────────
    const nameStart = i;
    while (i < len && WORD_CHAR.test(text[i])) i++;
    if (i === nameStart) continue; // e.g. "< " or "<>"

    const tagName = text.substring(nameStart, i).toLowerCase();

    // ── Closing tags – skip entirely (no emoji on </tag>) ──────────────────
    if (isClosing) {
      while (i < len && text[i] !== '>') i++;
      if (i < len) i++;
      continue;
    }

    // ── Opening tags only – emit tag name match ───────────────────────────
    const isVoid     = HTML_VOID_EMOJI_MAP.hasOwnProperty(tagName);
    const isKnownTag = HTML_TAG_EMOJI_MAP.hasOwnProperty(tagName);

    if (isVoid || isKnownTag) {
      results.push({
        keyword: `${isVoid ? 'void' : 'tag'}:${tagName}`,
        range: new vscode.Range(
          document.positionAt(nameStart),
          document.positionAt(i),
        ),
      });
    }

    // ── Opening tag – scan attributes ─────────────────────────────────────
    i = _scanAttributes(text, i, len, document, results);

    // Skip self-closing '/' and closing '>'
    if (i < len && text[i] === '/') i++;
    if (i < len && text[i] === '>') i++;

    // ── Raw-text elements: skip content of <script> and <style> ───────────
    if (tagName === 'script' || tagName === 'style') {
      const closeTag = `</${tagName}`;
      const closeIdx = text.toLowerCase().indexOf(closeTag, i);
      if (closeIdx !== -1) {
        i = closeIdx; // loop will process the closing tag next
      } else {
        i = len; // unclosed script/style – skip to end
      }
    }
  }

  return results;
}

module.exports = { scanHtmlTokens };
