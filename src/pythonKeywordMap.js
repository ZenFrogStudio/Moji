// Single source of truth for Python keyword → emoji mapping.
// Every emoji is unique and chosen to represent the keyword's intent.

const PYTHON_KEYWORD_EMOJI_MAP = {
  // Literals / Constants
  'True':       '✅',   // check mark       – boolean true
  'False':      '❌',   // cross mark       – boolean false
  'None':       '🚫',   // prohibited       – null/nothing

  // Control Flow
  'if':         '❓',   // question mark    – conditional
  'elif':       '🔀',   // shuffle arrows   – else if branch
  'else':       '↪️',   // right curve      – alternative branch
  'for':        '🔁',   // repeat arrows    – for loop
  'while':      '🔂',   // repeat once      – while loop
  'break':      '🛑',   // stop sign        – exit loop
  'continue':   '⏭️',   // skip forward     – next iteration
  'pass':       '⏩',   // fast forward     – placeholder/no-op
  'match':      '🎯',   // bullseye         – pattern matching (3.10+)
  'case':       '📋',   // clipboard        – match case branch

  // Functions & Classes
  'def':        '⚡',   // lightning        – function definition
  'return':     '🔙',   // back arrow       – return value
  'yield':      '🌾',   // rice sheaf       – generator yield
  'lambda':     'λ',    // lambda letter    – anonymous function
  'class':      '🏛️',   // classical bldg   – class declaration

  // Exception Handling
  'try':        '🤞',   // crossed fingers  – attempt block
  'except':     '🥅',   // goal net         – catch exception
  'finally':    '🏁',   // chequered flag   – guaranteed cleanup
  'raise':      '💥',   // collision        – raise exception
  'assert':     '🔍',   // magnifying glass – assertion check

  // Imports
  'import':     '📥',   // inbox tray       – module import
  'from':       '📤',   // outbox tray      – import source
  'as':         '🏷️',   // label            – alias

  // Variable Scope
  'global':     '🌐',   // globe            – global scope
  'nonlocal':   '📡',   // satellite dish   – enclosing scope

  // Operators / Logic
  'and':        '🤝',   // handshake        – logical and
  'or':         '🔀',   // shuffle          – logical or (shared with elif contextually)
  'not':        '🚷',   // no pedestrians   – logical negation
  'in':         '📍',   // pin location     – membership test
  'is':         '🔗',   // link             – identity test

  // Async
  'async':      '🔮',   // crystal ball     – async definition
  'await':      '⏳',   // hourglass        – await coroutine

  // Context Management
  'with':       '🎁',   // gift box         – context manager

  // Deletion
  'del':        '🗑️',   // wastebasket      – delete reference
};

module.exports = { PYTHON_KEYWORD_EMOJI_MAP };
