# Moji

> Visual cues for faster code comprehension — supplement code keywords with emojis to reduce cognitive load and enhance pattern recognition.

---
## Settings

Settings for each language can be toggled under settings>customize.
---

## Moji Pro

Moji includes a free tier with select languages. Upgrade to **Moji Pro** to unlock all programming languages.

**What you get:**
- All current and future programming languages
- Lifetime license — pay once, own forever
- Use on up to 5 devices at the same time
- All future updates included

**How to activate:**
1. Run `Moji Pro: Purchase License` from the Command Palette
2. Copy your license key from the confirmation page after purchase
3. Run `Moji Pro: Activate License` from the Command Palette and paste your key

**Other commands:**
- `Moji Pro: License Status` — check your current license and device count
- `Moji Pro: Deactivate License` — free up a device slot

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
- **Non-invasive**: Source code never modified
- **Reversible**: Toggle on/off anytime
- **Configurable**: Enable/disable individual emojis via Settings panel
- **Consistent**: One emoji per keyword, everywhere

---

## Installation

1. Open VS Code
2. Go to **Extensions** (`Cmd+Shift+X` / `Ctrl+Shift+X`)
3. Search for **"Moji Pro"**
4. Click **Install**

---

## Usage

Once installed, emojis appear automatically in supported language files.

**Toggle the extension:**
- Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
- Type: `Moji Pro: Toggle`

**Configure emojis:**
- Open Command Palette
- Type: `Moji Pro: Settings`
- Use the visual settings panel to enable/disable individual emojis

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

### Coming Soon

**Stage 1:** Go, PHP, Rust, Kotlin, Swift, Dart, Ruby

**Stage 2:** R, Scala, Perl, Objective-C, Elixir, Haskell, MATLAB

---

## FAQ

**Does this change my code?**
No. The extension only affects how you *see* code in VS Code. Your files remain unchanged.

**Can collaborators see the emojis?**
Only if they also have the extension installed. Source files are unaffected.

**Can I disable specific emojis?**
Yes. Open the Settings panel (`Moji Pro: Settings`) to toggle individual emojis on/off.

---

## Contributing

Found a bug? Have an emoji suggestion?
Open an issue on [GitHub](https://github.com/lucidiancreative/moji-pro/issues).

## License

Moji Pro is proprietary software licensed under the Moji Pro End User License Agreement. See the LICENSE file for details.

---

© 2026 Lucidian Creative. All rights reserved.
