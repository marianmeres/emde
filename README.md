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
deno task build:example
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
