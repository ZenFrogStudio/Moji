// Single source of truth for C# keyword → emoji mapping.
// Every emoji is unique and chosen to represent the keyword's intent.

const CSHARP_KEYWORD_EMOJI_MAP = {
  // Control Flow
  'if':           '❓',   // question mark    – conditional
  'else':         '↪️',   // right curve      – alternative branch
  'switch':       '🎚️',   // level slider     – multi-branch
  'case':         '📋',   // clipboard        – switch case
  'default':      '📌',   // pin              – default case
  'for':          '🔂',   // repeat once      – for loop
  'foreach':      '🔄',   // counterclockwise – foreach loop
  'while':        '🔁',   // repeat arrows    – while loop
  'do':           '♾️',   // infinity         – do-while loop
  'break':        '🛑',   // stop sign        – exit loop
  'continue':     '⏭️',   // skip forward     – next iteration
  'goto':         '✈️',   // airplane         – unconditional jump
  'return':       '🔙',   // back arrow       – return value
  'yield':        '🌾',   // wheat            – yield return
  'when':         '🕐',   // clock face       – pattern guard

  // Data Types
  'int':          '#️⃣',   // hash key         – integer
  'long':         '📏',   // ruler            – long integer
  'short':        '🤏',   // pinching hand    – short integer
  'byte':         '🔣',   // symbols          – byte
  'sbyte':        '🔤',   // letters          – signed byte
  'uint':         '➕',   // plus             – unsigned int
  'ulong':        '➖',   // minus            – unsigned long
  'ushort':       '🔸',   // small orange diamond – unsigned short
  'float':        '🎈',   // balloon          – floating point
  'double':       '🎭',   // masks            – double precision
  'decimal':      '💰',   // money bag        – decimal
  'bool':         '🔘',   // radio button     – boolean
  'char':         '🔡',   // letters          – character
  'string':       '📝',   // memo             – string type
  'object':       '🪆',   // nesting doll     – object type
  'void':         '🕳️',   // hole             – no return
  'var':          '🔖',   // bookmark         – implicit type
  'dynamic':      '🌊',   // wave             – dynamic type

  // Boolean Literals
  'true':         '👍',   // thumbs up        – true
  'false':        '👎',   // thumbs down      – false
  'null':         '🚫',   // prohibited       – null value

  // Access Modifiers
  'public':       '🌍',   // globe            – public access
  'private':      '🤫',   // shushing         – private access
  'protected':    '🛡️',   // shield           – protected access
  'internal':     '🏘️',   // houses           – internal access

  // Type Modifiers
  'static':       '🧱',   // brick            – static member
  'readonly':     '👁️‍🗨️',   // eye speech       – read only
  'const':        '🔒',   // lock             – constant
  'volatile':     '⚠️',   // warning          – volatile
  'sealed':       '🔐',   // locked           – sealed class
  'abstract':     '🖌️',   // paintbrush       – abstract
  'virtual':      '🤖',   // robot            – virtual method
  'override':     '✏️',   // pencil           – override method
  'extern':       '💼',   // briefcase        – external
  'unsafe':       '☢️',   // radioactive      – unsafe code
  'partial':      '🪬',   // amulet           – partial class

  // Class & Type Definitions
  'class':        '⭐',    // star             – class
  'struct':       '🏛️',   // classical bldg   – struct
  'interface':    '🔌',   // plug             – interface
  'enum':         '📊',   // bar chart        – enumeration
  'record':       '🎥',   // video camera     – record type
  'delegate':     '📨',   // envelope         – delegate
  'event':        '🎉',   // party            – event

  // OOP Keywords
  'this':         '☝🏻',  // index pointing up – current instance
  'base':         '👇',   // point down       – base class
  'new':          '✨',   // sparkles         – new instance

  // Exception Handling
  'try':          '🤞',   // crossed fingers  – try block
  'catch':        '🥅',   // goal net         – catch exception
  'finally':      '🏆',   // trophy           – finally block
  'throw':        '💥',   // collision        – throw exception

  // Async/Await
  'async':        '⏰',   // alarm clock      – async method
  'await':        '⏳',   // hourglass        – await task

  // Namespace & Using
  'namespace':    '🏢',   // office building  – namespace
  'using':        '🔗',   // link             – using directive

  // Type Operations
  'typeof':       '🏷️',   // label            – type of
  'sizeof':       '📐',   // ruler            – size of
  'is':           '🪪',   // id card          – is type
  'as':           '📛',   // name badge       – as type
  'nameof':       '🪧',   // placard          – name of

  // Parameter Modifiers
  'ref':          '📎',   // paperclip        – reference
  'out':          '📤',   // outbox           – out parameter
  'in':           '🕵️',   // detective        – in parameter
  'params':       '🎛️',   // control knobs    – params array

  // Memory & Safety
  'stackalloc':   '🗃️',   // card box         – stack allocate
  'fixed':        '📍',   // pin              – fixed pointer
  'lock':         '🧵',   // thread           – thread lock
  'checked':      '✔️',   // check            – checked context
  'unchecked':    '✖️',   // cross            – unchecked context

  // LINQ Keywords
  'from':         '🚢',   // ship             – LINQ from
  'where':        '🔎',   // magnifier        – LINQ where
  'select':       '✅',   // check            – LINQ select
  'orderby':      '📶',   // signal           – LINQ order by
  'group':        '👥',   // group            – LINQ group
  'join':         '🤝',   // handshake        – LINQ join
  'let':          '🪣',   // bucket           – LINQ let
  'into':         '➡️',   // arrow            – LINQ into
  'ascending':    '⬆️',   // up arrow         – ascending order
  'descending':   '⬇️',   // down arrow       – descending order
  'on':           '🔛',   // on               – join condition
  'equals':       '🟰',   // equals sign      – equality
  'by':           '🗂️',   // card index dividers – group by

  // Property Accessors
  'get':          '📖',   // open book        – getter
  'set':          '🍽️',   // plate            – setter
  'init':         '🌱',   // seedling         – init-only setter
  'value':        '💎',   // gem              – property value
  'add':          '🔔',   // bell             – event add
  'remove':       '🔕',   // bell slash       – event remove

  // Modern C# Keywords
  'with':         '🍻',   // clinking beers   – with expression
  'required':     '❗',   // exclamation      – required member
  'global':       '🌐',   // globe            – global using
};

module.exports = { CSHARP_KEYWORD_EMOJI_MAP };
