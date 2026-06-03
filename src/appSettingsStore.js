'use strict';

const fs = require('fs/promises');
const path = require('path');
const vscode = require('vscode');
const { DECORATION_CATEGORIES } = require('./decorationCategories');
const settingsStore = require('./settingsStore');

const SETTINGS_FILENAME = 'moji-settings.json';
const LEGACY_SETTINGS_FILENAME = 'moji-pro-settings.json';
const SETTINGS_SCHEMA_VERSION = 1;
const APP_SETTINGS_MIGRATION_KEY = 'settingsMigration.appOwned.v1';

const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  displayMode: 'overlay',
  overlayOpacity: 1,
  emojiSize: 'large',
  javascriptKeywords: true,
  htmlTags: true,
  htmlVoidElements: true,
  htmlAttributes: true,
  cssAtRules: true,
  cssLayout: true,
  cssBox: true,
  cssVisual: true,
  cssPseudo: true,
  cssValues: true,
  pythonKeywords: true,
  cKeywords: true,
  cppKeywords: true,
  csharpKeywords: true,
  sqlKeywords: true,
  typescriptKeywords: true,
  javaKeywords: true,
  customEmojiOverrides: {},
  disabledDecorations: {},
  codeBlocks: {
    enabled: false,
    functionColor: 'rgba(86,156,214,0.08)',
    loopColor: 'rgba(78,201,176,0.08)',
    controlColor: 'rgba(197,134,192,0.08)',
    objectColor: 'rgba(206,145,120,0.08)',
  },
  reactComponentOutlines: {
    enabled: false,
    color: 'rgba(207,130,58,1)',
    width: 1,
    style: 'solid',
  },
});

const MIGRATED_CONFIGURATION_KEYS = [
  { path: 'enabled', section: 'mojiPro', key: 'enabled' },
  { path: 'displayMode', section: 'mojiPro', key: 'displayMode' },
  { path: 'overlayOpacity', section: 'mojiPro', key: 'overlayOpacity' },
  { path: 'emojiSize', section: 'mojiPro', key: 'emojiSize' },
  { path: 'javascriptKeywords', section: 'mojiPro', key: 'javascriptKeywords' },
  { path: 'htmlTags', section: 'mojiPro', key: 'htmlTags' },
  { path: 'htmlVoidElements', section: 'mojiPro', key: 'htmlVoidElements' },
  { path: 'htmlAttributes', section: 'mojiPro', key: 'htmlAttributes' },
  { path: 'cssAtRules', section: 'mojiPro', key: 'cssAtRules' },
  { path: 'cssLayout', section: 'mojiPro', key: 'cssLayout' },
  { path: 'cssBox', section: 'mojiPro', key: 'cssBox' },
  { path: 'cssVisual', section: 'mojiPro', key: 'cssVisual' },
  { path: 'cssPseudo', section: 'mojiPro', key: 'cssPseudo' },
  { path: 'cssValues', section: 'mojiPro', key: 'cssValues' },
  { path: 'pythonKeywords', section: 'mojiPro', key: 'pythonKeywords' },
  { path: 'cKeywords', section: 'mojiPro', key: 'cKeywords' },
  { path: 'cppKeywords', section: 'mojiPro', key: 'cppKeywords' },
  { path: 'csharpKeywords', section: 'mojiPro', key: 'csharpKeywords' },
  { path: 'sqlKeywords', section: 'mojiPro', key: 'sqlKeywords' },
  { path: 'typescriptKeywords', section: 'mojiPro', key: 'typescriptKeywords' },
  { path: 'javaKeywords', section: 'mojiPro', key: 'javaKeywords' },
  { path: 'customEmojiOverrides', section: 'mojiPro', key: 'customEmojiOverrides' },
  { path: 'disabledDecorations', section: 'mojiPro', key: 'disabledDecorations' },
  { path: 'codeBlocks.enabled', section: 'mojiPro.codeBlocks', key: 'enabled' },
  { path: 'codeBlocks.functionColor', section: 'mojiPro.codeBlocks', key: 'functionColor' },
  { path: 'codeBlocks.loopColor', section: 'mojiPro.codeBlocks', key: 'loopColor' },
  { path: 'codeBlocks.controlColor', section: 'mojiPro.codeBlocks', key: 'controlColor' },
  { path: 'codeBlocks.objectColor', section: 'mojiPro.codeBlocks', key: 'objectColor' },
  { path: 'reactComponentOutlines.enabled', section: 'mojiPro.reactComponentOutlines', key: 'enabled' },
  { path: 'reactComponentOutlines.color', section: 'mojiPro.reactComponentOutlines', key: 'color' },
  { path: 'reactComponentOutlines.width', section: 'mojiPro.reactComponentOutlines', key: 'width' },
  { path: 'reactComponentOutlines.style', section: 'mojiPro.reactComponentOutlines', key: 'style' },
];

