'use strict';

const assert = require('assert');
const fs = require('fs');
const Module = require('module');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const vscodeMockState = {
  decorationOptions: [],
  configuration: {},
  configurationUpdates: [],
  warningMessages: [],
};

class Position {
  constructor(line, character) {
    this.line = line;
    this.character = character;
  }
}

class Range {
  constructor(start, endOrStartCharacter, endLine, endCharacter) {
    if (typeof endOrStartCharacter === 'number') {
      this.start = new Position(start, endOrStartCharacter);
      this.end = new Position(endLine, endCharacter);
    } else {
      this.start = start;
      this.end = endOrStartCharacter;
    }
  }
}

function resetVscodeMock(configuration = {}) {
  vscodeMockState.decorationOptions = [];
  vscodeMockState.configuration = configuration;
  vscodeMockState.configurationUpdates = [];
  vscodeMockState.warningMessages = [];

  try {
    require('../src/appSettingsStore').__resetForTests();
  } catch (error) {
    // Ignore before the module is loaded.
  }
}

function getScopedConfiguration(section) {
  if (
    section &&
    Object.prototype.hasOwnProperty.call(vscodeMockState.configuration, section) &&
    vscodeMockState.configuration[section] &&
    typeof vscodeMockState.configuration[section] === 'object' &&
    !Array.isArray(vscodeMockState.configuration[section])
  ) {
    return vscodeMockState.configuration[section];
  }

  return {};
}

function getConfigurationValue(section, key) {
  const scoped = getScopedConfiguration(section);
  if (Object.prototype.hasOwnProperty.call(scoped, key)) {
    return scoped[key];
  }

  if (!section && Object.prototype.hasOwnProperty.call(vscodeMockState.configuration, key)) {
    return vscodeMockState.configuration[key];
  }

  return undefined;
}

function setConfigurationValue(section, key, value) {
  if (!section) {
    if (typeof value === 'undefined') {
      delete vscodeMockState.configuration[key];
    } else {
      vscodeMockState.configuration[key] = value;
    }
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(vscodeMockState.configuration, section) || typeof vscodeMockState.configuration[section] !== 'object' || Array.isArray(vscodeMockState.configuration[section])) {
    vscodeMockState.configuration[section] = {};
  }

  if (typeof value === 'undefined') {
    delete vscodeMockState.configuration[section][key];
  } else {
    vscodeMockState.configuration[section][key] = value;
  }
}

function createGlobalState(initialValues = {}) {
  const store = { ...initialValues };
  return {
    get(key) {
      return store[key];
    },
    async update(key, value) {
      store[key] = value;
    },
    dump() {
      return { ...store };
    },
  };
}

const originalLoad = Module._load;
Module._load = function loadWithVscodeMock(request, parent, isMain) {
  if (request === 'vscode') {
    return {
      Position,
      Range,
      ConfigurationTarget: {
        Global: 'Global',
      },
      workspace: {
        getConfiguration(section = '') {
          return {
            get(key, fallback) {
              const value = getConfigurationValue(section, key);
              return typeof value === 'undefined' ? fallback : value;
            },
            inspect(key) {
              return {
                globalValue: getConfigurationValue(section, key),
              };
            },
            update(key, value) {
              setConfigurationValue(section, key, value);
              vscodeMockState.configurationUpdates.push({ section, key, value });
              return Promise.resolve();
            },
          };
        },
      },
      window: {
        activeTextEditor: undefined,
        createTextEditorDecorationType(options) {
          const decorationType = {
            key: `decoration-${vscodeMockState.decorationOptions.length}`,
            options,
            dispose() {},
          };
          vscodeMockState.decorationOptions.push(options);
          return decorationType;
        },
        showInformationMessage() {},
        showWarningMessage(message) {
          vscodeMockState.warningMessages.push(message);
        },
        showErrorMessage(message) {
          vscodeMockState.warningMessages.push(message);
        },
      },
    };
  }
  return originalLoad.apply(this, arguments);
};

