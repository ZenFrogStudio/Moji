// Single source of truth for keyword → emoji mapping.
// Every emoji is unique and chosen to represent the keyword's intent.

const KEYWORD_EMOJI_MAP = {
  'await':      '⏳',   // hourglass       – waiting for a promise
  'break':      '🛑',   // stop sign       – exit loop / switch
  'case':       '📋',   // clipboard       – pattern match branch
  'catch':      '🥅',   // goal net        – catch thrown errors
  'class':      '🧑‍🏫',   // teacher         – class declaration
  'const':      '🔒',   // lock            – immutable binding
  'continue':   '⏭️',   // skip forward    – next iteration
  'debugger':   '🐛',   // bug             – breakpoint
  'default':    '📌',   // pin             – fallback branch
  'delete':     '🗑️',   // wastebasket     – remove property
  'do':         '🔄',   // arrows circle   – do-while loop
  'else':       '↪️',    // right curve     – alternative branch
  'enum':       '📊',   // bar chart       – enumeration (reserved)
  'export':     '🚀',   // rocket          – module export
  'extends':    '🧬',   // DNA             – inheritance
  'finally':    '🏁',   // chequered flag  – guaranteed cleanup
  'for':        '🔁',   // repeat arrows   – for loop
  'function':   '⚡',   // lightning       – function declaration
  'if':         '❓',   // question mark   – conditional
  'import':     '📥',   // inbox tray      – module import
  'in':         '📍',   // pin location    – property membership
  'instanceof': '🔎',   // magnify glass   – prototype check
  'new':        '✨',   // sparkles        – instance creation
  'return':     '🔙',   // back arrow      – return value
  'super':      '🦸',   // superhero       – parent class ref
  'switch':     '🎚️',   // level slider    – multi-branch
  'this':       '👆',   // point up        – current context
  'throw':      '💥',   // collision       – throw error
  'try':        '🤞',   // crossed fingers – attempt block
  'typeof':     '🏷️',   // label           – type check
  'var':        '📝',   // memo            – variable (legacy)
  'void':       '🕳️',   // hole            – discard value
  'while':      '🔂',   // repeat once     – while loop
  'with':       '🤝',   // handshake       – with statement
  'yield':      '🌾',   // rice sheaf      – generator yield
};

module.exports = { KEYWORD_EMOJI_MAP };
