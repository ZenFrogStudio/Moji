'use strict';

const vscode = require('vscode');
const { CATEGORY_BY_ID } = require('./decorationCategories');

function uniqueSortedStrings(values, allowedKeys) {
  const allowed = allowedKeys ? new Set(allowedKeys) : undefined;
  const result = [];
  const seen = new Set();

  if (!Array.isArray(values)) return result;

  for (const value of values) {
    if (typeof value !== 'string') continue;
    if (allowed && !allowed.has(value)) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }

  return result.sort();
}

function normalizeDisabledDecorations(value) {
  const normalized = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return normalized;
  }

  for (const [categoryId, keys] of Object.entries(value)) {
    const category = CATEGORY_BY_ID.get(categoryId);
    if (!category) continue;

    const disabled = uniqueSortedStrings(keys, Object.keys(category.map));
    if (disabled.length > 0) {
      normalized[categoryId] = disabled;
    }
  }

  return normalized;
}

function cloneDisabledDecorations(disabled) {
  return normalizeDisabledDecorations(disabled);
}

function isDecorationEnabled(disabled, categoryId, key) {
  const normalized = normalizeDisabledDecorations(disabled);
  const category = CATEGORY_BY_ID.get(categoryId);
  if (!category || !Object.prototype.hasOwnProperty.call(category.map, key)) {
    return true;
  }

  return !(normalized[categoryId] || []).includes(key);
}

function setDecorationEnabled(disabled, categoryId, key, enabled) {
  const category = CATEGORY_BY_ID.get(categoryId);
  const next = cloneDisabledDecorations(disabled);

  if (!category || !Object.prototype.hasOwnProperty.call(category.map, key)) {
    return next;
  }

  const current = new Set(next[categoryId] || []);
  if (enabled) {
    current.delete(key);
  } else {
    current.add(key);
  }

  const values = uniqueSortedStrings([...current], Object.keys(category.map));
  if (values.length > 0) {
    next[categoryId] = values;
  } else {
    delete next[categoryId];
  }

  return next;
}

function setCategoryEnabled(disabled, categoryId, enabled, allKeys) {
  const category = CATEGORY_BY_ID.get(categoryId);
  const next = cloneDisabledDecorations(disabled);
  if (!category) return next;

  if (enabled) {
    delete next[categoryId];
    return next;
  }

  const keys = allKeys || Object.keys(category.map);
  const values = uniqueSortedStrings(keys, Object.keys(category.map));
  if (values.length > 0) {
    next[categoryId] = values;
  }

  return next;
}

function mergeDisabledDecorations(base, incoming) {
  let next = cloneDisabledDecorations(base);
  const normalizedIncoming = normalizeDisabledDecorations(incoming);

  for (const [categoryId, keys] of Object.entries(normalizedIncoming)) {
    for (const key of keys) {
      next = setDecorationEnabled(next, categoryId, key, false);
    }
  }

  return next;
}

function getDisabledDecorations() {
  return normalizeDisabledDecorations(
    vscode.workspace.getConfiguration('mojiPro').get('disabledDecorations', {})
  );
}

async function saveDisabledDecorations(disabled) {
  const normalized = normalizeDisabledDecorations(disabled);
  const value = Object.keys(normalized).length > 0 ? normalized : undefined;

  await vscode.workspace
    .getConfiguration('mojiPro')
    .update('disabledDecorations', value, vscode.ConfigurationTarget.Global);
}

module.exports = {
  normalizeDisabledDecorations,
  isDecorationEnabled,
  setDecorationEnabled,
  setCategoryEnabled,
  mergeDisabledDecorations,
  getDisabledDecorations,
  saveDisabledDecorations,
};