const { scanKeywords } = require('../src/scanner');
const { scanHtmlTokens } = require('../src/htmlScanner');
const { scanCssTokens } = require('../src/cssScanner');
const { detectReactComponents } = require('../src/reactComponentDetector');
const { ComponentOutlineDecorator } = require('../src/componentOutlineDecorator');
const appSettingsStore = require('../src/appSettingsStore');
const settingsStore = require('../src/settingsStore');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function createDocument(languageId, text) {
  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') lineStarts.push(i + 1);
  }

  const lines = text.split(/\n/);

  return {
    languageId,
    version: 1,
    uri: { toString: () => `mock://${languageId}/test` },
    lineCount: lines.length,
    getText: () => text,
    positionAt(index) {
      let line = 0;
      while (line + 1 < lineStarts.length && lineStarts[line + 1] <= index) {
        line++;
      }
      return new Position(line, index - lineStarts[line]);
    },
    lineAt(line) {
      const value = lines[line] || '';
      return {
        text: value,
        isEmptyOrWhitespace: value.trim().length === 0,
      };
    },
  };
}

function keywords(matches) {
  return matches.map(match => match.keyword);
}

function count(matches, keyword) {
  return keywords(matches).filter(value => value === keyword).length;
}

test('javascript scanner ignores comments strings and object property keys', () => {
  const source = `
const value = 1;
const msg = "if you return from a string";
// return if class
const obj = { return: 1, class: 'button' };
obj.return;
if (value) {
  return value;
}
`;

  const matches = scanKeywords(createDocument('javascript', source));

  assert.strictEqual(count(matches, 'if'), 1);
  assert.strictEqual(count(matches, 'return'), 1);
  assert.strictEqual(count(matches, 'class'), 0);
});

test('html scanner ignores comments and raw script content', () => {
  const source = `
<div class="wrap">
  <img alt="hero">
  <script>const markup = "<div class='hidden'>";</script>
  <!-- <span id="bad"> -->
</div>
`;

  const matches = scanHtmlTokens(createDocument('html', source));

  assert.strictEqual(count(matches, 'tag:div'), 1);
  assert.strictEqual(count(matches, 'void:img'), 1);
  assert.strictEqual(count(matches, 'attr:class'), 1);
  assert.strictEqual(count(matches, 'attr:alt'), 1);
  assert.strictEqual(count(matches, 'tag:span'), 0);
});

test('css scanner detects real CSS tokens and skips comments', () => {
  const source = `
@media screen {
  .box:hover {
    display: none;
    margin: auto;
    color: inherit !important;
  }
  /* display: none; */
}
`;

  const matches = scanCssTokens(createDocument('css', source));

  assert.strictEqual(count(matches, 'cssAtRule:media'), 1);
  assert.strictEqual(count(matches, 'cssPseudo:hover'), 1);
  assert.strictEqual(count(matches, 'cssLayout:display'), 1);
  assert.strictEqual(count(matches, 'cssBox:margin'), 1);
  assert.strictEqual(count(matches, 'cssVisual:color'), 1);
  assert.strictEqual(count(matches, 'cssValue:important'), 1);
});

test('react detector only outlines PascalCase declarations that return JSX', () => {
  const source = `
function RealComponent() {
  return <div>Hello</div>;
}

function UtilityThing() {
  return computeValue();
}

const ArrowComponent = () => (
  <section />
);

const ArrowUtility = () => calculate();

class ClassComponent extends React.Component {
  render() {
    return <span />;
  }
}

class PlainClass {
  method() {
    return 1;
  }
}
`;

  const matches = detectReactComponents(createDocument('typescriptreact', source));

  assert.deepStrictEqual(
    matches.map(component => component.name),
    ['RealComponent', 'ArrowComponent', 'ClassComponent']
  );
});

test('react detector supports typed arrow components and export default functions', () => {
  const source = `
interface Props {
  title: string;
}

const Card: React.FC<Props> = ({ title }) => {
  return <section>{title}</section>;
};

export default function ExportedComponent() {
  return <main />;
}
`;

  const matches = detectReactComponents(createDocument('typescriptreact', source));

  assert.deepStrictEqual(
    matches.map(component => component.name),
    ['Card', 'ExportedComponent']
  );
});

test('react detector ignores non JSX languages', () => {
  const source = 'function RealComponent() { return <div />; }';
  const matches = detectReactComponents(createDocument('typescript', source));

  assert.deepStrictEqual(matches, []);
});

