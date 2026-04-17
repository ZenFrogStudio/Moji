// Detects React components in JSX/TSX files and returns their boundaries.
// Identifies function components, class components, and arrow function components
// that return JSX, tracking the full span from declaration to closing brace.

const vscode = require('vscode');

// Languages that support JSX/React
const JSX_LANGUAGES = new Set(['javascriptreact', 'typescriptreact']);

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
    const ch = text[i];

    // Skip single-line comments
    if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }

    // Skip block comments
    if (ch === '/' && text[i + 1] === '*') {
      i += 2;
      while (i + 1 < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    // Skip string literals
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      i++;
      while (i < text.length) {
        if (text[i] === '\\') { i += 2; continue; }
        if (text[i] === quote) { i++; break; }
        // Skip template literal expressions
        if (quote === '`' && text[i] === '$' && text[i + 1] === '{') {
          i += 2;
          let nestLevel = 1;
          while (i < text.length && nestLevel > 0) {
            if (text[i] === '{') nestLevel++;
            else if (text[i] === '}') nestLevel--;
            i++;
          }
          continue;
        }
        i++;
      }
      continue;
    }

    // Check for component patterns
    if (ch === 'f' || ch === 'c' || ch === 'C' || ch === 'k' || ch === 'e') {
      // Potential component start: function, class, const, export
      const remaining = text.substring(i);
      
      // Function component: function ComponentName(...)
      const funcMatch = remaining.match(/^function\s+([A-Z][a-zA-Z0-9_]*)\s*\(/);
      if (funcMatch) {
        const componentName = funcMatch[1];
        const openBracePos = findOpeningBrace(text, i + funcMatch[0].length);
        if (openBracePos !== -1) {
          const startLine = charToLine(openBracePos);
          const endLine = findMatchingCloseBrace(text, openBracePos, charToLine);
          if (endLine !== -1 && endLine > startLine) {
            components.push({ startLine, endLine, name: componentName });
          }
        }
        i += funcMatch[0].length;
        continue;
      }

      // Class component: class ComponentName extends ...
      const classMatch = remaining.match(/^class\s+([A-Z][a-zA-Z0-9_]*)\s*(extends|\{)/);
      if (classMatch) {
        const componentName = classMatch[1];
        const openBracePos = findOpeningBrace(text, i + classMatch[0].length - (classMatch[2] === '{' ? 1 : 0));
        if (openBracePos !== -1) {
          const startLine = charToLine(openBracePos);
          const endLine = findMatchingCloseBrace(text, openBracePos, charToLine);
          if (endLine !== -1 && endLine > startLine) {
            components.push({ startLine, endLine, name: componentName });
          }
        }
        i += classMatch[0].length;
        continue;
      }

      // Arrow function component: const ComponentName = (...) => { ... }
      // or: const ComponentName = () => ( <JSX> )
      // Optional (?:\s*:[^=]+)? handles TypeScript type annotations (e.g. const Card: React.FC<Props> = ...)
      const constMatch = remaining.match(/^const\s+([A-Z][a-zA-Z0-9_]*)(?:\s*:[^=]+)?\s*=\s*(\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/);
      if (constMatch) {
        const componentName = constMatch[1];
        const arrowEnd = i + constMatch[0].length;
        
        // Find the body - could be block { ... } or expression ( ... )
        let bodyStart = arrowEnd;
        while (bodyStart < text.length && (text[bodyStart] === ' ' || text[bodyStart] === '\t')) {
          bodyStart++;
        }

        let startLine, endLine;
        
        if (text[bodyStart] === '{') {
          // Block body
          startLine = charToLine(bodyStart);
          endLine = findMatchingCloseBrace(text, bodyStart, charToLine);
        } else if (text[bodyStart] === '(') {
          // Expression body with parentheses
          startLine = charToLine(bodyStart);
          endLine = findMatchingCloseParen(text, bodyStart, charToLine);
        } else {
          // Expression body without parentheses (single expression)
          startLine = charToLine(bodyStart);
          endLine = findExpressionEnd(text, bodyStart, charToLine);
        }

        if (endLine !== -1 && endLine >= startLine) {
          components.push({ startLine, endLine, name: componentName });
        }
        
        i += constMatch[0].length;
        continue;
      }

      // Export default function component
      const exportFuncMatch = remaining.match(/^export\s+default\s+function\s+([A-Z][a-zA-Z0-9_]*)\s*\(/);
      if (exportFuncMatch) {
        const componentName = exportFuncMatch[1];
        const openBracePos = findOpeningBrace(text, i + exportFuncMatch[0].length);
        if (openBracePos !== -1) {
          const startLine = charToLine(openBracePos);
          const endLine = findMatchingCloseBrace(text, openBracePos, charToLine);
          if (endLine !== -1 && endLine > startLine) {
            components.push({ startLine, endLine, name: componentName });
          }
        }
        i += exportFuncMatch[0].length;
        continue;
      }
    }

    i++;
  }

  return components;
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

/**
 * Find the line number of the matching closing brace
 */
function findMatchingCloseBrace(text, openBracePos, charToLine) {
  let depth = 1;
  let i = openBracePos + 1;
  
  while (i < text.length && depth > 0) {
    const ch = text[i];
    
    // Skip strings
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      i++;
      while (i < text.length) {
        if (text[i] === '\\') { i += 2; continue; }
        if (text[i] === quote) { i++; break; }
        i++;
      }
      continue;
    }
    
    // Skip comments
    if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      i += 2;
      while (i + 1 < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    
    if (depth === 0) return charToLine(i);
    
    i++;
  }
  
  return -1;
}

/**
 * Find the line number of the matching closing parenthesis
 */
function findMatchingCloseParen(text, openParenPos, charToLine) {
  let depth = 1;
  let i = openParenPos + 1;
  
  while (i < text.length && depth > 0) {
    const ch = text[i];
    
    // Skip strings
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      i++;
      while (i < text.length) {
        if (text[i] === '\\') { i += 2; continue; }
        if (text[i] === quote) { i++; break; }
        i++;
      }
      continue;
    }
    
    // Skip comments
    if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      i += 2;
      while (i + 1 < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    
    if (depth === 0) return charToLine(i);
    
    i++;
  }
  
  return -1;
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