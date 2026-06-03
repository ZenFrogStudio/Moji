# Changelog

All notable changes to Moji will be documented in this file.

## [1.4.31] - 2026-06-03

### Changed
- Removed the legacy `contributes.configuration` surface from the extension manifest now that Moji settings are stored in the extension-owned app settings file, preventing VS Code from showing dead `mojiPro.*` settings entries.
- Trimmed obsolete VSIX packaging exceptions for deleted artwork and old branding assets so the published package matches the current source tree more closely.

## [1.4.30] - 2026-06-03

### Changed
- Switched the extension Marketplace identity to `ZenFrog.moji` by updating the manifest `name` to `moji` and the publisher ID to `ZenFrog`.
- Cleaned the repository of stale packaged builds and temporary VSIX inspection artifacts, and tightened ignore rules so those files no longer ship or linger in the repo.

## [1.4.29] - 2026-06-03

### Changed
- Finalized the public branding as `Moji` across the display name, local debug configuration, and shipped documentation while keeping the legacy internal extension ID for compatibility.
- Removed the README migration notice and simplified the license wording to freeware terminology so the extension no longer references the retired paid or transitional release state.
- Renamed the extension-owned app settings file to `moji-settings.json` and added compatibility migration from the previous `moji-pro-settings.json` filename.

## [1.4.28] - 2026-06-03

### Changed
- Migrated Moji-owned settings from VS Code user settings into an extension-managed app settings file stored under the extension's global storage directory.
- Added first-run migration that imports existing `mojiPro.*` settings and legacy per-keyword decoration toggles, writes them into the app settings file, and clears the migrated values from VS Code settings.
- Switched runtime settings reads, settings-panel writes, and decorator refreshes over to the new app settings store so Moji now updates from its own persisted settings source.

## [1.4.27] - 2026-06-02

### Changed
- Removed obsolete manual sample fixtures from `test/` so the repository no longer carries unreferenced demo files or broken sample HTML asset links.
- Pruned the unused category exports in `src/decorationCategories.js` to reduce the extension's maintenance surface.
- Refactored repeated webview checkbox-list generation in `src/settingsPanel.js` into shared helpers without changing the rendered settings UI.
- Refactored `src/reactComponentDetector.js` to share component-range parsing paths and added regression coverage for typed arrow components and exported default function components.

## [1.4.26] - 2026-05-19

### Fixed
- Excluded temporary `.tmp-*` inspection artifacts from the VSIX package so release builds only contain extension files.
- Updated the package script to build with `--no-dependencies`, avoiding the Windows `vsce` dependency-scan `spawn EPERM` failure for this dependency-free extension.

## [1.4.25] - 2026-05-19

### Fixed
- Removed README screenshot embeds that were rendering as broken images in VS Code extension details because packaging rewrote them to GitHub-hosted URLs that were not yet publicly available.
- Relaxed the README image validation test so screenshots remain optional, while any future image references are still checked for valid local files or tracked GitHub raw targets.

## [1.4.24] - 2026-05-19

### Fixed
- Added a README screenshot validation test so GitHub-hosted image URLs cannot ship if they still point at untracked local files.
- Updated the packaging script to run the test suite before building a VSIX, preventing another release with broken extension-detail screenshots.

## [1.4.23] - 2026-05-19

### Fixed
- Switched README screenshots to absolute GitHub-hosted image URLs because package-relative screenshot paths were still not rendering reliably in the extension details view.

## [1.4.22] - 2026-05-19

### Changed
- Re-included the README screenshots in the packaged VSIX so they render correctly for users viewing the extension details inside VS Code.

## [1.4.21] - 2026-05-19

### Changed
- Restored the Marketplace display name to `Moji Pro` so the final legacy-listing update matches the existing `Lucidian.moji-pro` listing metadata during upload.

## [1.4.20] - 2026-05-19

### Changed
- Restored the manifest extension name to `moji-pro` so the VSIX can be uploaded to the existing Marketplace listing whose extension ID still uses that name.

