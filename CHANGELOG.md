# Changelog

All notable changes to Moji Pro will be documented in this file.

## [1.4.8] - 2026-04-20

### Removed
- Removed the abandoned React component scrollbar-marker experiment after visual testing showed it conflicts with VS Code diagnostics and produces noisy markers.

### Changed
- Kept React component outlines focused on in-editor component boundaries.

### Fixed
- Added regression coverage proving JSX child elements inside a class component are not treated as separate React component outlines.

## [1.4.5] - 2026-04-19

### Changed
- Replaced per-decoration settings writes with compact `mojiPro.disabledDecorations` storage to keep VS Code `settings.json` clean.
- Added migration for legacy per-keyword settings into the compact disabled-decorations object.
- Marked legacy per-decoration settings as deprecated for this release before future removal.

## [1.4.4] - 2026-04-19

### Added
- Added `npm test` with a lightweight Node test harness for JavaScript, HTML, CSS, and React component detection behavior.

### Fixed
- Added regression coverage for scanner edge cases around comments, strings, object property keys, raw HTML content, CSS comments, and non-JSX PascalCase declarations.

## [1.4.3] - 2026-04-19

### Fixed
- Refreshed all visible editors after license state changes so settings-panel activation/deactivation applies immediately.
- Fixed React component outline settings reloads during editor-switch/configuration debounce handling.
- Reduced React outline false positives by requiring detected components to return JSX.
- Hardened settings-panel message handling with explicit setting allowlists, typed value validation, safe external URL opening, and escaped keyword row rendering.
- Added an atomic license activation RPC to prevent concurrent device activations from bypassing the device limit.

## [1.4.2] - 2026-04-19

### Fixed
- Fixed license API rate limiting by aligning the Edge Function RPC parameters with the database function signature.
- Fixed post-purchase license lookup after the Stripe migration by querying `stripe_checkout_session_id`.
- Disabled the legacy Paddle webhook endpoint to avoid writes to the removed Paddle transaction column and prevent license keys from being logged.
- Hardened license API request validation for malformed JSON, license keys, device fingerprints, and checkout session IDs.

## [1.4.0] - 2026-04-18

### Added
- **Emoji size setting** — new `mojiPro.emojiSize` option with "large" (default) and "small" (75% size) modes
- **General Settings tab** in the settings panel — provides a central location for global display options
- Size toggle applies to both replace and overlay display modes

## [1.3.0] - 2026-03-18

### Added
- **Per-keyword emoji customization** — click any emoji in the Settings panel to replace it with a custom emoji. Accepts `U+XXXX` unicode format or a directly-pasted emoji character
- Inline unicode editor opens in-place on the keyword row — no modal or navigation required
- **Open Unicode chart** button (↗) in the inline editor launches the full Unicode emoji list in the system browser, anchored to the current emoji's code point
- Customized emojis are marked with a small accent dot (●) so they're visually distinguishable from defaults
- **Revert All Emojis** button in the settings panel apply bar restores every keyword to its default emoji after an inline confirmation
- New `mojiPro.customEmojiOverrides` setting (object) stores all per-keyword overrides in VS Code user settings — persists across sessions and machines
- Emoji changes apply immediately to open editors without requiring an explicit Apply click

## [1.2.1] - 2026-03-18

### Added
- **Block-type color tinting** — code block highlights now use distinct background tints per block type: function/method/class (blue), loop (teal), control flow (purple), and object/data (orange)
- Four new settings under `mojiPro.codeBlocks.*`: `functionColor`, `loopColor`, `controlColor`, `objectColor` — each accepts any valid CSS color string (e.g. `rgba(86,156,214,0.08)`)
- Color pickers for each block type in the **Code Blocks** settings tab, paired with a text input for full CSS color control (alpha preserved across picker changes)
- **Reset Colors to Default** button in the Code Blocks tab to restore all four block-type tints to their defaults in one click
- **Apply Settings** button in the settings panel — all changes are now batched and written to VS Code user settings on explicit apply rather than on every individual change

### Changed
- Removed the generic `mojiPro.codeBlocks.backgroundColor` setting; replaced by the four typed color settings above

## [1.2.0] - 2026-03-17

### Added
- **Code Block Highlighting** — draws a thin connected outline (top, left, and bottom border sides) around each multi-line `{}` block in JS, TS, Java, C, C++, C#, CSS/SCSS/Less, and around indented blocks in Python, with a subtle background tint to visually separate nested scopes
- Toggle command `Moji Pro: Toggle Code Block Highlighting` to enable/disable the feature without opening settings
- New **Code Blocks** tab in the Moji Pro Settings panel with a master on/off toggle
- Four new settings under `mojiPro.codeBlocks.*`: `enabled`, `borderColor`, `backgroundColor`, `borderWidth`
- Code block highlighting is enabled by default

## [1.0.1] - 2026-03-13

### Improved
- Significant performance improvements to decorator rendering
- Refactored scanner architecture — all language scanners now share a common factory, reducing duplication and improving maintainability
- Settings panel performance optimizations

## [1.0.0] - 2026-03-04

### Changed
- Rebranded extension from MojiCode Pro to Moji Pro
- Renamed VS Code command and configuration namespace from `mojiCode.*` to `mojiPro.*`
- Renamed license storage keys (`mojicode_*` → `moji_*`) — existing activations require re-entry

## [1.0.0-rc.1] - 2026-02-19

### Added
- Emoji overlay decorations for code keywords across 10 languages
- JavaScript (35 keywords), TypeScript (57 keywords), Python (34 keywords)
- C (32 keywords), C++ (73 keywords), C# (97 keywords), Java (60 keywords)
- SQL (120+ keywords), HTML (60+ elements), CSS (32 properties)
- Two display modes: Overlay (default) and Replace
- Visual settings panel for per-keyword emoji configuration
- Toggle command to enable/disable decorations
- Configurable overlay opacity
