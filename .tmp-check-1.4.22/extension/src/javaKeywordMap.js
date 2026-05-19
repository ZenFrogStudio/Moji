// Single source of truth for Java keyword → emoji mapping.
// Every emoji is unique and chosen to represent the keyword's intent.

const JAVA_KEYWORD_EMOJI_MAP = {
  // ── Control Flow ────────────────────────────────────────────────────────
  'if':           '❓',   // question mark    – conditional
  'else':         '↪️',   // right curve      – alternative branch
  'switch':       '🎚️',   // level slider     – multi-branch
  'case':         '📋',   // clipboard        – switch case
  'default':      '📌',   // pin              – default case
  'for':          '🔂',   // repeat once      – for loop
  'while':        '🔁',   // repeat arrows    – while loop
  'do':           '♾️',   // infinity         – do-while loop
  'break':        '🛑',   // stop sign        – exit loop
  'continue':     '⏭️',   // skip forward     – next iteration
  'return':       '🔙',   // back arrow       – return value
  'yield':        '🌾',   // wheat            – switch yield

  // ── Data Types ──────────────────────────────────────────────────────────
  'int':          '#️⃣',   // hash key         – integer
  'long':         '📏',   // ruler            – long integer
  'short':        '🤏',   // pinching hand    – short integer
  'byte':         '🔣',   // symbols          – byte
  'float':        '🎈',   // balloon          – floating point
  'double':       '👬',   // Men holding      – double precision
  'char':         '🔤',   // letters          – character
  'boolean':      '🔘',   // radio button     – boolean
  'void':         '🕳️',   // hole             – no return
  'var':          '🔖',   // bookmark         – local variable type inference (matches C# var)

  // ── Boolean & Null Literals ─────────────────────────────────────────────
  'true':         '👍',   // thumbs up        – true
  'false':        '👎',   // thumbs down      – false
  'null':         '🚫',   // prohibited       – null value

  // ── Access Modifiers ────────────────────────────────────────────────────
  'public':       '🌍',   // globe            – public access
  'private':      '🤫',   // shushing         – private access
  'protected':    '🛡️',   // shield           – protected access

  // ── Class & Type Modifiers ──────────────────────────────────────────────
  'class':        '⭐',    // star             – class
  'interface':    '🔌',   // plug             – interface
  'enum':         '📊',   // bar chart        – enumeration
  'record':       '🎥',   // video camera     – record type
  'abstract':     '🖌️',   // paintbrush       – abstract
  'final':        '🏁',   // checkered flag   – final/immutable
  'static':       '🧱',   // brick            – static member
  'sealed':       '🔐',   // locked           – sealed class
  'permits':      '✅',   // check            – permits clause

  // ── OOP Keywords ────────────────────────────────────────────────────────
  'extends':      '🪜',   // ladder           – inheritance
  'implements':   '🛠️',   // tools            – implements interface
  'new':          '✨',   // sparkles         – instance creation
  'this':         '☝🏻',  // index pointing up – current instance
  'super':        '🌟',   // star             – parent class ref
  'instanceof':   '🔎',   // magnifier        – type check

  // ── Exception Handling ──────────────────────────────────────────────────
  'try':          '🤞',   // crossed fingers  – try block
  'catch':        '🥅',   // goal net         – catch exception
  'finally':      '🏆',   // trophy           – finally block
  'throw':        '💥',   // collision        – throw exception
  'throws':       '🚨',   // siren            – throws declaration

  // ── Package & Import ────────────────────────────────────────────────────
  'package':      '📦',   // package          – package declaration
  'import':       '📥',   // inbox tray       – import

  // ── Concurrency ─────────────────────────────────────────────────────────
  'synchronized': '🔒',   // lock             – synchronized block
  'volatile':     '⚠️',   // warning          – volatile field
  'transient':    '💨',   // wind             – transient field

  // ── Other Modifiers ─────────────────────────────────────────────────────
  'native':       '🏕️',   // camping          – native method
  'strictfp':     '📐',   // ruler            – strict floating point

  // ── Assertions ──────────────────────────────────────────────────────────
  'assert':       '🔍',   // magnifier        – assertion

  // ── Modules (Java 9+) ───────────────────────────────────────────────────
  'module':       '🧩',   // puzzle piece     – module
  'requires':     '👮',   // guard            – requires
  'exports':      '🚀',   // rocket           – exports
  'opens':        '🚪',   // door             – opens
  'uses':         '🔧',   // wrench           – uses
  'provides':     '🎁',   // gift             – provides
  'with':         '🍻',   // clinking beers   – with
  'to':           '➡️',   // arrow            – to
};

module.exports = { JAVA_KEYWORD_EMOJI_MAP };
