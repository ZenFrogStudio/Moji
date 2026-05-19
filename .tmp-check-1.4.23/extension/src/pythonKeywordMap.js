// Single source of truth for Python keyword → emoji mapping.
// Every emoji is unique and chosen to represent the keyword's intent.

const PYTHON_KEYWORD_EMOJI_MAP = {
  // Literals / Constants
  'True':       '👍',   // check mark       – boolean true
  'False':      '👎',   // cross mark       – boolean false
  'None':       '🚫',   // prohibited       – null/nothing

  // Control Flow
  'if':         '❓',   // question mark    – conditional
  'elif':       '⁉️',   // exclamation question – else if branch
  'else':       '↪️',   // right curve      – alternative branch
  'for':        '🔂',   // repeat once      – for loop
  'while':      '🔁',   // repeat arrows    – while loop
  'break':      '🛑',   // stop sign        – exit loop
  'continue':   '⏭️',   // skip forward     – next iteration
  'pass':       '⏩',   // fast forward     – placeholder/no-op
  'match':      '🎯',   // bullseye         – pattern matching (3.10+)
  'case':       '📋',   // clipboard        – match case branch

  // Functions & Classes
  'def':        '⚙️',   // gear             – function definition
  'return':     '🔙',   // back arrow       – return value
  'yield':      '🌾',   // rice sheaf       – generator yield
  'lambda':     'λ',    // lambda letter    – anonymous function
  'class':      '⭐',    // star             – class declaration

  // Exception Handling
  'try':        '🤞',   // crossed fingers  – attempt block
  'except':     '🥅',   // goal net         – catch exception
  'finally':    '🏆',   // trophy           – guaranteed cleanup
  'raise':      '💥',   // collision        – raise exception
  'assert':     '🔍',   // magnifying glass – assertion check

  // Imports
  'import':     '📥',   // inbox tray       – module import
  'from':       '🚢',   // ship             – import source
  'as':         '📛',   // name badge       – alias

  // Variable Scope
  'global':     '🌐',   // globe            – global scope
  'nonlocal':   '📡',   // satellite dish   – enclosing scope

  // Operators / Logic
  'and':        '➕',   // plus             – logical and
  'or':         '⚖️',   // scales           – logical or
  'not':        '➖',   // minus            – logical negation
  'in':         '🕵️',   // detective        – membership test
  'is':         '🪪',   // id card          – identity test

  // Async
  'async':      '⏰',   // alarm clock      – async definition
  'await':      '⏳',   // hourglass        – await coroutine

  // Context Management
  'with':       '🍻',   // clinking beers   – context manager

  // Deletion
  'del':        '🗑️',   // wastebasket      – delete reference
};

module.exports = { PYTHON_KEYWORD_EMOJI_MAP };