test('react detector does not treat JSX child elements as components', () => {
  const source = `
class UserPage extends Component {
  render() {
    const { name, count } = this.props;
    return (
      <div className="page">
        <p>This is for all users</p>
        <label htmlFor="name">Submit this form for access</label>
        <span>New for this release</span>
        <button onClick={() => this.setState({ open: true })}>
          Click for more
        </button>
        <p>{count} items for all {this.state.label} users</p>
        {items.map((item) => {
          if (typeof item === 'undefined') return null;
          return <li key={item.id}>{item.name}</li>;
        })}
      </div>
    );
  }
}
`;

  const matches = detectReactComponents(createDocument('typescriptreact', source));

  assert.deepStrictEqual(matches, [
    { startLine: 1, endLine: 20, name: 'UserPage' },
  ]);
});

test('react outline decorator only creates editor outline decorations', () => {
  resetVscodeMock({
    color: 'rgba(207,130,58,1)',
  });

  const source = `
function FirstComponent() {
  return <div />;
}

const SecondComponent = () => (
  <section />
);

class ThirdComponent extends React.Component {
  render() {
    return <span />;
  }
}
`;

  const decorator = new ComponentOutlineDecorator();
  decorator.enabled = true;

  const appliedDecorations = new Map();
  const editor = {
    document: createDocument('typescriptreact', source),
    setDecorations(decorationType, ranges) {
      appliedDecorations.set(decorationType.key, ranges);
    },
  };

  decorator.updateEditor(editor);

  assert.strictEqual(vscodeMockState.decorationOptions.length, 4);

  assert.deepStrictEqual(
    Array.from(appliedDecorations.keys()),
    ['decoration-0', 'decoration-1', 'decoration-2', 'decoration-3']
  );
});

test('settings store defaults decorations to enabled', () => {
  assert.strictEqual(
    settingsStore.isDecorationEnabled({}, 'javascript', 'await'),
    true
  );
});

test('settings store disables configured decorations', () => {
  assert.strictEqual(
    settingsStore.isDecorationEnabled({ javascript: ['await'] }, 'javascript', 'await'),
    false
  );
  assert.strictEqual(
    settingsStore.isDecorationEnabled({ javascript: ['await'] }, 'javascript', 'return'),
    true
  );
});

test('settings store toggles individual decorations compactly', () => {
  const disabled = settingsStore.setDecorationEnabled({}, 'javascript', 'await', false);
  assert.deepStrictEqual(disabled, { javascript: ['await'] });

  const enabled = settingsStore.setDecorationEnabled(disabled, 'javascript', 'await', true);
  assert.deepStrictEqual(enabled, {});
});

test('settings store toggles whole categories compactly', () => {
  const disabled = settingsStore.setCategoryEnabled({}, 'javascript', false, ['await', 'return']);
  assert.deepStrictEqual(disabled, { javascript: ['await', 'return'] });

  const enabled = settingsStore.setCategoryEnabled(disabled, 'javascript', true, ['await', 'return']);
  assert.deepStrictEqual(enabled, {});
});

test('settings store normalizes and merges valid compact settings', () => {
  const normalized = settingsStore.normalizeDisabledDecorations({
    javascript: ['await', 'await', 'not-a-key'],
    unknown: ['await'],
    htmlTag: 'div',
  });
  assert.deepStrictEqual(normalized, { javascript: ['await'] });

  const merged = settingsStore.mergeDisabledDecorations(
    { javascript: ['return'] },
    { javascript: ['await'], htmlTag: ['div'] }
  );
  assert.deepStrictEqual(merged, {
    htmlTag: ['div'],
    javascript: ['await', 'return'],
  });
});

test('app settings store normalizes invalid values to defaults', () => {
  const normalized = appSettingsStore.normalizeSettings({
    enabled: false,
    displayMode: 'nope',
    overlayOpacity: 2,
    emojiSize: 'small',
    customEmojiOverrides: {
      await: '🎯',
      bogus: 'x',
    },
    disabledDecorations: {
      javascript: ['await', 'not-a-key'],
    },
    codeBlocks: {
      enabled: true,
      functionColor: 123,
    },
    reactComponentOutlines: {
      enabled: true,
      width: 4,
      style: 'dashed',
    },
  });

  assert.strictEqual(normalized.enabled, false);
  assert.strictEqual(normalized.displayMode, 'overlay');
  assert.strictEqual(normalized.overlayOpacity, 1);
  assert.strictEqual(normalized.emojiSize, 'small');
  assert.deepStrictEqual(normalized.customEmojiOverrides, { await: '🎯' });
  assert.deepStrictEqual(normalized.disabledDecorations, { javascript: ['await'] });
  assert.strictEqual(normalized.codeBlocks.enabled, true);
  assert.strictEqual(normalized.codeBlocks.functionColor, 'rgba(86,156,214,0.08)');
  assert.strictEqual(normalized.reactComponentOutlines.enabled, true);
  assert.strictEqual(normalized.reactComponentOutlines.width, 1);
  assert.strictEqual(normalized.reactComponentOutlines.style, 'dashed');
});

