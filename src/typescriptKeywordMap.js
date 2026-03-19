// Single source of truth for TypeScript keyword → emoji mapping.
// Includes TypeScript-specific keywords beyond JavaScript.
// Every emoji is unique and chosen to represent the keyword's intent.

const TYPESCRIPT_KEYWORD_EMOJI_MAP = {
  // ── JavaScript Keywords (inherited) ─────────────────────────────────────
  'await':        '⏳',   // hourglass       – waiting for a promise
  'break':        '🛑',   // stop sign       – exit loop / switch
  'case':         '📋',   // clipboard       – pattern match branch
  'catch':        '🥅',   // goal net        – catch thrown errors
  'class':        '⭐',    // star            – class declaration
  'const':        '🔒',   // lock            – immutable binding
  'continue':     '⏭️',   // skip forward    – next iteration
  'debugger':     '🐛',   // bug             – breakpoint
  'default':      '📌',   // pin             – fallback branch
  'delete':       '🗑️',   // wastebasket     – remove property
  'do':           '♾️',   // infinity        – do-while loop
  'else':         '↪️',   // right curve     – alternative branch
  'export':       '🚀',   // rocket          – module export
  'extends':      '🪜',   // ladder          – inheritance
  'finally':      '🏆',   // trophy          – guaranteed cleanup
  'for':          '🔂',   // repeat once     – for loop
  'function':     '⚙️',   // gear            – function declaration
  'if':           '❓',   // question mark   – conditional
  'import':       '📥',   // inbox tray      – module import
  'in':           '🕵️',   // detective       – property membership
  'instanceof':   '🔎',   // magnifier       – prototype check
  'new':          '✨',   // sparkles        – instance creation
  'return':       '🔙',   // back arrow      – return value
  'super':        '🌟',   // star            – parent class ref
  'switch':       '🎚️',   // level slider    – multi-branch
  'this':         '☝🏻',  // index pointing up – current context
  'throw':        '💥',   // collision       – throw error
  'try':          '🤞',   // crossed fingers – attempt block
  'typeof':       '🏷️',   // label           – type check
  'var':          '📝',   // memo            – variable (legacy)
  'void':         '🕳️',   // hole            – discard value
  'while':        '🔁',   // repeat arrows   – while loop
  'with':         '🍻',   // clinking beers  – with statement
  'yield':        '🌾',   // wheat           – generator yield

  // ── TypeScript Type Keywords ────────────────────────────────────────────
  'type':         '📐',   // triangular ruler – type alias
  'interface':    '🔌',   // plug            – interface definition
  'enum':         '📊',   // bar chart       – enumeration
  'namespace':    '🏢',   // office building – namespace
  'module':       '🧩',   // puzzle piece    – module declaration
  'declare':      '📢',   // megaphone       – ambient declaration
  'abstract':     '🖌️',   // paintbrush      – abstract class/method
  'readonly':     '👁️‍🗨️',   // eye speech      – readonly property
  'implements':   '🛠️',   // tools           – implements interface

  // ── Access Modifiers ────────────────────────────────────────────────────
  'public':       '🌍',   // globe           – public access
  'private':      '🤫',   // shushing        – private access
  'protected':    '🛡️',   // shield          – protected access

  // ── Type Operators & Keywords ───────────────────────────────────────────
  'keyof':        '🔑',   // key             – keyof operator
  'infer':        '🔮',   // crystal ball    – type inference
  'never':        '🙅‍♂️',   // no gesture      – never type
  'unknown':      '❔',   // question        – unknown type
  'any':          '🐣',   // cyclone         – any type
  'is':           '🪪',   // id card         – type guard
  'asserts':      '❗',   // exclamation     – assertion function
  'as':           '📛',   // name badge      – type assertion
  'satisfies':    '🏅',   // medal           – type satisfies constraint

  // ── Boolean & Null Literals ─────────────────────────────────────────────
  'true':         '👍',   // thumbs up       – true
  'false':        '👎',   // cross mark      – false
  'null':         '🚫',   // prohibited      – null value
  'undefined':    '😕',   // confused face   – undefined

  // ── Async Keywords ──────────────────────────────────────────────────────
  'async':        '⏰',   // alarm clock     – async function

  // ── Other TypeScript Keywords ───────────────────────────────────────────
  'get':          '📖',   // open book       – getter
  'set':          '🍽️',   // plate           – setter
  'static':       '🧱',   // brick           – static member
  'constructor':  '🏗️',   // construction    – constructor
  'override':     '✏️',   // pencil          – override method
  'out':          '↗️',   // outgoing arrow  – variance modifier
  'using':        '🔗',   // link            – using declaration
};

module.exports = { TYPESCRIPT_KEYWORD_EMOJI_MAP };
