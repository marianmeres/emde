# @marianmeres/emde

[![JSR](https://jsr.io/badges/@marianmeres/emde)](https://jsr.io/@marianmeres/emde)
[![License](https://img.shields.io/github/license/marianmeres/emde)](LICENSE)

Simple, directory-based, markdown-to-HTML static site generator for Deno.

Works out-of-the-box with no configuration, while still being fully extensible when needed.

## Features

- Zero configuration required
- Directory-based page structure
- YAML frontmatter and `meta.yaml` support with hierarchical merging
- Customizable layouts using lodash/EJS templates
- Built-in template helpers for navigation, breadcrumbs, sitemaps
- Hidden content support (directories starting with `_` or `.`)
- Automatic `node_modules` exclusion

## Installation

```sh
# Run directly from JSR
deno run -A jsr:@marianmeres/emde/cli --indir src --outdir dist

# Or add to your project
deno add jsr:@marianmeres/emde
```

## Quick Start

### CLI Usage

```sh
deno run -A jsr:@marianmeres/emde/cli --indir src --outdir dist --verbose
```

Options:
- `--indir` - Source directory containing markdown files (required)
- `--outdir` - Destination directory for generated HTML (required)
- `--force` - Overwrite non-empty destination directory
- `--verbose` - Show progress for each page

### Programmatic Usage

```ts
import { emde } from "@marianmeres/emde";

await emde("./src", "./dist", {
  verbose: true,
  force: true
});
```

## Directory Structure

Each page is a directory containing an `index.md` file:

```
src/
├── index.md              # Root page (/)
├── meta.yaml             # Shared metadata (optional)
├── layout.ejs            # Custom layout (optional)
├── helpers.js            # Custom helpers (optional)
├── about/
│   └── index.md          # /about
├── blog/
│   ├── index.md          # /blog
│   ├── meta.yaml         # Blog section metadata
│   ├── first-post/
│   │   └── index.md      # /blog/first-post
│   └── second-post/
│       └── index.md      # /blog/second-post
└── _drafts/              # Hidden (starts with _)
    └── index.md          # Not included in output
```

Generates:

```
dist/
├── index.html
├── about/
│   └── index.html
└── blog/
    ├── index.html
    ├── first-post/
    │   └── index.html
    └── second-post/
        └── index.html
```

## Special Files

### `index.md` (Required)

The page content in markdown format. Supports YAML frontmatter:

```markdown
---
title: My Page Title
description: Page description for SEO
author: John Doe
custom_field: any value
---

# Hello World

This is my page content.
```

### `meta.yaml` (Optional)

Shared metadata that applies to all pages in the directory and below. Values are
merged from root to leaf, with deeper levels taking precedence.

```yaml
# src/meta.yaml (applies to all pages)
site_name: My Website
author: Default Author

# src/blog/meta.yaml (applies to /blog and children)
section: Blog
author: Blog Team  # Overrides the default
```

### `layout.ejs` (Optional)

Custom EJS template using [lodash template syntax](https://lodash.com/docs/4.17.15#template).
Layouts are inherited from parent directories; the closest one to the page is used.

```ejs
<% const { page, root, parent, _pages, _helpers } = props; %>
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title><%= page.meta.title %> | <%= root?.meta.site_name %></title>
    <style><%= _helpers.reboot() %></style>
  </head>
  <body>
    <nav><%= _helpers.sitemap(props) %></nav>
    <main><%= page.html %></main>
  </body>
</html>
```

If no custom layout is found, a basic default layout is used.

### `helpers.js` (Optional)

Custom helper functions that are merged into `_helpers`. Functions from parent
directories are available, with child directories able to override or extend them.

```js
// src/helpers.js
export function formatDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

export function truncate(text, length = 100) {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}
```

Use in templates:

```ejs
<time><%= _helpers.formatDate(page.meta.date) %></time>
<p><%= _helpers.truncate(page.meta.description, 150) %></p>
```

## Design Tokens

emde includes built-in support for
[@marianmeres/design-tokens](https://jsr.io/@marianmeres/design-tokens) — a structured
color theming system that generates CSS custom properties from a token schema.

Two template helpers are available:

- **`tokens(schema, prefix)`** — generates CSS custom properties only
- **`tokensWithReboot(schema, prefix)`** — generates CSS custom properties + a Bootstrap
  Reboot bridge that maps your tokens to `--bs-*` variables (so links, body, borders,
  headings, etc. automatically pick up your theme)

### Token schema

The schema follows the same mental model as
[@marianmeres/stuic](https://jsr.io/@marianmeres/stuic): colors are split into
**intent** (what the color means) and **role** (what the color does).

```js
const myTheme = {
  light: {
    colors: {
      // Intent colors — semantic purpose
      intent: {
        primary:     { DEFAULT: "#2563eb", foreground: "#ffffff" },
        accent:      { DEFAULT: "#8b5cf6", foreground: "#ffffff" },
        destructive: { DEFAULT: "#dc2626", foreground: "#ffffff" },
        warning:     { DEFAULT: "#d97706", foreground: "#000000" },
        success:     { DEFAULT: "#059669", foreground: "#ffffff" },
      },
      // Role colors — structural function
      role: {
        paired: {
          background: { DEFAULT: "#ffffff", foreground: "#1e293b" },
          muted:      { DEFAULT: "#f1f5f9", foreground: "#64748b" },
          surface:    { DEFAULT: "#e2e8f0", foreground: "#1e293b" },
        },
        single: {
          foreground: "#1e293b",
          border: { DEFAULT: "#cbd5e1" },
          input:  { DEFAULT: "#ffffff" },
          ring:   "color-mix(in srgb, #2563eb 20%, transparent)",
        },
      },
    },
  },
  // dark: { ... }  // optional dark mode with the same structure
};
```

Color values can be any valid CSS color (hex, `rgb()`, `oklch()`, `color-mix()`, named
colors). When `hover` and `active` states are omitted, they are auto-derived using
`color-mix(in oklch, ...)`.

### Usage in layout templates

```ejs
<% const { page, _helpers } = props; %>
<!DOCTYPE html>
<html>
  <head>
    <style><%= _helpers.reboot() %></style>
    <style><%= _helpers.tokensWithReboot(myTheme, "site-") %></style>
  </head>
  <body>
    <%= page.html %>
  </body>
</html>
```

This generates CSS with both your design tokens and the Reboot bridge:

```css
:root {
  /* Design tokens */
  --site-color-primary:           #2563eb;
  --site-color-primary-hover:     color-mix(in oklch, var(--site-color-primary), black 10%);
  --site-color-primary-foreground: #ffffff;
  --site-color-background:        #ffffff;
  --site-color-foreground:        #1e293b;
  /* ... all tokens ... */

  /* Reboot bridge (auto-generated) */
  --bs-body-bg:             #ffffff;
  --bs-body-bg-rgb:         255, 255, 255;
  --bs-body-color:          #1e293b;
  --bs-body-color-rgb:      30, 41, 59;
  --bs-link-color:          #2563eb;
  --bs-link-color-rgb:      37, 99, 235;
  --bs-border-color:        #cbd5e1;
  --bs-danger:              #dc2626;
  /* ... */
}
```

### Using from helpers.js

Typically you'd define the theme in a `helpers.js` file and call the helper from there:

```js
// src/helpers.js
export function topCss(props) {
  return props._helpers.tokensWithReboot(
    {
      light: {
        colors: {
          intent: {
            primary:     { DEFAULT: "#e05050", foreground: "#ffffff" },
            accent:      { DEFAULT: "#8b5cf6", foreground: "#ffffff" },
            destructive: { DEFAULT: "#dc2626", foreground: "#ffffff" },
            warning:     { DEFAULT: "#d97706", foreground: "#000000" },
            success:     { DEFAULT: "#059669", foreground: "#ffffff" },
          },
          role: {
            paired: {
              background: { DEFAULT: "#ffffff", foreground: "#212529" },
              muted:      { DEFAULT: "#f1f5f9", foreground: "#64748b" },
              surface:    { DEFAULT: "#e2e8f0", foreground: "#212529" },
            },
            single: {
              foreground: "#212529",
              border: { DEFAULT: "#dee2e6" },
              input:  { DEFAULT: "#ffffff" },
              ring:   "color-mix(in srgb, #e05050 20%, transparent)",
            },
          },
        },
      },
    },
    "site-",
  );
}
```

Then in `layout.ejs`:

```ejs
<style><%= _helpers.reboot() %></style>
<style><%= _helpers.topCss?.(props) %></style>
```

### Pre-built themes

The `@marianmeres/design-tokens` package ships 29 pre-built themes with light and dark
modes. To use them, import directly in your `helpers.js`:

```js
import { zinc } from "@marianmeres/design-tokens/themes";

export function topCss(props) {
  return props._helpers.tokensWithReboot(zinc, "site-");
}
```

### tokens vs tokensWithReboot

Use `tokens()` when you don't use `reboot()` or want to manage `--bs-*` overrides
yourself. Use `tokensWithReboot()` when your layout includes `reboot()` — it
automatically maps your theme colors to the variables that Reboot's CSS rules consume
(body color/background, link colors with RGB triplets, borders, headings, code, semantic
colors).

## API

See [API.md](API.md) for complete API documentation including template props, built-in
helpers, types, and CLI reference.

## Hidden Content

Directories starting with `_` or `.` are excluded from the output. Use this for
drafts, private notes, or hidden sections. The `node_modules` directory is always excluded.

## Example

See the [example source files](./example/src/) and the generated
[output](./example/dist/) or view it [on the web](https://emde.meres.sk).

To build the example:

```sh
deno task example:build
```

## Limitations

This is a minimal static site generator. If you need:

- Themes and plugins
- Asset optimization (images, CSS/JS minification)
- RSS/Atom feed generation
- Deployment helpers
- Watch mode / dev server
- Incremental builds

...you should probably use a more full-featured solution.

## License

MIT
