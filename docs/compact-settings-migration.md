# Compact Settings Migration

## Current Release

Version `1.4.5` introduced compact per-decoration storage.

New setting:

```json
"mojiPro.disabledDecorations": {
  "javascript": ["await", "debugger"],
  "htmlTag": ["iframe"]
}
```

Decoration toggles are now read and written through:

- `src/decorationCategories.js`
- `src/settingsStore.js`
- `src/decorator.js`
- `src/settingsPanel.js`

The settings panel no longer writes individual per-keyword settings such as:

```json
"mojiPro.jsKeyword.await": false
```

## Why Legacy Settings Still Exist

The 694 legacy per-decoration settings remain registered in `package.json` temporarily so the extension can migrate existing user settings cleanly.

Migration runs from:

```js
migrateLegacyDecorationSettings(context)
```

in `src/extension.js`.

It:

1. Uses `inspect()` to find explicit global legacy values.
2. Converts explicit `false` values into `mojiPro.disabledDecorations`.
3. Removes explicit legacy `true` / `false` values from global settings.
4. Stores completion in `context.globalState` under:

```text
settingsMigration.compactDecorations.v1
```

## Next Release Cleanup

In the next release, remove the legacy per-decoration settings from `package.json`:

- `mojiPro.jsKeyword.*`
- `mojiPro.htmlTag.*`
- `mojiPro.htmlVoid.*`
- `mojiPro.htmlAttr.*`
- `mojiPro.cssAtRule.*`
- `mojiPro.cssLayout.*`
- `mojiPro.cssBox.*`
- `mojiPro.cssVisual.*`
- `mojiPro.cssPseudo.*`
- `mojiPro.cssValue.*`
- `mojiPro.pyKeyword.*`
- `mojiPro.cKeyword.*`
- `mojiPro.cppKeyword.*`
- `mojiPro.csharpKeyword.*`
- `mojiPro.sqlKeyword.*`
- `mojiPro.tsKeyword.*`
- `mojiPro.javaKeyword.*`

Keep master toggles such as:

```json
"mojiPro.javascriptKeywords": true,
"mojiPro.htmlTags": true,
"mojiPro.pythonKeywords": true
```

Keep compact setting:

```json
"mojiPro.disabledDecorations": {}
```

## Verification For Cleanup Release

After removing legacy settings:

1. Run `npm test`.
2. Confirm keyword toggles write only `mojiPro.disabledDecorations`.
3. Confirm decorators still respect disabled items.
4. Confirm custom emoji overrides still work.
5. Confirm no code reads `vscode.workspace.getConfiguration('mojiPro.jsKeyword')` or other legacy namespaces.

Future handoff prompt:

```text
Read docs/compact-settings-migration.md and implement the next-release cleanup.
```