const BOOLEAN_KEYS = [
  'enabled',
  'javascriptKeywords',
  'htmlTags',
  'htmlVoidElements',
  'htmlAttributes',
  'cssAtRules',
  'cssLayout',
  'cssBox',
  'cssVisual',
  'cssPseudo',
  'cssValues',
  'pythonKeywords',
  'cKeywords',
  'cppKeywords',
  'csharpKeywords',
  'sqlKeywords',
  'typescriptKeywords',
  'javaKeywords',
  'codeBlocks.enabled',
  'reactComponentOutlines.enabled',
];

const STRING_KEYS = [
  'codeBlocks.functionColor',
  'codeBlocks.loopColor',
  'codeBlocks.controlColor',
  'codeBlocks.objectColor',
  'reactComponentOutlines.color',
];

const ENUM_VALUES = new Map([
  ['displayMode', new Set(['replace', 'overlay'])],
  ['emojiSize', new Set(['small', 'large'])],
  ['reactComponentOutlines.style', new Set(['solid', 'dashed', 'dotted'])],
]);

const NUMBER_RANGES = new Map([
  ['overlayOpacity', { min: 0, max: 1 }],
  ['reactComponentOutlines.width', { min: 1, max: 3 }],
]);

const VALID_OVERRIDE_KEYS = new Set();
for (const { map, prefix } of DECORATION_CATEGORIES) {
  for (const key of Object.keys(map)) {
    VALID_OVERRIDE_KEYS.add(`${prefix}${key}`);
  }
}

let state = clone(DEFAULT_SETTINGS);
let settingsFilePath = undefined;
let legacySettingsFilePath = undefined;
let writeChain = Promise.resolve();
const listeners = new Set();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getPathSegments(settingPath) {
  return String(settingPath).split('.').filter(Boolean);
}

