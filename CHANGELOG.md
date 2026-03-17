# Changelog

All notable changes to Moji Pro will be documented in this file.

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
