// Detects React components in JSX/TSX files and returns their boundaries.
// Identifies function components, class components, and arrow function components
// that return JSX, tracking the full span from declaration to closing brace.

const vscode = require('vscode');

// Languages that support JSX/React
const JSX_LANGUAGES = new Set(['javascriptreact', 'typescriptreact']);
const COMPONENT_START_CHARS = new Set(['f', 'c', 'C', 'e']);
const FUNCTION_COMPONENT_RE = /^function\s+([A-Z][a-zA-Z0-9_]*)\s*\(/;
const CLASS_COMPONENT_RE = /^class\s+([A-Z][a-zA-Z0-9_]*)\s+extends\b/;
const ARROW_COMPONENT_RE = /^const\s+([A-Z][a-zA-Z0-9_]*)(?:\s*:[^=]+)?\s*=\s*(\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/;
const EXPORT_DEFAULT_FUNCTION_COMPONENT_RE = /^export\s+default\s+function\s+([A-Z][a-zA-Z0-9_]*)\s*\(/;

/**
 * Detects React components in a document.
 * @param {vscode.TextDocument} document
 * @returns {Array<{startLine: number, endLine: number, name: string}>}
 */
function detectReactComponents(document) {
  if (!JSX_LANGUAGES.has(document.languageId)) {
    return [];
  }

  const text = document.getText();
  const components = [];

  // Build line start indices for char-to-line conversion
  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') lineStarts.push(i + 1);
  }

  const charToLine = (charIndex) => {
    let lo = 0, hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= charIndex) lo = mid; else hi = mid - 1;
    }
    return lo;
  };

  let i = 0;
  while (i < text.length) {
    const skipped = skipTriviaAndStrings(text, i, text.length, true);
    if (skipped !== i) {
      i = skipped;
      continue;
    }

    const ch = text[i];

    // Check for component patterns
    if (COMPONENT_START_CHARS.has(ch)) {
      // Potential component start: function, class, const, export
      const remaining = text.substring(i);

      // Function component: function ComponentName(...)
      const funcMatch = remaining.match(FUNCTION_COMPONENT_RE);
      if (funcMatch) {
        maybeAddBraceWrappedComponent(
          components,
          funcMatch[1],
          text,
          i + funcMatch[0].length - 1,
          charToLine
        );
        i += funcMatch[0].length;
        continue;
      }

      // Class component: class ComponentName extends ...
      const classMatch = remaining.match(CLASS_COMPONENT_RE);
      if (classMatch) {
        maybeAddBraceWrappedComponent(
          components,
          classMatch[1],
          text,
          i + classMatch[0].length,
          charToLine
        );
        i += classMatch[0].length;
        continue;
      }

      // Arrow function component: const ComponentName = (...) => { ... }
      // or: const ComponentName = () => ( <JSX> )
      // Optional (?:\s*:[^=]+)? handles TypeScript type annotations (e.g. const Card: React.FC<Props> = ...)
      const constMatch = remaining.match(ARROW_COMPONENT_RE);
      if (constMatch) {
        const range = findArrowComponentRange(text, i + constMatch[0].length, charToLine);
        if (range) {
          components.push({ ...range, name: constMatch[1] });
        }

        i += constMatch[0].length;
        continue;
      }

      // Export default function component
      const exportFuncMatch = remaining.match(EXPORT_DEFAULT_FUNCTION_COMPONENT_RE);
      if (exportFuncMatch) {
        maybeAddBraceWrappedComponent(
          components,
          exportFuncMatch[1],
          text,
          i + exportFuncMatch[0].length - 1,
          charToLine
        );
        i += exportFuncMatch[0].length;
        continue;
      }
    }

    i++;
  }

  return components;
}

function maybeAddBraceWrappedComponent(components, name, text, searchPos, charToLine) {
  const range = findBraceWrappedComponentRange(text, searchPos, charToLine);
  if (range) {
    components.push({ ...range, name });
  }
}

function findBraceWrappedComponentRange(text, searchPos, charToLine) {
  const openBracePos = findOpeningBrace(text, searchPos);
  if (openBracePos === -1) {
    return null;
  }

  const closeBracePos = findMatchingCloseBracePos(text, openBracePos);
  if (closeBracePos === -1) {
    return null;
  }

  const startLine = charToLine(openBracePos);
  const endLine = charToLine(closeBracePos);
  if (endLine <= startLine || !hasReturnedJsx(text, openBracePos + 1, closeBracePos)) {
    return null;
  }

  return { startLine, endLine };
}

function findArrowComponentRange(text, arrowEnd, charToLine) {
  let bodyStart = arrowEnd;
  while (bodyStart < text.length && /\s/.test(text[bodyStart])) {
    bodyStart++;
  }

  if (bodyStart >= text.length) {
    return null;
  }

  if (text[bodyStart] === '{') {
    const closeBracePos = findMatchingCloseBracePos(text, bodyStart);
    if (closeBracePos === -1 || !hasReturnedJsx(text, bodyStart + 1, closeBracePos)) {
      return null;
    }

    return {
      startLine: charToLine(bodyStart),
      endLine: charToLine(closeBracePos),
    };
  }

  if (text[bodyStart] === '(') {
    const closeParenPos = findMatchingCloseParenPos(text, bodyStart);
    if (closeParenPos === -1 || !hasJsxInRange(text, bodyStart + 1, closeParenPos)) {
      return null;
    }

    return {
      startLine: charToLine(bodyStart),
      endLine: charToLine(closeParenPos),
    };
  }

  if (!hasJsxInRange(text, bodyStart, lineEndIndex(text, bodyStart))) {
    return null;
  }

  return {
    startLine: charToLine(bodyStart),
    endLine: findExpressionEnd(text, bodyStart, charToLine),
  };
}

