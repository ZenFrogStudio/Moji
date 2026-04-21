# Moji

> Visual cues for faster code comprehension — supplement code keywords with emojis to reduce cognitive load and enhance pattern recognition.

---
## Settings

Settings for each language can be toggled from `Moji: Customize Settings`.
---

## Moji

Moji is free to use. All supported programming languages are available immediately after installation, with no purchase or activation step.

**What you get:**
- All currently supported programming languages
- No purchase, activation, account, or subscription requirement

---

## How It Works

Moji uses VS Code's decoration APIs to render emojis alongside code keywords:

1. **Scans your document** for keywords across supported languages
2. **Renders emojis inline** (visual overlay only)
3. **Keeps source code untouched** — no modifications, ever

```javascript
🔙 return user;
💥 throw new Error();                                                                   
⏳ await fetchData();
❓ if (isValid) { ... }
```

```python
⚡ def calculate(x):
    ❓ if x > 0:
        🔙 return x * 2
    ↪️ else:
        💥 raise ValueError()
```

```sql
🔍 SELECT * 📂 FROM users
🔎 WHERE active = ✅ TRUE
📶 ORDER 📌 BY created_at ⬇️ DESC
🛑 LIMIT 10;
```

---

## Features

- **Multi-language**: JavaScript, TypeScript, Python, C, C++, C#, Java, SQL, HTML, and CSS
- **Code Block Highlighting**: thin connected outline around each `{}` block and indented scope, with a subtle background tint — on by default, fully configurable
- **Customizable emojis**: replace any keyword's emoji with one of your own — changes persist across sessions
- **Non-invasive**: Source code never modified
- **Reversible**: Toggle on/off anytime, or revert all emoji customizations to defaults in one click
- **Configurable**: Enable/disable individual emojis via Settings panel
- **Consistent**: One emoji per keyword, everywhere

---

## Installation

1. Open VS Code
2. Go to **Extensions** (`Cmd+Shift+X` / `Ctrl+Shift+X`)
3. Search for **"Moji"**
4. Click **Install**

---

## Usage

Once installed, emojis appear automatically in supported language files.

**Toggle the extension:**
- Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
- Type: `Moji: Toggle`

**Toggle code block highlighting:**
- Open Command Palette
- Type: `Moji: Toggle Code Block Highlighting`

**Configure emojis and code block settings:**
- Open Command Palette
- Type: `Moji: Customize Settings`
- Use the visual settings panel to enable/disable individual emojis or adjust code block options

**Customize an emoji:**
- Open the Settings panel (`Moji: Customize Settings`)
- Click any emoji in the list — an inline editor opens in place
- Type a unicode code point (e.g. `U+1F680`) or paste an emoji directly, then click ✓
- Use the ↗ button to browse the full Unicode emoji chart in your browser
- Customized emojis are marked with a small dot (●) and apply immediately to open editors
- To restore defaults, click **Revert All Emojis** in the bottom bar of the settings panel

**Display modes:**
- **Overlay** (default): Emoji appears before the keyword, keyword remains visible
- **Replace**: Emoji replaces the keyword text visually

---

## Supported Languages

| Language | Keywords |
|----------|----------|
| JavaScript | 35 |
| TypeScript | 57 |
| Python | 34 |
| C | 32 |
| C++ | 73 |
| C# | 97 |
| Java | 60 |
| SQL | 120+ |
| HTML | 60+ elements |
| CSS | 32 properties |

## FAQ

**Does this change my code?**
No. The extension only affects how you *see* code in VS Code. Your files remain unchanged.

**Can collaborators see the emojis?**
Only if they also have the extension installed. Source files are unaffected.

**Can I disable specific emojis?**
Yes. Open the Settings panel (`Moji: Customize Settings`) to toggle individual emojis on/off.

**Can I change what emoji is used for a keyword?**
Yes. Click any emoji in the Settings panel to open an inline editor. Enter a unicode code point (`U+XXXX`) or paste an emoji, then save. Changes apply immediately and persist across sessions. Use **Revert All Emojis** in the settings panel to restore all defaults at once.

---

## Contributing

Found a bug? Have an emoji suggestion?
Open an issue on [GitHub](https://github.com/lucidiancreative/moji-pro/issues).

## License

Moji is open source software released under the MIT License. See the LICENSE file for details.

---

© 2026 Lucidian Creative.
