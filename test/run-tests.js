'use strict';

const assert = require('assert');
const Module = require('module');

const vscodeMockState = {
  decorationOptions: [],
  configuration: {},
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
}

const originalLoad = Module._load;
Module._load = function loadWithVscodeMock(request, parent, isMain) {
  if (request === 'vscode') {
    return {
      Position,
      Range,
      workspace: {
        getConfiguration() {
          return {
            get(key, fallback) {
              return Object.prototype.hasOwnProperty.call(vscodeMockState.configuration, key)
                ? vscodeMockState.configuration[key]
                : fallback;
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

let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
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