test('app settings store migrates VS Code config into an app-owned file', async () => {
  resetVscodeMock({
    mojiPro: {
      enabled: false,
      customEmojiOverrides: {
        await: '🎯',
      },
    },
    'mojiPro.codeBlocks': {
      enabled: true,
    },
    'mojiPro.jsKeyword': {
      await: false,
    },
  });

  const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moji-settings-'));
  const globalState = createGlobalState();

  try {
    await appSettingsStore.initialize({
      globalStorageUri: { fsPath: storageDir },
      globalState,
    });

    const storedFilePath = appSettingsStore.getSettingsFilePath();
    assert.ok(fs.existsSync(storedFilePath), 'expected settings file to be created');

    const storedPayload = JSON.parse(fs.readFileSync(storedFilePath, 'utf8'));
    assert.strictEqual(storedPayload.schemaVersion, 1);
    assert.strictEqual(storedPayload.settings.enabled, false);
    assert.strictEqual(storedPayload.settings.codeBlocks.enabled, true);
    assert.deepStrictEqual(storedPayload.settings.customEmojiOverrides, { await: '🎯' });
    assert.deepStrictEqual(storedPayload.settings.disabledDecorations, { javascript: ['await'] });

    assert.strictEqual(appSettingsStore.get('enabled', true), false);
    assert.deepStrictEqual(settingsStore.getDisabledDecorations(), { javascript: ['await'] });
    assert.strictEqual(globalState.dump()['settingsMigration.appOwned.v1'], true);

    assert.strictEqual(vscodeMockState.configuration.mojiPro.enabled, undefined);
    assert.strictEqual(vscodeMockState.configuration['mojiPro.codeBlocks'].enabled, undefined);
    assert.strictEqual(vscodeMockState.configuration['mojiPro.jsKeyword'].await, undefined);
  } finally {
    fs.rmSync(storageDir, { recursive: true, force: true });
  }
});

test('README image references are valid when present', () => {
  const repoRoot = path.join(__dirname, '..');
  const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  const imageRefs = Array.from(
    readme.matchAll(/!\[[^\]]*]\(([^)]+)\)/g),
    match => match[1]
  );

  for (const imageRef of imageRefs) {
    if (/^https:\/\/raw\.githubusercontent\.com\/ZenFrogStudio\/Moji\/main\//.test(imageRef)) {
      const repoPath = imageRef.replace('https://raw.githubusercontent.com/ZenFrogStudio/Moji/main/', '');
      const localPath = path.join(repoRoot, ...repoPath.split('/'));

      assert.ok(fs.existsSync(localPath), `README image is missing locally: ${repoPath}`);

      try {
        execFileSync('git', ['ls-files', '--error-unmatch', repoPath], {
          cwd: repoRoot,
          stdio: 'ignore',
        });
      } catch (error) {
        assert.fail(
          `README image URL points at an untracked file. Because the README uses GitHub raw URLs on the main branch, VS Code will not load this image until it is tracked and pushed there: ${repoPath}`
        );
      }
      continue;
    }

    if (/^(https?:\/\/|data:)/.test(imageRef)) {
      continue;
    }

    const relativePath = imageRef.replace(/^\.\//, '');
    const localPath = path.join(repoRoot, ...relativePath.split('/'));
    assert.ok(fs.existsSync(localPath), `README image relative path is missing locally: ${imageRef}`);
  }
});

(async () => {
  let failed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`ok - ${name}`);
    } catch (err) {
      failed++;
      console.error(`not ok - ${name}`);
      console.error(err.stack || err.message);
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
  } else {
    console.log(`${tests.length} tests passed`);
  }
})();
