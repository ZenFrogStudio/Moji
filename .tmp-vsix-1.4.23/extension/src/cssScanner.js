// CSS token scanner for emoji decorations
// Single-pass approach for optimal performance

const vscode = require('vscode');
const {
  CSS_ATRULE_EMOJI_MAP,
  CSS_LAYOUT_EMOJI_MAP,
  CSS_BOX_EMOJI_MAP,
  CSS_VISUAL_EMOJI_MAP,
  CSS_PSEUDO_EMOJI_MAP,
  CSS_VALUE_EMOJI_MAP,
} = require('./cssKeywordMap');

// Build combined token patterns for single-pass scanning
const buildCombinedPattern = () => {
  const patterns = [];
  const tokenMap = new Map();
  let groupIndex = 1;

  // Comments (skip groups) - always come first
  patterns.push('(\\/\\*[\\s\\S]*?\\*\\/)');  // Block comment
  const commentGroups = 1;
  groupIndex += commentGroups;

  // At-rules (@media, @keyframes, etc.)
  const atRules = Object.keys(CSS_ATRULE_EMOJI_MAP);
  if (atRules.length > 0) {
    const atRuleAlt = atRules.join('|');
    patterns.push(`@(${atRuleAlt})\\b`);
    tokenMap.set(groupIndex, { type: 'cssAtRule', map: CSS_ATRULE_EMOJI_MAP });
    groupIndex++;
  }

  // Properties (combined: layout, box, visual)
  const allProps = {
    ...CSS_LAYOUT_EMOJI_MAP,
    ...CSS_BOX_EMOJI_MAP,
    ...CSS_VISUAL_EMOJI_MAP,
  };
  const props = Object.keys(allProps).sort((a, b) => b.length - a.length);
  if (props.length > 0) {
    const propsAlt = props.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    // Match property name at start of declaration (with optional leading whitespace/punctuation)
    patterns.push(`(?:^|[{;\\s])\\s*(${propsAlt})(?:-[a-z-]+)?\\s*:`);
    tokenMap.set(groupIndex, { type: 'cssProperty', map: allProps });
    groupIndex++;
  }

  // Pseudo-classes (:hover, :focus, etc.)
  const pseudos = Object.keys(CSS_PSEUDO_EMOJI_MAP);
  if (pseudos.length > 0) {
    const pseudoAlt = pseudos.join('|');
    patterns.push(`:(${pseudoAlt})\\b`);
    tokenMap.set(groupIndex, { type: 'cssPseudo', map: CSS_PSEUDO_EMOJI_MAP });
    groupIndex++;
  }

  // Values (important, none, auto, inherit)
  const values = Object.keys(CSS_VALUE_EMOJI_MAP);
  if (values.length > 0) {
    // Match values in property context (after colon, before semicolon/brace/important)
    const valueAlt = values.map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    patterns.push(`:\\s*(${valueAlt})\\s*(?:;|!|})`);
    tokenMap.set(groupIndex, { type: 'cssValue', map: CSS_VALUE_EMOJI_MAP });
    groupIndex++;
  }

  // Special case: !important
  if (CSS_VALUE_EMOJI_MAP['important']) {
    patterns.push('(!important)\\b');
    tokenMap.set(groupIndex, { type: 'cssValue', key: 'important' });
    groupIndex++;
  }

  return { regex: new RegExp(patterns.join('|'), 'gm'), tokenMap, commentGroups };
};

// Build pattern once at module load
const { regex: COMBINED_REGEX, tokenMap: TOKEN_MAP, commentGroups: COMMENT_GROUPS } = buildCombinedPattern();

/**
 * Scan a CSS document for tokens that should receive emoji decorations.
 * Single-pass approach for optimal performance.
 * @param {vscode.TextDocument} document
 * @returns {Array<{keyword: string, range: vscode.Range}>}
 */
function scanCssTokens(document) {
  const text = document.getText();
  const matches = [];

  // Reset regex state
  COMBINED_REGEX.lastIndex = 0;

  let match;
  while ((match = COMBINED_REGEX.exec(text)) !== null) {
    // Skip comment group
    if (match[1]) continue;

    // Find which group matched
    for (let i = COMMENT_GROUPS + 1; i < match.length; i++) {
      if (match[i]) {
        const tokenInfo = TOKEN_MAP.get(i);
        if (!tokenInfo) continue;

        let keyword, tokenText;

        if (tokenInfo.key) {
          // Special case (e.g., !important)
          keyword = `${tokenInfo.type}:${tokenInfo.key}`;
          tokenText = match[i];
        } else {
          // Regular token
          tokenText = match[i];
          const baseToken = tokenText.split('-')[0]; // Get base property name
          const mapKey = Object.keys(tokenInfo.map).find(k =>
            tokenText === k || tokenText.startsWith(k + '-')
          ) || baseToken;

          // Determine prefix based on which map it came from
          let prefix = tokenInfo.type;
          if (tokenInfo.type === 'cssProperty') {
            if (CSS_LAYOUT_EMOJI_MAP[mapKey]) prefix = 'cssLayout';
            else if (CSS_BOX_EMOJI_MAP[mapKey]) prefix = 'cssBox';
            else if (CSS_VISUAL_EMOJI_MAP[mapKey]) prefix = 'cssVisual';
          }

          keyword = `${prefix}:${mapKey}`;
        }

        // Calculate precise token position within the match
        const tokenStart = match.index + match[0].indexOf(tokenText);
        const tokenEnd = tokenStart + tokenText.length;

        matches.push({
          keyword,
          range: new vscode.Range(
            document.positionAt(tokenStart),
            document.positionAt(tokenEnd)
          ),
        });

        break; // Only one group can match
      }
    }
  }

  return matches;
}

module.exports = { scanCssTokens };