## [1.4.19] - 2026-05-19

### Changed
- Restored the extension manifest to the existing `Lucidian.MojiCode` Marketplace identity so this release can be published as the final update for current users before unpublishing.

## [1.4.18] - 2026-05-19

### Changed
- Added a README screenshot showing Moji in use inside the editor, alongside the existing settings and Unicode customization screenshots.

## [1.4.17] - 2026-05-19

### Changed
- Added README screenshots for the settings panel and Unicode emoji customization flow to better explain code block highlighting, React component outlines, and per-keyword emoji editing.

## [1.4.16] - 2026-05-19

### Changed
- Refined the README so the current feature set is clearer and easier to scan, including code block highlighting, React component outlines, Unicode-based emoji customization, and simplified usage guidance.

## [1.4.15] - 2026-05-19

### Changed
- Added a README migration notice explaining that this Marketplace listing will be unpublished and that the replacement release will move to the `ZenFrog` publisher account.
- Updated release metadata for the final legacy-listing handoff release.

## [1.4.14] - 2026-05-19

### Changed
- Restored the published extension identifier to `MojiCode` so Marketplace updates keep the existing extension name.
- Updated the VS Code Marketplace manifest for the Zen Frog release, including the `ZenFrog` publisher identifier, support email, and GitHub repository links.
- Aligned the extension package name and lockfile metadata with the final Moji release branding.

## [1.4.13] - 2026-04-20

### Fixed
- Tightened VSIX packaging exclusions so local test fixtures, Supabase temp files, and unused source artwork are not published.
- Restored `CHANGELOG.md` inclusion in the packaged extension.
- Packaged the extension with the updated PNG icon asset.
- Removed forward-looking roadmap and update promises from the README for the final release.
- Made Toggle commands persist their setting changes and repaint all visible editors.
- Restricted the settings webview from loading local extension resources it does not need.

## [1.4.12] - 2026-04-20

### Changed
- Moved code block highlighting and React component outline controls into the General settings tab.

### Removed
- Removed the standalone Code Blocks settings tab.

## [1.4.11] - 2026-04-20

### Changed
- Changed the project license to proprietary freeware.
- Updated package metadata and README license wording.

## [1.4.10] - 2026-04-20

### Changed
- Renamed the extension from Moji Pro to Moji across user-facing commands, settings UI, docs, and package metadata.
- Kept the existing `mojiPro.*` command IDs and settings namespace for backward compatibility.

## [1.4.9] - 2026-04-20

### Removed
- Removed the commercial activation system, purchase commands, settings-panel activation UI, and Supabase purchase/activation backend artifacts.

### Changed
- Made all supported language decorations available immediately after installation.
- Removed the unused Supabase CLI development dependency.

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
- Fixed React component outline settings reloads during editor-switch/configuration debounce handling.
- Reduced React outline false positives by requiring detected components to return JSX.
- Hardened settings-panel message handling with explicit setting allowlists, typed value validation, safe external URL opening, and escaped keyword row rendering.

## [1.4.2] - 2026-04-19

### Fixed
- Fixed commercial activation backend issues that were later removed in 1.4.9.

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
- Toggle command `Moji: Toggle Code Block Highlighting` to enable/disable the feature without opening settings
- New **Code Blocks** tab in the Moji Settings panel with a master on/off toggle
- Four new settings under `mojiPro.codeBlocks.*`: `enabled`, `borderColor`, `backgroundColor`, `borderWidth`
- Code block highlighting is enabled by default

## [1.0.1] - 2026-03-13

### Improved
- Significant performance improvements to decorator rendering
- Refactored scanner architecture — all language scanners now share a common factory, reducing duplication and improving maintainability
- Settings panel performance optimizations

## [1.0.0] - 2026-03-04

### Changed
- Rebranded extension from MojiCode Pro to Moji
- Renamed VS Code command and configuration namespace from `mojiCode.*` to `mojiPro.*`

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
