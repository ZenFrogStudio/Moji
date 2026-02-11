// Single source of truth for Java keyword → emoji mapping.
// Every emoji is unique and chosen to represent the keyword's intent.

const JAVA_KEYWORD_EMOJI_MAP = {
  // ── Control Flow ────────────────────────────────────────────────────────
  'if':           '❓',   // question mark    – conditional
  'else':         '↪️',   // right curve      – alternative branch
  'switch':       '🎚️',   // level slider     – multi-branch
  'case':         '📋',   // clipboard        – switch case
  'default':      '📌',   // pin              – default case
  'for':          '🔁',   // repeat arrows    – for loop
  'while':        '🔂',   // repeat once      – while loop
  'do':           '🔄',   // arrows           – do-while loop
  'break':        '🛑',   // stop sign        – exit loop
  'continue':     '⏭️',   // skip forward     – next iteration
  'return':       '🔙',   // back arrow       – return value
  'yield':        '🌾',   // wheat            – switch yield

  // ── Data Types ──────────────────────────────────────────────────────────
  'int':          '🔢',   // numbers          – integer
  'long':         '📐',   // ruler            – long integer
  'short':        '📏',   // ruler            – short integer
  'byte':         '🔣',   // symbols          – byte
  'float':        '🎈',   // balloon          – floating point
  'double':       '🎭',   // masks            – double precision
  'char':         '🔤',   // letters          – character
  'boolean':      '🔘',   // radio button     – boolean
  'void':         '🕳️',   // hole             – no return
  'var':          '🏷️',   // label            – local variable type inference

  // ── Boolean & Null Literals ─────────────────────────────────────────────
  'true':         '✅',   // check mark       – true
  'false':        '❌',   // cross mark       – false
  'null':         '🚫',   // prohibited       – null value

  // ── Access Modifiers ────────────────────────────────────────────────────
  'public':       '🌍',   // globe            – public access
  'private':      '🔐',   // locked key       – private access
  'protected':    '🛡️',   // shield           – protected access

  // ── Class & Type Modifiers ──────────────────────────────────────────────
  'class':        '🏛️',   // classical bldg   – class
  'interface':    '🔌',   // plug             – interface
  'enum':         '📊',   // bar chart        – enumeration
  'record':       '📀',   // disc             – record type
  'abstract':     '🎨',   // art palette      – abstract
  'final':        '🏁',   // checkered flag   – final/immutable
  'static':       '🏛️',   // classical bldg   – static member
  'sealed':       '🔐',   // locked           – sealed class
  'permits':      '✅',   // check            – permits clause

  // ── OOP Keywords ────────────────────────────────────────────────────────
  'extends':      '🧬',   // dna              – inheritance
  'implements':   '✅',   // check mark       – implements interface
  'new':          '✨',   // sparkles         – instance creation
  'this':         '👆',   // point up         – current instance
  'super':        '🦸',   // superhero        – parent class ref
  'instanceof':   '🔎',   // magnifier        – type check

  // ── Exception Handling ──────────────────────────────────────────────────
  'try':          '🤞',   // crossed fingers  – try block
  'catch':        '🥅',   // goal net         – catch exception
  'finally':      '🏁',   // checkered flag   – finally block
  'throw':        '💥',   // collision        – throw exception
  'throws':       '⚠️',   // warning          – throws declaration

  // ── Package & Import ────────────────────────────────────────────────────
  'package':      '📦',   // package          – package declaration
  'import':       '📥',   // inbox tray       – import

  // ── Concurrency ─────────────────────────────────────────────────────────
  'synchronized': '🔒',   // lock             – synchronized block
  'volatile':     '⚠️',   // warning          – volatile field
  'transient':    '💨',   // wind             – transient field

  // ── Other Modifiers ─────────────────────────────────────────────────────
  'native':       '⚙️',   // gear             – native method
  'strictfp':     '📐',   // ruler            – strict floating point

  // ── Assertions ──────────────────────────────────────────────────────────
  'assert':       '🔍',   // magnifier        – assertion

  // ── Modules (Java 9+) ───────────────────────────────────────────────────
  'module':       '🧩',   // puzzle piece     – module
  'requires':     '📋',   // clipboard        – requires
  'exports':      '📤',   // outbox           – exports
  'opens':        '🔓',   // unlocked         – opens
  'uses':         '🔧',   // wrench           – uses
  'provides':     '🎁',   // gift             – provides
  'with':         '🤝',   // handshake        – with
  'to':           '➡️',   // arrow            – to
};

module.exports = { JAVA_KEYWORD_EMOJI_MAP };
