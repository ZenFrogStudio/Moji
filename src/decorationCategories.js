'use strict';

const { KEYWORD_EMOJI_MAP } = require('./keywordMap');
const { HTML_TAG_EMOJI_MAP, HTML_VOID_EMOJI_MAP, HTML_ATTR_EMOJI_MAP } = require('./htmlKeywordMap');
const {
  CSS_ATRULE_EMOJI_MAP,
  CSS_LAYOUT_EMOJI_MAP,
  CSS_BOX_EMOJI_MAP,
  CSS_VISUAL_EMOJI_MAP,
  CSS_PSEUDO_EMOJI_MAP,
  CSS_VALUE_EMOJI_MAP,
} = require('./cssKeywordMap');
const { PYTHON_KEYWORD_EMOJI_MAP } = require('./pythonKeywordMap');
const { C_KEYWORD_EMOJI_MAP } = require('./cKeywordMap');
const { CPP_KEYWORD_EMOJI_MAP } = require('./cppKeywordMap');
const { CSHARP_KEYWORD_EMOJI_MAP } = require('./csharpKeywordMap');
const { SQL_KEYWORD_EMOJI_MAP } = require('./sqlKeywordMap');
const { TYPESCRIPT_KEYWORD_EMOJI_MAP } = require('./typescriptKeywordMap');
const { JAVA_KEYWORD_EMOJI_MAP } = require('./javaKeywordMap');

const DECORATION_CATEGORIES = [
  { id: 'javascript', panelId: 'javascript', masterKey: 'javascriptKeywords', legacyConfigNs: 'mojiPro.jsKeyword', map: KEYWORD_EMOJI_MAP, prefix: '' },
  { id: 'htmlTag', panelId: 'tags', masterKey: 'htmlTags', legacyConfigNs: 'mojiPro.htmlTag', map: HTML_TAG_EMOJI_MAP, prefix: 'tag:' },
  { id: 'htmlVoid', panelId: 'void', masterKey: 'htmlVoidElements', legacyConfigNs: 'mojiPro.htmlVoid', map: HTML_VOID_EMOJI_MAP, prefix: 'void:' },
  { id: 'htmlAttr', panelId: 'attr', masterKey: 'htmlAttributes', legacyConfigNs: 'mojiPro.htmlAttr', map: HTML_ATTR_EMOJI_MAP, prefix: 'attr:' },
  { id: 'cssAtRule', panelId: 'cssAtRule', masterKey: 'cssAtRules', legacyConfigNs: 'mojiPro.cssAtRule', map: CSS_ATRULE_EMOJI_MAP, prefix: 'cssAtRule:' },
  { id: 'cssLayout', panelId: 'cssLayout', masterKey: 'cssLayout', legacyConfigNs: 'mojiPro.cssLayout', map: CSS_LAYOUT_EMOJI_MAP, prefix: 'cssLayout:' },
  { id: 'cssBox', panelId: 'cssBox', masterKey: 'cssBox', legacyConfigNs: 'mojiPro.cssBox', map: CSS_BOX_EMOJI_MAP, prefix: 'cssBox:' },
  { id: 'cssVisual', panelId: 'cssVisual', masterKey: 'cssVisual', legacyConfigNs: 'mojiPro.cssVisual', map: CSS_VISUAL_EMOJI_MAP, prefix: 'cssVisual:' },
  { id: 'cssPseudo', panelId: 'cssPseudo', masterKey: 'cssPseudo', legacyConfigNs: 'mojiPro.cssPseudo', map: CSS_PSEUDO_EMOJI_MAP, prefix: 'cssPseudo:' },
  { id: 'cssValue', panelId: 'cssValue', masterKey: 'cssValues', legacyConfigNs: 'mojiPro.cssValue', map: CSS_VALUE_EMOJI_MAP, prefix: 'cssValue:' },
  { id: 'python', panelId: 'python', masterKey: 'pythonKeywords', legacyConfigNs: 'mojiPro.pyKeyword', map: PYTHON_KEYWORD_EMOJI_MAP, prefix: 'py:' },
  { id: 'c', panelId: 'c', masterKey: 'cKeywords', legacyConfigNs: 'mojiPro.cKeyword', map: C_KEYWORD_EMOJI_MAP, prefix: 'c:' },
  { id: 'cpp', panelId: 'cpp', masterKey: 'cppKeywords', legacyConfigNs: 'mojiPro.cppKeyword', map: CPP_KEYWORD_EMOJI_MAP, prefix: 'cpp:' },
  { id: 'csharp', panelId: 'csharp', masterKey: 'csharpKeywords', legacyConfigNs: 'mojiPro.csharpKeyword', map: CSHARP_KEYWORD_EMOJI_MAP, prefix: 'csharp:' },
  { id: 'sql', panelId: 'sql', masterKey: 'sqlKeywords', legacyConfigNs: 'mojiPro.sqlKeyword', map: SQL_KEYWORD_EMOJI_MAP, prefix: 'sql:' },
  { id: 'typescript', panelId: 'typescript', masterKey: 'typescriptKeywords', legacyConfigNs: 'mojiPro.tsKeyword', map: TYPESCRIPT_KEYWORD_EMOJI_MAP, prefix: 'ts:' },
  { id: 'java', panelId: 'java', masterKey: 'javaKeywords', legacyConfigNs: 'mojiPro.javaKeyword', map: JAVA_KEYWORD_EMOJI_MAP, prefix: 'java:' },
];

const CATEGORY_BY_ID = new Map(DECORATION_CATEGORIES.map(category => [category.id, category]));
const CATEGORY_BY_PANEL_ID = new Map(DECORATION_CATEGORIES.map(category => [category.panelId, category]));

function getCategoryByPanelId(panelId) {
  return CATEGORY_BY_PANEL_ID.get(panelId);
}

module.exports = {
  DECORATION_CATEGORIES,
  CATEGORY_BY_ID,
  getCategoryByPanelId,
};
