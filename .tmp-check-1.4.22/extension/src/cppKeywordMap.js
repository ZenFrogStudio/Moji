// Single source of truth for C++ keyword → emoji mapping.
// Every emoji is unique and chosen to represent the keyword's intent.

const CPP_KEYWORD_EMOJI_MAP = {
  // Control Flow (inherited from C)
  'if':           '❓',   // question mark    – conditional
  'else':         '↪️',   // right curve      – alternative branch
  'switch':       '🎚️',   // level slider     – multi-branch
  'case':         '📋',   // clipboard        – switch case branch
  'default':      '📌',   // pin              – fallback branch
  'for':          '🔂',   // repeat once      – for loop
  'while':        '🔁',   // repeat arrows    – while loop
  'do':           '♾️',   // infinity         – do-while loop
  'break':        '🛑',   // stop sign        – exit loop/switch
  'continue':     '⏭️',   // skip forward     – next iteration
  'goto':         '✈️',   // airplane         – unconditional jump
  'return':       '🔙',   // back arrow       – return value

  // Data Types (inherited from C + C++ additions)
  'int':          '#️⃣',   // hash key         – integer type
  'char':         '🔤',   // letters          – character type
  'float':        '🎈',   // balloon          – floating point
  'double':       '🎭',   // masks            – double precision
  'void':         '🕳️',   // hole             – no type/value
  'short':        '🤏',   // pinching hand    – short integer
  'long':         '📏',   // ruler            – long integer
  'signed':       '➕',   // plus sign        – signed type
  'unsigned':     '➖',   // minus sign       – unsigned type
  'bool':         '🔘',   // radio button     – boolean type
  'true':         '👍',   // thumbs up        – boolean true
  'false':        '👎',   // thumbs down      – boolean false
  'nullptr':      '🚫',   // prohibited       – null pointer
  'auto':         '🚗',   // car              – type inference
  'wchar_t':      '🔠',   // capital letters  – wide character
  'char16_t':     '🔡',   // letters          – UTF-16 character
  'char32_t':     '🔣',   // symbols          – UTF-32 character

  // Type Qualifiers & Storage (inherited from C)
  'const':        '🔒',   // lock             – constant/immutable
  'volatile':     '⚠️',   // warning          – volatile memory
  'static':       '🧱',   // brick            – static storage
  'extern':       '💼',   // briefcase        – external linkage
  'register':     '⚡',   // lightning        – register storage
  'mutable':      '🪸',   // coral            – mutable member
  'constexpr':    '🔐',   // locked key       – compile-time const
  'consteval':    '🗝️',   // key              – immediate function
  'constinit':    '🔑',   // key              – constant init
  'inline':       '📎',   // paperclip        – inline function

  // Classes & OOP
  'class':        '⭐',    // star             – class definition
  'struct':       '🏛️',   // classical bldg   – structure type
  'union':        '🤝',   // handshake        – union type
  'enum':         '📊',   // bar chart        – enumeration
  'public':       '🌍',   // globe            – public access
  'private':      '🤫',   // shushing         – private access
  'protected':    '🛡️',   // shield           – protected access
  'virtual':      '🤖',   // robot            – virtual function
  'override':     '✏️',   // pencil           – override method
  'final':        '🏁',   // checkered flag   – prevent override
  'friend':       '🤗',   // hugging          – friend access
  'this':         '☝🏻',  // index pointing up – current object
  'explicit':     '❗',   // exclamation      – explicit conversion

  // Templates
  'template':     '📝',   // memo             – template definition
  'typename':     '🧬',   // dna              – type parameter
  'concept':      '🎓',   // graduation cap   – concept definition
  'requires':     '👮',   // guard            – requires clause

  // Namespaces & Modules
  'namespace':    '🏢',   // office building  – namespace
  'using':        '🔗',   // link             – using directive

  // Memory Management
  'new':          '✨',   // sparkles         – allocate memory
  'delete':       '🗑️',   // wastebasket      – deallocate memory
  'sizeof':       '🐘',   // elephant         – size operator
  'alignof':      '📐',   // triangular ruler – alignment
  'alignas':      '🧲',   // magnet           – align specifier
  'typedef':      '🏷️',   // label            – type alias

  // Exception Handling
  'try':          '🤞',   // crossed fingers  – try block
  'catch':        '🥅',   // goal net         – catch exception
  'throw':        '💥',   // collision        – throw exception
  'noexcept':     '👌',   // ok hand          – no exceptions

  // Type Casting
  'static_cast':      '🎯',   // target       – static cast
  'dynamic_cast':     '🔮',   // crystal ball – dynamic cast
  'const_cast':       '🔓',   // unlocked     – const cast
  'reinterpret_cast': '🃏',   // joker        – reinterpret cast

  // Operators
  'operator':     '🔧',   // wrench           – operator overload
  'typeid':       '🆔',   // ID               – type identification
  'decltype':     '🔍',   // magnifier        – declared type

  // Other Keywords
  'asm':          '🧮',   // abacus           – inline assembly
  'export':       '🚀',   // rocket           – module export
  'import':       '📥',   // inbox            – module import (C++20)
  'module':       '🧩',   // puzzle           – module (C++20)
  'co_await':     '⏳',   // hourglass        – coroutine await
  'co_return':    '🫧',   // bubbles          – coroutine return
  'co_yield':     '🌾',   // wheat            – coroutine yield
};

module.exports = { CPP_KEYWORD_EMOJI_MAP };
