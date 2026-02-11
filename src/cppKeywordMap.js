// Single source of truth for C++ keyword → emoji mapping.
// Every emoji is unique and chosen to represent the keyword's intent.

const CPP_KEYWORD_EMOJI_MAP = {
  // Control Flow (inherited from C)
  'if':           '❓',   // question mark    – conditional
  'else':         '↪️',   // right curve      – alternative branch
  'switch':       '🎚️',   // level slider     – multi-branch
  'case':         '📋',   // clipboard        – switch case branch
  'default':      '📌',   // pin              – fallback branch
  'for':          '🔁',   // repeat arrows    – for loop
  'while':        '🔂',   // repeat once      – while loop
  'do':           '🔄',   // arrows circle    – do-while loop
  'break':        '🛑',   // stop sign        – exit loop/switch
  'continue':     '⏭️',   // skip forward     – next iteration
  'goto':         '🚀',   // rocket           – unconditional jump
  'return':       '🔙',   // back arrow       – return value

  // Data Types (inherited from C + C++ additions)
  'int':          '🔢',   // numbers          – integer type
  'char':         '🔤',   // letters          – character type
  'float':        '🎈',   // balloon          – floating point
  'double':       '🎭',   // masks            – double precision
  'void':         '🕳️',   // hole             – no type/value
  'short':        '📏',   // ruler            – short integer
  'long':         '📐',   // triangle ruler   – long integer
  'signed':       '➕',   // plus sign        – signed type
  'unsigned':     '➖',   // minus sign       – unsigned type
  'bool':         '🔘',   // radio button     – boolean type
  'true':         '✅',   // check mark       – boolean true
  'false':        '❌',   // cross mark       – boolean false
  'nullptr':      '🚫',   // prohibited       – null pointer
  'auto':         '🤖',   // robot            – type inference
  'wchar_t':      '🔠',   // capital letters  – wide character
  'char16_t':     '🔡',   // letters          – UTF-16 character
  'char32_t':     '🔣',   // symbols          – UTF-32 character

  // Type Qualifiers & Storage (inherited from C)
  'const':        '🔒',   // lock             – constant/immutable
  'volatile':     '⚠️',   // warning          – volatile memory
  'static':       '🏛️',   // classical bldg   – static storage
  'extern':       '🌐',   // globe            – external linkage
  'register':     '⚡',   // lightning        – register storage
  'mutable':      '🔓',   // unlocked         – mutable member
  'constexpr':    '🔐',   // locked key       – compile-time const
  'consteval':    '🗝️',   // key              – immediate function
  'constinit':    '🔑',   // key              – constant init
  'inline':       '📎',   // paperclip        – inline function

  // Classes & OOP
  'class':        '🏛️',   // classical bldg   – class definition
  'struct':       '🏗️',   // construction     – structure type
  'union':        '🤝',   // handshake        – union type
  'enum':         '📊',   // bar chart        – enumeration
  'public':       '🌍',   // globe            – public access
  'private':      '🔐',   // locked           – private access
  'protected':    '🛡️',   // shield           – protected access
  'virtual':      '👻',   // ghost            – virtual function
  'override':     '🔄',   // arrows           – override method
  'final':        '🏁',   // checkered flag   – prevent override
  'friend':       '🤗',   // hugging          – friend access
  'this':         '👆',   // point up         – current object
  'explicit':     '❗',   // exclamation      – explicit conversion

  // Templates
  'template':     '📝',   // memo             – template definition
  'typename':     '🏷️',   // label            – type parameter
  'concept':      '💡',   // bulb             – concept definition
  'requires':     '📋',   // clipboard        – requires clause

  // Namespaces & Modules
  'namespace':    '📁',   // folder           – namespace
  'using':        '🔗',   // link             – using directive

  // Memory Management
  'new':          '✨',   // sparkles         – allocate memory
  'delete':       '🗑️',   // wastebasket      – deallocate memory
  'sizeof':       '📐',   // ruler            – size operator
  'alignof':      '📏',   // ruler            – alignment
  'alignas':      '↔️',   // left right arrow – align specifier
  'typedef':      '🏷️',   // label            – type alias

  // Exception Handling
  'try':          '🤞',   // crossed fingers  – try block
  'catch':        '🥅',   // goal net         – catch exception
  'throw':        '💥',   // collision        – throw exception
  'noexcept':     '🛡️',   // shield           – no exceptions

  // Type Casting
  'static_cast':      '🎯',   // target       – static cast
  'dynamic_cast':     '🔮',   // crystal ball – dynamic cast
  'const_cast':       '🔓',   // unlocked     – const cast
  'reinterpret_cast': '🔀',   // shuffle      – reinterpret cast

  // Operators
  'operator':     '🔧',   // wrench           – operator overload
  'typeid':       '🆔',   // ID               – type identification
  'decltype':     '🔍',   // magnifier        – declared type

  // Other Keywords
  'asm':          '⚙️',   // gear             – inline assembly
  'export':       '📦',   // package          – module export
  'import':       '📥',   // inbox            – module import (C++20)
  'module':       '🧩',   // puzzle           – module (C++20)
  'co_await':     '⏳',   // hourglass        – coroutine await
  'co_return':    '↩️',   // return arrow     – coroutine return
  'co_yield':     '🌾',   // wheat            – coroutine yield
};

module.exports = { CPP_KEYWORD_EMOJI_MAP };
