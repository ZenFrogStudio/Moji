// Single source of truth for HTML token → emoji mappings.
// Three categories: tag names, void elements, and attribute names.
// Each emoji is chosen to represent the token's semantic purpose.

// ── Non-void HTML element tag names ──────────────────────────────────────────

const HTML_TAG_EMOJI_MAP = {
  // Structural
  'html':       '🌐',  // globe           – root document element
  'head':       '🗣️',  // brain           – document metadata container
  'body':       '💀',  // bone            – document body

  // Generic containers
  'div':        '🧱',  // package         – generic block container
  'span':       '🦇',  // bookmark        – generic inline container

  // Text content
  'p':          '📄',  // page            – paragraph
  'a':          '🖇️',  // link            – anchor / hyperlink
  'h1':         '1️⃣',  // keycap one      – heading level 1
  'h2':         '2️⃣',  // keycap two      – heading level 2
  'h3':         '3️⃣',  // keycap three    – heading level 3
  'h4':         '4️⃣',  // keycap four     – heading level 4
  'h5':         '5️⃣',  // keycap five     – heading level 5
  'h6':         '6️⃣',  // keycap six      – heading level 6

  // Lists
  'ul':         '📝',  // memo            – unordered list
  'ol':         '🔢',  // numbers         – ordered list
  'li':         '▪️',   // black square    – list item

  // Table
  'table':      '📊',  // bar chart       – data table
  'tr':         '➡️',   // right arrow     – table row
  'td':         '📎',  // paperclip       – table data cell
  'th':         '🏷️',  // label           – table header cell
  'thead':      '🔝',  // top arrow       – table head group
  'tbody':      '📋',  // clipboard       – table body group
  'tfoot':      '🔚',  // end arrow       – table foot group

  // Forms
  'form':       '📑',  // bookmark tabs   – input form
  'button':     '🔘',  // radio button    – clickable button
  'select':     '🛒',  // open folder     – dropdown select
  'option':     '☑️',   // check box       – select option
  'textarea':   '✏️',   // pencil          – multiline text input
  'label':      '🪧',  // placard         – form control label

  // Semantic sections
  'nav':        '🧭',  // compass         – navigation section
  'header':     '📰',  // newspaper       – page header
  'footer':     '👟',  // running shoe    – page footer
  'main':       '🏠',  // house           – main content area
  'section':    '📐',  // triangular ruler – thematic section
  'article':    '📓',  // notebook        – self-contained article
  'aside':      '📌',  // pushpin         – tangential content

  // Embedded content & scripting
  'script':     '📜',  // lightning       – executable script
  'style':      '🎨',  // artist palette  – embedded stylesheet
  'title':      '👑',  // crown           – document title
  'video':      '🎬',  // clapper board   – video player
  'audio':      '🔊',  // speaker high    – audio player
  'canvas':     '🖌️',  // paintbrush      – drawing surface
  'iframe':     '🪟',  // window          – nested browsing context
  'picture':    '📸',  // camera flash    – responsive image container

  // Text-level semantics
  'pre':        '📟',  // pager           – preformatted text
  'code':       '💻',  // laptop          – code fragment
  'strong':     '💪',  // flexed bicep    – strong importance
  'em':         '✍️',   // writing hand    – stress emphasis
  'blockquote': '🗨️',  // speech bubble   – extended quotation
  'mark':       '🖍️',  // crayon          – highlighted text
  'del':        '❌',  // cross mark      – deleted text
  'ins':        '➕',  // plus sign       – inserted text
  'small':      '🔹',  // small diamond   – side comment
  'sub':        '⬇️',  // down arrow      – subscript
  'sup':        '⬆️',  // up arrow        – superscript

  // Interactive & misc
  'figure':     '🎞️',  // film frames     – figure with optional caption
  'figcaption': '💬',  // speech balloon  – figure caption
  'details':    '🔍',  // magnifying glass– disclosure widget
  'summary':    '📖',  // open book       – disclosure summary
  'dialog':     '💭',  // thought balloon – dialog box
  'template':   '🧩',  // puzzle piece    – content template
  'slot':       '🔌',  // plug            – shadow DOM slot
  'fieldset':   '🔲',  // black square btn– field grouping
  'legend':     '🏆',  // trophy          – fieldset caption
  'output':     '📤',  // outbox tray     – calculation result
  'progress':   '⏳',  // hourglass       – progress indicator
  'meter':      '📏',  // straight ruler  – scalar gauge
  'datalist':   '📃',  // page with curl  – predefined options
  'map':        '🗺️',  // world map       – image map
};

// ── Void (self-closing) HTML elements ────────────────────────────────────────

const HTML_VOID_EMOJI_MAP = {
  'img':        '🖼️',  // framed picture  – image
  'input':      '⌨️',   // keyboard        – form input
  'br':         '↩️',   // return arrow    – line break
  'hr':         '➖',   // minus sign      – horizontal rule / thematic break
  'meta':       'ℹ️',   // info            – document metadata
  'link':       '⛓️',   // chains          – external resource link
  'source':     '📡',  // satellite dish  – media source
  'embed':      '📼',  // videocassette   – embedded content
  'area':       '📍',  // pin             – image map clickable area
  'track':      '🎵',  // musical note    – text track (captions / subtitles)
  'wbr':        '✂️',   // scissors        – word break opportunity
  'col':        '🗄️',  // file cabinet    – table column
  'base':       '⚓',  // anchor          – base URL
};

// ── HTML attribute names ─────────────────────────────────────────────────────

const HTML_ATTR_EMOJI_MAP = {
  'class':       '🧑‍🏫',  // classical bldg  – CSS class name
  'id':          '🆔',  // id button       – unique identifier
  'href':        '🌍',  // globe europe    – hyperlink reference
  'src':         '📥',  // inbox tray      – source URL
  'alt':         '🗣️',  // speaking head   – alternative text
  'style':       '🎭',  // performing arts – inline CSS styles
  'type':        '🔤',  // abc             – input / mime type
  'name':        '📛',  // name badge      – element name
  'value':       '💎',  // gem             – element value
  'placeholder': '💡',  // light bulb      – placeholder hint
  'action':      '🎬',  // direct hit      – form submission URL
  'method':      '📮',  // postbox         – HTTP method
  'target':      '🎯',  // bow and arrow   – link target
  'rel':         '🤝',  // handshake       – link relationship
  'width':       '↔️',   // left-right arrow– element width
  'height':      '↕️',   // up-down arrow   – element height
  'disabled':    '🚫',  // prohibited      – disabled state
  'required':    '❗',  // exclamation     – required field
  'checked':     '✅',  // check mark      – checked state
  'readonly':    '🔒',  // locked padlock  – read-only field
  'hidden':      '👻',  // ghost           – hidden element
  'autofocus':   '🔦',  // flashlight      – automatic focus
  'defer':       '⏱️',   // stopwatch       – deferred script loading
  'async':       '🔄',  // counterclockwise– asynchronous loading
  'charset':     '🔠',  // input latin     – character encoding
  'lang':        '🌎',  // globe americas  – language code
  'role':        '🎪',  // circus tent     – ARIA role
  'tabindex':    '#️⃣',  // hash key        – tab order index
  'for':         '🔁',  // repeat          – associated control id
  'loading':     '⏰',  // alarm clock     – lazy / eager loading
  'content':     '📜',  // scroll          – meta content value
};

module.exports = { HTML_TAG_EMOJI_MAP, HTML_VOID_EMOJI_MAP, HTML_ATTR_EMOJI_MAP };