/**
 * Find the position of the opening brace after a pattern
 */
function findOpeningBrace(text, startPos) {
  let i = startPos;
  let parenDepth = 0;
  
  while (i < text.length) {
    const ch = text[i];
    
    if (ch === '(') parenDepth++;
    else if (ch === ')') {
      if (parenDepth === 0) return -1;
      parenDepth--;
    }
    else if (ch === '{' && parenDepth === 0) return i;
    else if (ch === ';') return -1; // End of statement without body
    
    i++;
  }
  
  return -1;
}

function findMatchingCloseBracePos(text, openBracePos) {
  return findMatchingClose(text, openBracePos, '{', '}');
}

function findMatchingCloseParenPos(text, openParenPos) {
  return findMatchingClose(text, openParenPos, '(', ')');
}

function findMatchingClose(text, openPos, openChar, closeChar) {
  let depth = 1;
  let i = openPos + 1;

  while (i < text.length && depth > 0) {
    const skipped = skipTriviaAndStrings(text, i, text.length, true);
    if (skipped !== i) {
      i = skipped;
      continue;
    }

    const ch = text[i];
    if (ch === openChar) depth++;
    else if (ch === closeChar) depth--;

    if (depth === 0) return i;

    i++;
  }

  return -1;
}

function hasReturnedJsx(text, startPos, endPos) {
  let i = startPos;
  while (i < endPos) {
    i = skipTriviaAndStrings(text, i, endPos);
    if (i >= endPos) break;

    if (text.startsWith('return', i) && isWordBoundary(text[i - 1]) && isWordBoundary(text[i + 6])) {
      let exprStart = i + 6;
      while (exprStart < endPos && /\s/.test(text[exprStart])) exprStart++;
      if (text[exprStart] === '(') {
        const closeParenPos = findMatchingCloseParenPos(text, exprStart);
        if (closeParenPos !== -1 && hasJsxInRange(text, exprStart + 1, Math.min(closeParenPos, endPos))) {
          return true;
        }
      } else if (hasJsxInRange(text, exprStart, Math.min(lineEndIndex(text, exprStart), endPos))) {
        return true;
      }
    }

    i++;
  }

  return false;
}

function hasJsxInRange(text, startPos, endPos) {
  let i = startPos;
  while (i < endPos) {
    i = skipTriviaAndStrings(text, i, endPos);
    if (i >= endPos) break;

    if (text[i] === '<' && isLikelyJsxStart(text, i)) {
      return true;
    }

    i++;
  }

  return false;
}

function isLikelyJsxStart(text, i) {
  const next = text[i + 1];
  if (next === '>' || /[A-Za-z]/.test(next || '')) return true;
  return next === '/' && /[A-Za-z]/.test(text[i + 2] || '');
}

function skipTriviaAndStrings(text, i, endPos, trackTemplateExpressions = false) {
  if (text[i] === '/' && text[i + 1] === '/') {
    while (i < endPos && text[i] !== '\n') i++;
    return i;
  }

  if (text[i] === '/' && text[i + 1] === '*') {
    i += 2;
    while (i + 1 < endPos && !(text[i] === '*' && text[i + 1] === '/')) i++;
    return Math.min(i + 2, endPos);
  }

  if (text[i] === '"' || text[i] === "'" || text[i] === '`') {
    const quote = text[i];
    i++;
    while (i < endPos) {
      if (text[i] === '\\') { i += 2; continue; }
      if (text[i] === quote) { i++; break; }
      if (trackTemplateExpressions && quote === '`' && text[i] === '$' && text[i + 1] === '{') {
        i = skipTemplateExpression(text, i + 2, endPos);
        continue;
      }
      i++;
    }
  }

  return i;
}

function skipTemplateExpression(text, i, endPos) {
  let depth = 1;

  while (i < endPos && depth > 0) {
    const skipped = skipTriviaAndStrings(text, i, endPos, true);
    if (skipped !== i) {
      i = skipped;
      continue;
    }

    if (text[i] === '{') depth++;
    else if (text[i] === '}') depth--;
    i++;
  }

  return i;
}

function isWordBoundary(ch) {
  return !ch || !/[A-Za-z0-9_$]/.test(ch);
}

function lineEndIndex(text, startPos) {
  const end = text.indexOf('\n', startPos);
  return end === -1 ? text.length : end;
}

/**
 * Find the end line of an expression (for arrow functions without braces/parens)
 */
function findExpressionEnd(text, startPos, charToLine) {
  let i = startPos;
  let line = charToLine(startPos);
  let parenDepth = 0;
  let braceDepth = 0;
  
  while (i < text.length) {
    const ch = text[i];
    
    if (ch === '\n' && parenDepth === 0 && braceDepth === 0) {
      // Check if next line continues the expression
      const nextLine = line + 1;
      const nextLineStart = text.indexOf('\n', i + 1) + 1;
      const nextLineText = text.substring(nextLineStart, text.indexOf('\n', nextLineStart));
      
      // If next line starts with operators or continues logically, continue
      if (nextLineText && /^[\s]*(\.|&&|\|\||\?|\:|\+|-|\*|\/|\=|\&|\||\^)/.test(nextLineText)) {
        line = nextLine;
        i++;
        continue;
      }
      
      return line;
    }
    
    if (ch === '(') parenDepth++;
    else if (ch === ')') parenDepth--;
    else if (ch === '{') braceDepth++;
    else if (ch === '}') braceDepth--;
    
    if (ch === '\n') line++;
    
    i++;
  }
  
  return line;
}

module.exports = { detectReactComponents };
