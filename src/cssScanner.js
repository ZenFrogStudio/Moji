// CSS token scanner for emoji decorations
// Optimized with pre-compiled regex patterns

const vscode = require('vscode');
const {
  CSS_ATRULE_EMOJI_MAP,
  CSS_LAYOUT_EMOJI_MAP,
  CSS_BOX_EMOJI_MAP,
  CSS_VISUAL_EMOJI_MAP,
  CSS_PSEUDO_EMOJI_MAP,
  CSS_VALUE_EMOJI_MAP,
} = require('./cssKeywordMap');

// Pre-compile regex patterns for better performance
const COMPILED_PATTERNS = {
  atRules: {},
  layout: {},
  box: {},
  visual: {},
  pseudo: {},
  values: {
    important: /!important\b/g,
    none: /:\s*none\s*(?:;|!|})/g,
    auto: /:\s*auto\s*(?:;|!|})/g,
    inherit: /:\s*inherit\s*(?:;|!|})/g,
  },
};

// Build at-rule patterns
for (const rule of Object.keys(CSS_ATRULE_EMOJI_MAP)) {
  COMPILED_PATTERNS.atRules[rule] = new RegExp(`@${rule}\\b`, 'g');
}

// Build layout property patterns
for (const prop of Object.keys(CSS_LAYOUT_EMOJI_MAP)) {
  COMPILED_PATTERNS.layout[prop] = new RegExp(`(?:^|[{;\\s])\\s*(${prop})\\s*:`, 'gm');
}

// Build box model property patterns (with variant support)
for (const prop of Object.keys(CSS_BOX_EMOJI_MAP)) {
  COMPILED_PATTERNS.box[prop] = new RegExp(`(?:^|[{;\\s])\\s*(${prop}(?:-[a-z]+)?)\\s*:`, 'gm');
}

// Build visual property patterns (with variant support)
for (const prop of Object.keys(CSS_VISUAL_EMOJI_MAP)) {
  COMPILED_PATTERNS.visual[prop] = new RegExp(`(?:^|[{;\\s])\\s*(${prop}(?:-[a-z-]+)?)\\s*:`, 'gm');
}

// Build pseudo-class patterns
for (const pseudo of Object.keys(CSS_PSEUDO_EMOJI_MAP)) {
  COMPILED_PATTERNS.pseudo[pseudo] = new RegExp(`:${pseudo}\\b`, 'g');
}

/**
 * Scan a CSS document for tokens that should receive emoji decorations.
 * @param {vscode.TextDocument} document
 * @returns {Array<{keyword: string, range: vscode.Range}>}
 */
function scanCssTokens(document) {
  const text = document.getText();
  const matches = [];

  // Helper to add matches from a regex
  const addMatches = (regex, keyword, getStartOffset = null) => {
    regex.lastIndex = 0; // Reset regex state
    let match;
    while ((match = regex.exec(text)) !== null) {
      const startOffset = getStartOffset ? getStartOffset(match) : match.index;
      const endOffset = getStartOffset
        ? startOffset + keyword.split(':')[1].length
        : match.index + match[0].length;
      matches.push({
        keyword,
        range: new vscode.Range(
          document.positionAt(startOffset),
          document.positionAt(endOffset)
        ),
      });
    }
  };

  // Scan at-rules
  for (const [rule, regex] of Object.entries(COMPILED_PATTERNS.atRules)) {
    addMatches(regex, `cssAtRule:${rule}`);
  }

  // Scan layout properties
  for (const [prop, regex] of Object.entries(COMPILED_PATTERNS.layout)) {
    addMatches(regex, `cssLayout:${prop}`, (match) => match.index + match[0].indexOf(prop));
  }

  // Scan box model properties
  for (const [prop, regex] of Object.entries(COMPILED_PATTERNS.box)) {
    addMatches(regex, `cssBox:${prop}`, (match) => match.index + match[0].indexOf(match[1]));
  }

  // Scan visual properties
  for (const [prop, regex] of Object.entries(COMPILED_PATTERNS.visual)) {
    addMatches(regex, `cssVisual:${prop}`, (match) => match.index + match[0].indexOf(match[1]));
  }

  // Scan pseudo-classes
  for (const [pseudo, regex] of Object.entries(COMPILED_PATTERNS.pseudo)) {
    addMatches(regex, `cssPseudo:${pseudo}`);
  }

  // Scan values
  if (CSS_VALUE_EMOJI_MAP['important']) {
    addMatches(COMPILED_PATTERNS.values.important, 'cssValue:important');
  }

  for (const value of ['none', 'auto', 'inherit']) {
    if (CSS_VALUE_EMOJI_MAP[value]) {
      const regex = COMPILED_PATTERNS.values[value];
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const valueStart = match.index + match[0].indexOf(value);
        matches.push({
          keyword: `cssValue:${value}`,
          range: new vscode.Range(
            document.positionAt(valueStart),
            document.positionAt(valueStart + value.length)
          ),
        });
      }
    }
  }

  return matches;
}

module.exports = { scanCssTokens };
