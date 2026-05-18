# Frontmatter Button

Frontmatter Button is a small standalone Obsidian plugin that prepends configurable YAML frontmatter to the currently open Markdown note.

## Features

- Adds a command palette command: `Add default frontmatter to current note`
- Works on desktop and mobile
- Can be added to the Obsidian mobile toolbar
- Supports `{{date}}`, `{{title}}`, and `{{time}}` template variables
- Refuses to add frontmatter when the note already starts with YAML frontmatter
- Optional excluded folders

## Default Template

```yaml
---
created: {{date}}
updated: {{date}}
type: inbox
status: unprocessed
source: manual
processed: false
tags: []
---
```

## Development

Install dependencies:

```sh
npm install
```

Build the plugin:

```sh
npm run build
```

For local Obsidian testing, copy or symlink this folder into:

```text
<vault>/.obsidian/plugins/frontmatter-button
```

Obsidian needs `main.js` and `manifest.json` to load the plugin.
