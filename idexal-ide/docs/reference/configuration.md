# Configuration Reference

**Document Type:** Reference (Information-oriented)
**Audience:** Users and administrators customizing the IDE
**Goal:** Complete reference for all configuration options

---

## Configuration Files

Idexal IDE uses JSON configuration files at two levels:

| Location | Purpose | Priority |
|---|---|---|
| `~/.idexal/config.json` | User-level defaults | Low |
| `<project>/.idexal/config.json` | Project-level overrides | High |

Project-level settings override user-level settings.

---

## Editor Settings

### Font

```json
{
  "editor": {
    "fontSize": 14,
    "fontFamily": "'JetBrains Mono', monospace",
    "fontLigatures": true,
    "lineHeight": 1.5
  }
}
```

| Setting | Type | Default | Description |
|---|---|---|---|
| `fontSize` | number | `14` | Font size in pixels |
| `fontFamily` | string | `'JetBrains Mono', monospace` | Font family |
| `fontLigatures` | boolean | `true` | Enable font ligatures |
| `lineHeight` | number | `1.5` | Line height multiplier |

### Editor Behavior

```json
{
  "editor": {
    "tabSize": 2,
    "insertSpaces": true,
    "wordWrap": "off",
    "lineNumbers": true,
    "minimap": true,
    "autoSave": true,
    "autoSaveDelay": 1000,
    "formatOnSave": false,
    "bracketPairColorization": true
  }
}
```

| Setting | Type | Default | Description |
|---|---|---|---|
| `tabSize` | number | `2` | Number of spaces per tab |
| `insertSpaces` | boolean | `true` | Use spaces instead of tabs |
| `wordWrap` | string | `"off"` | Word wrap mode: `off`, `on`, `wordWrapColumn` |
| `lineNumbers` | boolean | `true` | Show line numbers |
| `minimap` | boolean | `true` | Show minimap |
| `autoSave` | boolean | `true` | Auto-save on change |
| `autoSaveDelay` | number | `1000` | Auto-save delay in ms |
| `formatOnSave` | boolean | `false` | Format on save |
| `bracketPairColorization` | boolean | `true` | Colorize bracket pairs |

---

## AI Provider Settings

```json
{
  "ai": {
    "activeProvider": "custom",
    "customGateway": {
      "url": "http://localhost:20128/v1",
      "apiKey": "sk-...",
      "model": "auto/best-coding"
    },
    "openai": {
      "apiKey": "sk-...",
      "model": "gpt-4"
    },
    "anthropic": {
      "apiKey": "sk-ant-...",
      "model": "claude-3-opus-20240229"
    },
    "local": {
      "url": "http://localhost:11434",
      "model": "codellama"
    }
  }
}
```

### Provider Options

| Provider | Required Fields | Optional Fields |
|---|---|---|
| `custom` | `url`, `apiKey` | `model` |
| `openai` | `apiKey` | `model` |
| `anthropic` | `apiKey` | `model` |
| `local` | `url`, `model` | — |

---

## Appearance Settings

```json
{
  "appearance": {
    "theme": "dark",
    "accentColor": "#3b82f6",
    "showAnimations": true,
    "compactMode": false
  }
}
```

| Setting | Type | Default | Description |
|---|---|---|---|
| `theme` | string | `"dark"` | Color theme: `dark`, `light`, `system` |
| `accentColor` | string | `"#3b82f6"` | Primary accent color |
| `showAnimations` | boolean | `true` | Enable animations |
| `compactMode` | boolean | `false` | Reduce spacing |

---

## Terminal Settings

```json
{
  "terminal": {
    "shell": "auto",
    "fontSize": 14,
    "fontFamily": "'JetBrains Mono', monospace",
    "cursorStyle": "bar",
    "cursorBlink": true,
    "scrollback": 10000
  }
}
```

| Setting | Type | Default | Description |
|---|---|---|---|
| `shell` | string | `"auto"` | Shell path or `auto` |
| `fontSize` | number | `14` | Terminal font size |
| `fontFamily` | string | `'JetBrains Mono', monospace` | Terminal font |
| `cursorStyle` | string | `"bar"` | Cursor style: `bar`, `block`, `underline` |
| `cursorBlink` | boolean | `true` | Blink cursor |
| `scrollback` | number | `10000` | Lines of scrollback |

---

## Git Settings

```json
{
  "git": {
    "autofetch": true,
    "confirmSync": true,
    "enableSmartCommit": false,
    "watchFetchedChanges": true
  }
}
```

| Setting | Type | Default | Description |
|---|---|---|---|
| `autofetch` | boolean | `true` | Auto-fetch on focus |
| `confirmSync` | boolean | `true` | Confirm before push |
| `enableSmartCommit` | boolean | `false` | Auto-stage on commit |
| `watchFetchedChanges` | boolean | `true` | Watch for fetched changes |

---

## Keybinding Overrides

```json
{
  "keybindings": [
    {
      "key": "ctrl+shift+f",
      "command": "workbench.action.findInFiles"
    },
    {
      "key": "ctrl+g",
      "command": "editor.action.gotoLine"
    }
  ]
}
```

### Default Keybindings

| Shortcut | Command | Description |
|---|---|---|
| `Ctrl+K` | `commandPalette.open` | Open command palette |
| `Ctrl+Shift+A` | `chat.toggle` | Toggle AI chat |
| `Ctrl+B` | `sidebar.toggle` | Toggle sidebar |
| `Ctrl+`` | `terminal.toggle` | Toggle terminal |
| `Ctrl+S` | `file.save` | Save current file |
| `Ctrl+N` | `file.new` | New file |
| `Ctrl+O` | `file.open` | Open file |
| `Ctrl+P` | `quickOpen` | Quick file open |
| `Ctrl+G` | `goToLine` | Go to line |
| `F12` | `goToDefinition` | Go to definition |
| `Shift+F12` | `findReferences` | Find references |

---

## Workspace Settings

```json
{
  "workspace": {
    "exclude": [
      "**/node_modules/**",
      "**/.git/**",
      "**/dist/**"
    ],
    "fileAssociations": {
      "*.idexal": "idexal-project"
    }
  }
}
```

---

## Backup and Export

Settings can be exported/imported through:

1. **Settings UI** → **Data** → **Export Settings**
2. **CLI:** `idexal config export`
3. **File:** Copy `~/.idexal/config.json`

---

*Document: Reference — Configuration*
*Audience: Users and administrators*