function getByPath(target, settingPath) {
  let current = target;
  for (const segment of getPathSegments(settingPath)) {
    if (!isPlainObject(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function setByPath(target, settingPath, value) {
  const segments = getPathSegments(settingPath);
  if (segments.length === 0) return;

  let current = target;
  for (let index = 0; index < segments.length - 1; index++) {
    const segment = segments[index];
    if (!isPlainObject(current[segment])) {
      current[segment] = {};
    }
    current = current[segment];
  }

  current[segments[segments.length - 1]] = value;
}

function mergeObjects(base, incoming) {
  const next = clone(base);
  if (!isPlainObject(incoming)) return next;

  for (const [key, value] of Object.entries(incoming)) {
    if (isPlainObject(value) && isPlainObject(next[key])) {
      next[key] = mergeObjects(next[key], value);
      continue;
    }
    next[key] = clone(value);
  }

  return next;
}

function normalizeString(value, fallback) {
  return typeof value === 'string' && value.length <= 200 ? value : fallback;
}

function normalizeCustomEmojiOverrides(value) {
  const normalized = {};
  if (!isPlainObject(value)) return normalized;

  for (const [overrideKey, emoji] of Object.entries(value)) {
    const chars = typeof emoji === 'string' ? Array.from(emoji) : [];
    if (!VALID_OVERRIDE_KEYS.has(overrideKey)) continue;
    if (typeof emoji !== 'string' || emoji.length > 32) continue;
    if (chars.length < 1 || chars.length > 4) continue;
    normalized[overrideKey] = emoji;
  }

  return normalized;
}

function normalizeSettings(raw) {
  const next = clone(DEFAULT_SETTINGS);
  const source = isPlainObject(raw) ? raw : {};

  for (const settingPath of BOOLEAN_KEYS) {
    const value = getByPath(source, settingPath);
    if (typeof value === 'boolean') {
      setByPath(next, settingPath, value);
    }
  }

  for (const [settingPath, allowedValues] of ENUM_VALUES.entries()) {
    const value = getByPath(source, settingPath);
    if (typeof value === 'string' && allowedValues.has(value)) {
      setByPath(next, settingPath, value);
    }
  }

  for (const [settingPath, range] of NUMBER_RANGES.entries()) {
    const value = getByPath(source, settingPath);
    if (typeof value === 'number' && Number.isFinite(value) && value >= range.min && value <= range.max) {
      setByPath(next, settingPath, value);
    }
  }

  for (const settingPath of STRING_KEYS) {
    const fallback = getByPath(DEFAULT_SETTINGS, settingPath);
    setByPath(next, settingPath, normalizeString(getByPath(source, settingPath), fallback));
  }

  next.customEmojiOverrides = normalizeCustomEmojiOverrides(source.customEmojiOverrides);
  next.disabledDecorations = settingsStore.normalizeDisabledDecorations(source.disabledDecorations);

  return next;
}

function settingsEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function createPersistedPayload(settings) {
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    settings,
  };
}

async function writeStateToDisk(nextState) {
  if (!settingsFilePath) {
    throw new Error('Moji settings store has not been initialized.');
  }

  const payload = JSON.stringify(createPersistedPayload(nextState), null, 2);
  const tempPath = `${settingsFilePath}.tmp`;
  await fs.writeFile(tempPath, payload, 'utf8');
  await fs.rename(tempPath, settingsFilePath);
}

async function loadStateFromDisk(targetPath = settingsFilePath) {
  if (!targetPath) return undefined;

  try {
    const raw = await fs.readFile(targetPath, 'utf8');
    const parsed = JSON.parse(raw);
    const candidate = isPlainObject(parsed) && isPlainObject(parsed.settings)
      ? parsed.settings
      : parsed;
    return normalizeSettings(candidate);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return undefined;
    }
    vscode.window.showWarningMessage(`Moji: Could not read app settings file - ${error.message}`);
    return undefined;
  }
}

async function fileExists(targetPath) {
  if (!targetPath) return false;

  try {
    await fs.access(targetPath);
    return true;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function deleteLegacySettingsFile() {
  if (!legacySettingsFilePath || legacySettingsFilePath === settingsFilePath) return;

  try {
    await fs.unlink(legacySettingsFilePath);
  } catch (error) {
    if (error && error.code === 'ENOENT') return;
    vscode.window.showWarningMessage(`Moji: Could not remove legacy app settings file - ${error.message}`);
  }
}

function getExplicitConfigurationValue(configEntry) {
  const configuration = vscode.workspace.getConfiguration(configEntry.section);
  const inspected = typeof configuration.inspect === 'function'
    ? configuration.inspect(configEntry.key)
    : undefined;

  if (!inspected || typeof inspected.globalValue === 'undefined') {
    return undefined;
  }

  return inspected.globalValue;
}

function buildSettingsFromConfiguration() {
  const partial = {};
  let foundAny = false;

  for (const configEntry of MIGRATED_CONFIGURATION_KEYS) {
    const value = getExplicitConfigurationValue(configEntry);
    if (typeof value === 'undefined') continue;
    setByPath(partial, configEntry.path, value);
    foundAny = true;
  }

  return foundAny ? partial : undefined;
}

function buildLegacyDisabledDecorationsPatch() {
  let disabledDecorations = {};
  const keysToRemove = [];

  for (const { id, legacyConfigNs, map } of DECORATION_CATEGORIES) {
    const legacyConfig = vscode.workspace.getConfiguration(legacyConfigNs);

    for (const key of Object.keys(map)) {
      const inspected = typeof legacyConfig.inspect === 'function'
        ? legacyConfig.inspect(key)
        : undefined;
      if (!inspected || typeof inspected.globalValue === 'undefined') continue;

      if (inspected.globalValue === false) {
        disabledDecorations = settingsStore.setDecorationEnabled(
          disabledDecorations,
          id,
          key,
          false
        );
      }

      if (inspected.globalValue === true || inspected.globalValue === false) {
        keysToRemove.push({ section: legacyConfigNs, key });
      }
    }
  }

  return {
    disabledDecorations,
    keysToRemove,
  };
}

async function clearConfigurationEntries(entries) {
  for (const entry of entries) {
    await vscode.workspace
      .getConfiguration(entry.section)
      .update(entry.key, undefined, vscode.ConfigurationTarget.Global);
  }
}

async function migrateConfigurationToAppSettings(context) {
  if (context.globalState.get(APP_SETTINGS_MIGRATION_KEY)) {
    return;
  }

  const configPatch = buildSettingsFromConfiguration();
  const legacyPatch = buildLegacyDisabledDecorationsPatch();

  const nextState = normalizeSettings(
    mergeObjects(
      configPatch ? mergeObjects(state, configPatch) : state,
      {
        disabledDecorations: settingsStore.mergeDisabledDecorations(
          getByPath(configPatch || {}, 'disabledDecorations') || getByPath(state, 'disabledDecorations'),
          legacyPatch.disabledDecorations
        ),
      }
    )
  );

  const configEntriesToClear = MIGRATED_CONFIGURATION_KEYS
    .filter((entry) => typeof getExplicitConfigurationValue(entry) !== 'undefined')
    .map(({ section, key }) => ({ section, key }));

  try {
    const stateChanged = !settingsEqual(state, nextState);
    if (!settingsEqual(state, nextState)) {
      await writeStateToDisk(nextState);
      state = nextState;
    }

    await clearConfigurationEntries(configEntriesToClear);
    await clearConfigurationEntries(legacyPatch.keysToRemove);
    await context.globalState.update(APP_SETTINGS_MIGRATION_KEY, true);
    return stateChanged || configEntriesToClear.length > 0 || legacyPatch.keysToRemove.length > 0;
  } catch (error) {
    vscode.window.showWarningMessage(`Moji: Could not migrate settings into the app settings file - ${error.message}`);
    return false;
  }
}

function fireChange() {
  const snapshot = getAll();
  for (const listener of listeners) {
    try {
      listener(snapshot);
    } catch (error) {
      console.error('Moji settings listener failed:', error);
    }
  }
}

async function enqueueMutation(mutator) {
  const operation = writeChain.then(async () => {
    const draft = clone(state);
    const mutated = await mutator(draft);
    const nextState = normalizeSettings(mutated);

    if (settingsEqual(state, nextState)) {
      return false;
    }

    await writeStateToDisk(nextState);
    state = nextState;
    fireChange();
    return true;
  });

  writeChain = operation.catch(() => {});
  return operation;
}

async function initialize(context) {
  settingsFilePath = path.join(context.globalStorageUri.fsPath, SETTINGS_FILENAME);
  legacySettingsFilePath = path.join(context.globalStorageUri.fsPath, LEGACY_SETTINGS_FILENAME);
  await fs.mkdir(context.globalStorageUri.fsPath, { recursive: true });

  const persistedState = await loadStateFromDisk();
  const legacyPersistedState = !persistedState && legacySettingsFilePath !== settingsFilePath
    ? await loadStateFromDisk(legacySettingsFilePath)
    : undefined;

  if (persistedState) {
    state = persistedState;
  } else if (legacyPersistedState) {
    state = legacyPersistedState;
    await writeStateToDisk(state);
    await deleteLegacySettingsFile();
  } else {
    state = clone(DEFAULT_SETTINGS);
  }

  await migrateConfigurationToAppSettings(context);

  if (!(await fileExists(settingsFilePath))) {
    await writeStateToDisk(state);
  }
}

function onDidChange(listener) {
  listeners.add(listener);
  return {
    dispose() {
      listeners.delete(listener);
    },
  };
}

function getAll() {
  return clone(state);
}

function get(settingPath, fallback) {
  const value = getByPath(state, settingPath);
  if (typeof value === 'undefined') return fallback;
  return isPlainObject(value) || Array.isArray(value) ? clone(value) : value;
}

async function update(settingPath, value) {
  return enqueueMutation((draft) => {
    setByPath(draft, settingPath, value);
    return draft;
  });
}

async function updateMany(valuesByPath) {
  return enqueueMutation((draft) => {
    for (const [settingPath, value] of Object.entries(valuesByPath)) {
      setByPath(draft, settingPath, value);
    }
    return draft;
  });
}

function getSettingsFilePath() {
  return settingsFilePath;
}

function __resetForTests() {
  state = clone(DEFAULT_SETTINGS);
  settingsFilePath = undefined;
  legacySettingsFilePath = undefined;
  writeChain = Promise.resolve();
  listeners.clear();
}

module.exports = {
  DEFAULT_SETTINGS,
  buildSettingsFromConfiguration,
  get,
  getAll,
  getSettingsFilePath,
  initialize,
  normalizeSettings,
  onDidChange,
  update,
  updateMany,
  __resetForTests,
};
