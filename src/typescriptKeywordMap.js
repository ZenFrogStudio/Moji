// Single source of truth for TypeScript keyword → emoji mapping.
// Includes TypeScript-specific keywords beyond JavaScript.
// Every emoji is unique and chosen to represent the keyword's intent.

const TYPESCRIPT_KEYWORD_EMOJI_MAP = {
  // ── JavaScript Keywords (inherited) ─────────────────────────────────────
  'await':        '⏳',   // hourglass       – waiting for a promise
  'break':        '🛑',   // stop sign       – exit loop / switch
  'case':         '📋',   // clipboard       – pattern match branch
  'catch':        '🥅',   // goal net        – catch thrown errors
  'class':        '🏛️',   // classical bldg  – class declaration
  'const':        '🔒',   // lock            – immutable binding
  'continue':     '⏭️',   // skip forward    – next iteration
  'debugger':     '🐛',   // bug             – breakpoint
  'default':      '📌',   // pin             – fallback branch
  'delete':       '🗑️',   // wastebasket     – remove property
  'do':           '🔄',   // arrows          – do-while loop
  'else':         '↪️',   // right curve     – alternative branch
  'export':       '📦',   // package         – module export
  'extends':      '🧬',   // dna             – inheritance
  'finally':      '🏁',   // checkered flag  – guaranteed cleanup
  'for':          '🔁',   // repeat arrows   – for loop
  'function':     '⚡',   // lightning       – function declaration
  'if':           '❓',   // question mark   – conditional
  'import':       '📥',   // inbox tray      – module import
  'in':           '📍',   // pin             – property membership
  'instanceof':   '🔎',   // magnifier       – prototype check
  'new':          '✨',   // sparkles        – instance creation
  'return':       '🔙',   // back arrow      – return value
  'super':        '🦸',   // superhero       – parent class ref
  'switch':       '🎚️',   // level slider    – multi-branch
  'this':         '👆',   // point up        – current context
  'throw':        '💥',   // collision       – throw error
  'try':          '🤞',   // crossed fingers – attempt block
  'typeof':       '🏷️',   // label           – type check
  'var':          '📝',   // memo            – variable (legacy)
  'void':         '🕳️',   // hole            – discard value
  'while':        '🔂',   // repeat once     – while loop
  'with':         '🤝',   // handshake       – with statement
  'yield':        '🌾',   // wheat           – generator yield

  // ── TypeScript Type Keywords ────────────────────────────────────────────
  'type':         '📐',   // triangular ruler – type alias
  'interface':    '🔌',   // plug            – interface definition
  'enum':         '📊',   // bar chart       – enumeration
  'namespace':    '📁',   // folder          – namespace
  'module':       '🧩',   // puzzle piece    – module declaration
  'declare':      '📢',   // megaphone       – ambient declaration
  'abstract':     '🎨',   // art palette     – abstract class/method
  'readonly':     '🔏',   // locked pen      – readonly property
  'implements':   '✅',   // check mark      – implements interface

  // ── Access Modifiers ────────────────────────────────────────────────────
  'public':       '🌍',   // globe           – public access
  'private':      '🔐',   // locked key      – private access
  'protected':    '🛡️',   // shield          – protected access

  // ── Type Operators & Keywords ───────────────────────────────────────────
  'keyof':        '🔑',   // key             – keyof operator
  'infer':        '🔮',   // crystal ball    – type inference
  'never':        '🚫',   // prohibited      – never type
  'unknown':      '❔',   // question        – unknown type
  'any':          '🌀',   // cyclone         – any type
  'is':           '🔍',   // magnifier       – type guard
  'asserts':      '❗',   // exclamation     – assertion function
  'as':           '🔀',   // shuffle         – type assertion
  'satisfies':    '✔️',   // check           – satisfies operator

  // ── Boolean & Null Literals ─────────────────────────────────────────────
  'true':         '✅',   // check mark      – true
  'false':        '❌',   // cross mark      – false
  'null':         '🚫',   // prohibited      – null value
  'undefined':    '❓',   // question        – undefined

  // ── Async Keywords ──────────────────────────────────────────────────────
  'async':        '🔮',   // crystal ball    – async function

  // ── Other TypeScript Keywords ───────────────────────────────────────────
  'get':          '📖',   // open book       – getter
  'set':          '📝',   // memo            – setter
  'static':       '🏛️',   // classical bldg  – static member
  'constructor':  '🏗️',   // construction    – constructor
  'override':     '🔄',   // arrows          – override method
  'out':          '📤',   // outbox          – variance modifier
  'using':        '🔗',   // link            – using declaration
};

module.exports = { TYPESCRIPT_KEYWORD_EMOJI_MAP };
