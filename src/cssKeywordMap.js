// CSS keyword to emoji mappings organized by category

// At-rules (prefixed with @)
const CSS_ATRULE_EMOJI_MAP = {
  'media': '📺',
  'keyframes': '🎞️',
  'import': '📥',
  'font-face': '🔤',
  'supports': '✅',
};

// Layout properties
const CSS_LAYOUT_EMOJI_MAP = {
  'display': '📺',
  'flex': '🩹',
  'grid': '🎛️',
  'position': '📍',
  'float': '🎈',
};

// Box model properties
const CSS_BOX_EMOJI_MAP = {
  'margin': '😶‍🌫️',
  'padding': '☁️',
  'border': '〰️',
  'width': '↔️',
  'height': '↕️',
};

// Visual properties
const CSS_VISUAL_EMOJI_MAP = {
  'background': '🖼️',
  'color': '🎨',
  'opacity': '👻',
  'transform': '🔄',
  'animation': '🎬',
  'transition': '⏳',
  'visibility': '👁️',
  'cursor': '👆',
};

// Pseudo-classes (without the colon prefix)
const CSS_PSEUDO_EMOJI_MAP = {
  'hover': '🖱️',
  'focus': '🎯',
  'active': '⚡',
  'first-child': '👒',
  'last-child': '👴',
};

// Important values
const CSS_VALUE_EMOJI_MAP = {
  'important': '❗',
  'none': '🚫',
  'auto': '🤖',
  'inherit': '👪',
};

module.exports = {
  CSS_ATRULE_EMOJI_MAP,
  CSS_LAYOUT_EMOJI_MAP,
  CSS_BOX_EMOJI_MAP,
  CSS_VISUAL_EMOJI_MAP,
  CSS_PSEUDO_EMOJI_MAP,
  CSS_VALUE_EMOJI_MAP,
};
