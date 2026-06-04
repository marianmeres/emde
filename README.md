# @marianmeres/emde

[![JSR](https://jsr.io/badges/@marianmeres/emde)](https://jsr.io/@marianmeres/emde)
[![License](https://img.shields.io/github/license/marianmeres/emde)](LICENSE)

Simple, directory-based, markdown-to-HTML static site generator for Deno.

Works out-of-the-box with no configuration, while still being fully extensible when needed.

## Features

- Zero configuration required
- Directory-based page structure
- YAML frontmatter and `meta.yaml` support with hierarchical merging
- Customizable layouts using lodash/EJS templates, with cascade up the directory tree
- Named layouts resolved by `meta.layout` from your `--layouts` / `options.layouts` directories (copy-paste starter layouts live in [`example-layouts/layouts/`](./example-layouts/layouts/))
- Built-in template helpers for navigation, breadcrumbs, sitemaps, SEO, hreflang, JSON-LD, design tokens (incl. bundled themes by name), full `<head>` / document shells, and inlining [`@marianmeres/vanilla`](https://jsr.io/@marianmeres/vanilla) for client-side reactivity
- Watch mode (`--watch`) with debounced, serialized rebuilds
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
- `--force` - Empty and rewrite a non-empty destination directory
- `--verbose` - Show progress for each page
- `--watch` - Rebuild on file changes in `--indir` and `--layouts` (debounced)
- `--layouts` - Extra layout directory; repeat for multiple (left-to-right priority)

### Programmatic Usage

```ts
import { emde } from "@marianmeres/emde";

await emde("./src", "./dist", {
  verbose: true,
  force: true,
  layouts: ["./my-layouts"], // optional extra dirs searched by `meta.layout` name
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
Layouts cascade from the page's own directory upward to the source root; the closest
ancestor `layout.ejs` is used. If none is found and `meta.layout: <name>` is set, emde
looks for `<name>.ejs` in each `options.layouts` directory (left → right). emde ships no
bundled layouts — see [named layouts](#named-layouts) below.

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

If no custom layout is found and `meta.layout` is unset, a basic default layout is used.

#### Named layouts

Set `layout: <name>` in `meta.yaml` (or page frontmatter) to resolve `<name>.ejs` by
name from your `--layouts` / `options.layouts` directories. emde **does not bundle any
layouts** — if `meta.layout` is set but no matching file is found, the build throws.

Seven copy-paste starter layouts (`blog`, `docs`, `landing`, `minimal`, `news`,
`personal`, `storefront`) live in [`example-layouts/layouts/`](./example-layouts/layouts/);
[`example-layouts/src/`](./example-layouts/src/) is a working showcase (built with
`--layouts ./example-layouts/layouts`). Copy the ones you want into your own project.

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

The `@marianmeres/design-tokens` package ships dozens of pre-built themes with light and
dark modes, all reachable by **kebab-case name** through the built-in `theme()` helper —
no `helpers.js` wiring needed. It returns the theme's CSS custom properties **with the
Bootstrap Reboot bridge** baked in, so pair it with `reboot()`:

```ejs
<head>
  <style><%= _helpers.reboot() %></style>
  <style><%= _helpers.theme("indigo-amber") %></style>
</head>
```

The default token prefix is `site-`; override it with a second argument:
`_helpers.theme("zinc", "my-")`. An unknown name throws with the list of valid names.

If you'd rather pass a schema object (e.g. a custom theme) instead of a bundled name,
import it in `helpers.js` and call `tokensWithReboot` directly:

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

## Client-side reactivity

The `vanilla()` helper returns [`@marianmeres/vanilla`](https://jsr.io/@marianmeres/vanilla)
— a tiny, zero-dependency reactive DOM library — as a single inlinable JS string,
mirroring how `reboot()` inlines CSS. Drop it into the `<head>`; it binds the library to
`globalThis.vanilla`:

```ejs
<head>
  <script><%= _helpers.vanilla() %></script>
</head>
<body>
  <div id="app"></div>
  <template id="counter">
    <output data-ref="value">0</output>
    <button data-on="click:inc">+</button>
  </template>
  <script>
    // runs after the DOM exists; `vanilla` is already defined
    const { observable, reactTo, fromTemplate, refs, delegate } = globalThis.vanilla;
    const node = fromTemplate("counter");
    document.getElementById("app").appendChild(node);
    const r = refs(node), count = observable(0);
    reactTo([count], () => { r.value.textContent = count.get(); });
    delegate(node, { inc: () => count.update((n) => n + 1) });
  </script>
</body>
```

Notes: include it **once per page**; your wiring code must run **after** the DOM exists
(end of `<body>` or `DOMContentLoaded`); inlining requires a CSP that allows inline
scripts (`script-src 'unsafe-inline'` or a nonce/hash). For many-page sites that want a
shared browser cache, self-host the library as an external script instead and cache-bust
the URL with `versionHash()`. See [`example/src/x/vanilla/`](./example/src/x/vanilla/) for
a runnable demo.

The vendored bundle is regenerated from JSR with `deno task vendor:vanilla`.

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
- A live-reload dev server (watch mode rebuilds, but does not serve)
- Incremental builds

...you should probably use a more full-featured solution.

## Errors and `--force` behavior

- A malformed `meta.yaml` or page frontmatter is fatal. The build throws an
  `AggregateError` listing each affected page; nothing is silently dropped.
- `--force` empties `destDir` and writes the new build into it. The directory's inode
  is preserved (safe for symlinks, mount points, file watchers), but **all
  pre-existing contents are removed**. Put assets you want to keep (e.g. `CNAME`,
  static images) inside `srcDir` so they are copied through.

## License

MIT
