// Acts as a single source of truth for HTML token → emoji mappings.
// Three categories: tag names, void elements, and attribute names.
// Each emoji is chosen to represent the token's semantic purpose.

// ── Non-void HTML element tag names ──────────────────────────────────────────

const HTML_TAG_EMOJI_MAP = {
  // Structural
  'html':       '🌐',  // globe           – root document element
  'head':       '🗿',  // brain           – document metadata container
  'body':       '🧍',  // bone            – document body

  // Generic containers
  'div':        '🥃',  // jar             – generic block container
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
  'ul':         '🔵',  // blue circle     – unordered list
  'ol':         '🔢',  // numbers         – ordered list
  'li':         '▪️',   // black square    – list item

  // Table
  'table':      '🧊',  // ice cube        – data table
  'tr':         '➡️',   // right arrow     – table row
  'td':         '💠',  // diamond dot     – table data cell
  'th':         '🧢',  // cap             – table header cell
  'thead':      '🔝',  // top arrow       – table head group
  'tbody':      '📋',  // clipboard       – table body group
  'tfoot':      '🔚',  // end arrow       – table foot group

  // Forms
  'form':       '🗳️',  // ballot box      – input form
  'button':     '🔴',  // red circle      – clickable button
  'select':     '🛒',  // open folder     – dropdown select
  'option':     '☑️',   // check box       – select option
  'textarea':   '🗛',   // text style      – multiline text input
  'label':      '🪧',  // placard         – form control label

  // Semantic sections
  'nav':        '🧭',  // compass         – navigation section
  'header':     '📰',  // newspaper       – page header
  'footer':     '👟',  // running shoe    – page footer
  'main':       '🏠',  // house           – main content area
  'section':    '🗒️',  // notepad         – thematic section
  'article':    '📓',  // notebook        – self-contained article
  'aside':      '🪝',  // hook            – tangential content

  // Embedded content & scripting
  'script':     '⚡',  // lightning       – executable script
  'style':      '🎨',  // artist palette  – embedded stylesheet
  'title':      '👑',  // crown           – document title
  'video':      '📽️',  // film projector  – video player
  'audio':      '🔊',  // speaker high    – audio player
  'canvas':     '👝',  // clutch bag      – drawing surface
  'iframe':     '🪟',  // window          – nested browsing context
  'picture':    '📸',  // camera flash    – responsive image container

  // Text-level semantics
  'pre':        '📟',  // pager           – preformatted text
  'code':       '💻',  // laptop          – code fragment
  'strong':     '💪',  // flexed bicep    – strong importance
  'em':         '✍️',   // writing hand    – stress emphasis
  'blockquote': '🗨️',  // speech bubble   – extended quotation
  'mark':       '🖍️',  // crayon          – highlighted text
  'del':        '🗑️',  // wastebasket     – deleted text
  'ins':        '➕',  // plus sign       – inserted text
  'small':      '🔹',  // small diamond   – side comment
  'sub':        '⬇️',  // down arrow      – subscript
  'sup':        '⬆️',  // up arrow        – superscript

  // Interactive & misc
  'figure':     '🎞️',  // film frames     – figure with optional caption
  'figcaption': '💬',  // speech balloon  – figure caption
  'details':    '🔽',  // down button     – disclosure widget
  'summary':    '📖',  // open book       – disclosure summary
  'dialog':     '💭',  // thought balloon – dialog box
  'template':   '🖨️',  // printer         – content template
  'slot':       '🎰',  // slot machine    – shadow DOM slot
  'fieldset':   '🔲',  // black square btn– field grouping
  'legend':     '🗾',  // map of japan    – fieldset caption
  'output':     '📣',  // megaphone       – calculation result
  'progress':   '📈',  // chart up        – progress indicator
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
  'link':       '🔗',   // chains          – external resource link
  'source':     '🎙️',  // microphone      – media source
  'embed':      '📼',  // videocassette   – embedded content
  'area':       '🏞️',  // landscape       – image map clickable area
  'track':      '🎵',  // musical note    – text track (captions / subtitles)
  'wbr':        '✂️',   // scissors        – word break opportunity
  'col':        '🗄️',  // file cabinet    – table column
  'base':       '⚓',  // anchor          – base URL
};

// ── HTML attribute names ─────────────────────────────────────────────────────

const HTML_ATTR_EMOJI_MAP = {
  'class':       '⭐',  // classical bldg  – CSS class name
  'id':          '🆔',  // id button       – unique identifier
  'href':        '🏹',  // bow and arrow   – hyperlink reference
  'src':         '💿',  // disc            – source URL
  'alt':         '🗣️',  // speaking head   – alternative text
  'style':       '😎',  // sunglasses      – inline CSS styles
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
  'disabled':    '🚷',  // no pedestrians  – disabled state
  'required':    '❗',  // exclamation     – required field
  'checked':     '✅',  // check mark      – checked state
  'readonly':    '👁️‍🗨️',  // eye speech      – read-only field
  'hidden':      '👻',  // ghost           – hidden element
  'autofocus':   '🔦',  // flashlight      – automatic focus
  'defer':       '⏱️',   // stopwatch       – deferred script loading
  'async':       '🔄',  // counterclockwise– asynchronous loading
  'charset':     '🔠',  // input latin     – character encoding
  'lang':        '🌎',  // globe americas  – language code
  'role':        '🎪',  // circus tent     – ARIA role
  'tabindex':    '🎫',  // ticket          – tab order index
  'for':         '🔀',  // twisted arrows  – associates label with its form control
  'loading':     '⏬',  // inbox down      – lazy / eager resource loading
  'content':     '🧾',  // receipt         – meta content value
};

module.exports = { HTML_TAG_EMOJI_MAP, HTML_VOID_EMOJI_MAP, HTML_ATTR_EMOJI_MAP };
