# Moji

> Visual cues for faster code comprehension - supplement code keywords with emojis and optional visual outlines.

---

## Overview

Moji adds visual markers to code without changing your files. It works immediately after installation and supports all included languages out of the box.

## Features

- **Keyword emojis**: Adds emoji markers to supported keywords across JavaScript, TypeScript, Python, C, C++, C#, Java, SQL, HTML, and CSS.
- **Display modes**: Choose **Overlay** to show emojis beside keywords, or **Replace** to show them in place visually.
- **Unicode customization**: Replace any individual emoji with a pasted emoji or a Unicode code point such as `U+1F680`.
- **Unicode chart shortcut**: Open the Unicode emoji chart directly from the settings editor when choosing replacements.
- **Code block highlighting**: Optionally outline code blocks with a subtle tint so nested structure is easier to follow.
- **React component outlines**: Optionally outline detected React component boundaries in JSX and TSX files.
- **Per-language controls**: Enable or disable emoji groups and individual decorations from the settings panel.
- **Non-destructive**: Moji changes only how code is displayed in VS Code. Your source files stay untouched.

---

## Installation

1. Open VS Code.
2. Open **Extensions** (`Cmd+Shift+X` or `Ctrl+Shift+X`).
3. Search for **Moji**.
4. Click **Install**.

---

## Usage

Once installed, Moji starts decorating supported files automatically.

**What it looks like**

These examples show the decorated editor view. Moji adds visual markers in VS Code without modifying the underlying source text.

```javascript
🚀 async function loadUser(id) {
  ❓ if (!id) {
    💥 throw new Error("Missing id");
  }

  ⏳ await fetchUser(id);
  🔙 return id;
}
```

```python
⚡ def calculate_total(items):
    ❓ if not items:
        🔙 return 0

    🔁 for item in items:
        pass
```

```sql
🔍 SELECT name, status
📂 FROM users
🔎 WHERE active = ✅ TRUE
📶 ORDER 📌 BY created_at ⬇️ DESC;
```

**Open settings**
- Run `Moji: Customize Settings`.
- Use the settings panel to manage emoji groups, individual keywords, code block highlighting, and React component outlines.
- The panel includes per-language toggles, code block outline controls, and React component outline settings.

**Customize emojis**
- Click an emoji in the settings panel.
- Enter a Unicode code point such as `U+1F680`, or paste an emoji directly.
- Save to apply the change immediately.
- Use **Revert All Emojis** to restore defaults.
- Unicode edits apply immediately to open editors and persist across sessions.

**Optional visual aids**
- Run `Moji: Toggle Code Block Highlighting` to turn block outlines on or off.
- Run `Moji: Toggle React Component Outlines` to turn React component outlines on or off.

**Toggle all emoji decorations**
- Run `Moji: Toggle` to enable or disable the main emoji overlay system.

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
No. The extension only affects how you see code in VS Code. Your files remain unchanged.

**Can collaborators see the emojis?**  
Only if they also have the extension installed. Source files are unaffected.

**Can I disable specific emojis?**  
Yes. Open the settings panel with `Moji: Customize Settings` to toggle individual emojis on or off.

**Can I change what emoji is used for a keyword?**  
Yes. Click any emoji in the settings panel to open the inline editor. Enter a Unicode code point (`U+XXXX`) or paste an emoji, then save. Changes apply immediately and persist across sessions. Use **Revert All Emojis** to restore all defaults at once.

---

## Contributing

Found a bug? Have an emoji suggestion?  
Open an issue on [GitHub](https://github.com/ZenFrogStudio/Moji/issues) or email info@zenfrogstudio.com.

## License

Moji is freeware by Zen Frog. See the LICENSE file for usage terms.

---

Copyright (c) 2026 Zen Frog.
