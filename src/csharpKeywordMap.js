// Single source of truth for C# keyword → emoji mapping.
// Every emoji is unique and chosen to represent the keyword's intent.

const CSHARP_KEYWORD_EMOJI_MAP = {
  // Control Flow
  'if':           '❓',   // question mark    – conditional
  'else':         '↪️',   // right curve      – alternative branch
  'switch':       '🎚️',   // level slider     – multi-branch
  'case':         '📋',   // clipboard        – switch case
  'default':      '📌',   // pin              – default case
  'for':          '🔁',   // repeat arrows    – for loop
  'foreach':      '🔂',   // repeat once      – foreach loop
  'while':        '🔄',   // arrows circle    – while loop
  'do':           '🔃',   // arrows           – do-while loop
  'break':        '🛑',   // stop sign        – exit loop
  'continue':     '⏭️',   // skip forward     – next iteration
  'goto':         '🏹',   // bow and arrow    – unconditional jump
  'return':       '🔙',   // back arrow       – return value
  'yield':        '🌾',   // wheat            – yield return
  'when':         '⏰',   // clock            – pattern guard

  // Data Types
  'int':          '🔢',   // numbers          – integer
  'long':         '📐',   // ruler            – long integer
  'short':        '📏',   // ruler            – short integer
  'byte':         '🔣',   // symbols          – byte
  'sbyte':        '🔤',   // letters          – signed byte
  'uint':         '➕',   // plus             – unsigned int
  'ulong':        '➖',   // minus            – unsigned long
  'ushort':       '✖️',   // multiply         – unsigned short
  'float':        '🎈',   // balloon          – floating point
  'double':       '🎭',   // masks            – double precision
  'decimal':      '💰',   // money bag        – decimal
  'bool':         '🔘',   // radio button     – boolean
  'char':         '🔡',   // letters          – character
  'string':       '📝',   // memo             – string type
  'object':       '📦',   // package          – object type
  'void':         '🕳️',   // hole             – no return
  'var':          '🏷️',   // label            – implicit type
  'dynamic':      '🌊',   // wave             – dynamic type

  // Boolean Literals
  'true':         '✅',   // check mark       – true
  'false':        '❌',   // cross mark       – false
  'null':         '🚫',   // prohibited       – null value

  // Access Modifiers
  'public':       '🌍',   // globe            – public access
  'private':      '🔐',   // locked           – private access
  'protected':    '🛡️',   // shield           – protected access
  'internal':     '🏠',   // house            – internal access

  // Type Modifiers
  'static':       '🏛️',   // classical bldg   – static member
  'readonly':     '🔒',   // lock             – read only
  'const':        '🔏',   // locked pen       – constant
  'volatile':     '⚠️',   // warning          – volatile
  'sealed':       '🔐',   // locked           – sealed class
  'abstract':     '🎨',   // art palette      – abstract
  'virtual':      '👻',   // ghost            – virtual method
  'override':     '🔄',   // arrows           – override method
  'extern':       '🌐',   // globe            – external
  'unsafe':       '☢️',   // radioactive      – unsafe code
  'partial':      '🧩',   // puzzle piece     – partial class

  // Class & Type Definitions
  'class':        '🧑‍🏫',   // teacher          – class
  'struct':       '🏗️',   // construction     – struct
  'interface':    '🔌',   // plug             – interface
  'enum':         '📊',   // bar chart        – enumeration
  'record':       '📀',   // disc             – record type
  'delegate':     '📨',   // envelope         – delegate
  'event':        '🎉',   // party            – event

  // OOP Keywords
  'this':         '👆',   // point up         – current instance
  'base':         '👇',   // point down       – base class
  'new':          '✨',   // sparkles         – new instance

  // Exception Handling
  'try':          '🤞',   // crossed fingers  – try block
  'catch':        '🥅',   // goal net         – catch exception
  'finally':      '🏁',   // checkered flag   – finally block
  'throw':        '💥',   // collision        – throw exception

  // Async/Await
  'async':        '🔮',   // crystal ball     – async method
  'await':        '⏳',   // hourglass        – await task

  // Namespace & Using
  'namespace':    '📁',   // folder           – namespace
  'using':        '🔗',   // link             – using directive

  // Type Operations
  'typeof':       '🏷️',   // label            – type of
  'sizeof':       '📐',   // ruler            – size of
  'is':           '🔍',   // magnifier        – is type
  'as':           '🔀',   // shuffle          – as type
  'nameof':       '📛',   // name badge       – name of

  // Parameter Modifiers
  'ref':          '📎',   // paperclip        – reference
  'out':          '📤',   // outbox           – out parameter
  'in':           '📥',   // inbox            – in parameter
  'params':       '📋',   // clipboard        – params array

  // Memory & Safety
  'stackalloc':   '🗃️',   // card box         – stack allocate
  'fixed':        '📍',   // pin              – fixed pointer
  'lock':         '🔒',   // lock             – thread lock
  'checked':      '✔️',   // check            – checked context
  'unchecked':    '✖️',   // cross            – unchecked context

  // LINQ Keywords
  'from':         '📤',   // outbox           – LINQ from
  'where':        '🔎',   // magnifier        – LINQ where
  'select':       '✅',   // check            – LINQ select
  'orderby':      '📶',   // signal           – LINQ order by
  'group':        '👥',   // group            – LINQ group
  'join':         '🤝',   // handshake        – LINQ join
  'let':          '📝',   // memo             – LINQ let
  'into':         '➡️',   // arrow            – LINQ into
  'ascending':    '⬆️',   // up arrow         – ascending order
  'descending':   '⬇️',   // down arrow       – descending order
  'on':           '🔛',   // on               – join condition
  'equals':       '⚖️',   // scales           – equality
  'by':           '📌',   // pin              – group by

  // Property Accessors
  'get':          '📖',   // open book        – getter
  'set':          '📝',   // memo             – setter
  'init':         '🎬',   // clapper          – init-only setter
  'value':        '💎',   // gem              – property value
  'add':          '➕',   // plus             – event add
  'remove':       '➖',   // minus            – event remove

  // Modern C# Keywords
  'with':         '🎁',   // gift             – with expression
  'required':     '❗',   // exclamation      – required member
  'global':       '🌐',   // globe            – global using
};

module.exports = { CSHARP_KEYWORD_EMOJI_MAP };
