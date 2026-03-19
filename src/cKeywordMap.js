// Single source of truth for C keyword → emoji mapping.
// Every emoji is unique and chosen to represent the keyword's intent.

const C_KEYWORD_EMOJI_MAP = {
  // Control Flow
  'if':         '❓',   // question mark    – conditional
  'else':       '↪️',   // right curve      – alternative branch
  'switch':     '🎚️',   // level slider     – multi-branch
  'case':       '📋',   // clipboard        – switch case branch
  'default':    '📌',   // pin              – fallback branch
  'for':        '🔂',   // repeat once      – for loop
  'while':      '🔁',   // repeat arrows    – while loop
  'do':         '♾️',   // infinity         – do-while loop
  'break':      '🛑',   // stop sign        – exit loop/switch
  'continue':   '⏭️',   // skip forward     – next iteration
  'goto':       '✈️',   // airplane         – unconditional jump
  'return':     '🔙',   // back arrow       – return value

  // Data Types
  'int':        '#️⃣',   // hash key         – integer type
  'char':       '🔤',   // letters          – character type
  'float':      '🎈',   // balloon          – floating point
  'double':     '🎭',   // masks            – double precision
  'void':       '🕳️',   // hole             – no type/value
  'short':      '🤏',   // pinching hand    – short integer
  'long':       '📏',   // ruler            – long integer
  'signed':     '➕',   // plus sign        – signed type
  'unsigned':   '➖',   // minus sign       – unsigned type

  // Type Qualifiers & Storage
  'const':      '🔒',   // lock             – constant/immutable
  'volatile':   '⚠️',   // warning          – volatile memory
  'static':     '🧱',   // brick            – static storage
  'extern':     '💼',   // briefcase        – external linkage
  'register':   '⚡',   // lightning        – register storage
  'auto':       '🚗',   // car              – automatic storage

  // Structures & Types
  'struct':     '🏛️',   // classical bldg   – structure type
  'union':      '🤝',   // handshake        – union type
  'enum':       '📊',   // bar chart        – enumeration
  'typedef':    '🏷️',   // label            – type definition
  'sizeof':     '📐',   // ruler            – size operator
};

module.exports = { C_KEYWORD_EMOJI_MAP };
