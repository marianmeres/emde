# @marianmeres/emde

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

## Template Props

The `props` object passed to layout templates:

```ts
interface Props {
  page: Page;              // Currently rendered page
  root: Page | null;       // Root page (at "/")
  parent: Page | null;     // Parent of current page
  _pages: Record<string, Page>;  // All pages by path
  _helpers: Helpers;       // Helper functions
}

interface Page {
  path: string;            // e.g., "/blog/first-post"
  parent: Page | null;     // Parent page reference
  meta: Record<string, any>;  // Merged frontmatter + meta.yaml
  content: string;         // Raw markdown (without frontmatter)
  depth: number;           // Hierarchy level (0 for root)
}
```

## Built-in Helpers

All helpers are available via `_helpers` in templates:

### `breadcrumbs(props)`

Returns array of pages from root to current page.

```ejs
<nav aria-label="Breadcrumb">
  <ol>
    <% _helpers.breadcrumbs(props).forEach((crumb, i, arr) => { %>
      <li>
        <% if (i < arr.length - 1) { %>
          <a href="<%= _helpers.relative(page.path, crumb.path) %>/"><%= crumb.meta.title %></a>
        <% } else { %>
          <span aria-current="page"><%= crumb.meta.title %></span>
        <% } %>
      </li>
    <% }); %>
  </ol>
</nav>
```

### `children(props)`

Returns array of direct child pages.

```ejs
<% const kids = _helpers.children(props); %>
<% if (kids.length) { %>
  <h2>In this section</h2>
  <ul>
    <% kids.forEach((child) => { %>
      <li><a href="<%= _helpers.relative(page.path, child.path) %>/"><%= child.meta.title %></a></li>
    <% }); %>
  </ul>
<% } %>
```

### `siblings(props)`

Returns array of sibling pages (same parent, excluding current).

```ejs
<% const sibs = _helpers.siblings(props); %>
<% if (sibs.length) { %>
  <h2>See also</h2>
  <ul>
    <% sibs.forEach((sib) => { %>
      <li><a href="<%= _helpers.relative(page.path, sib.path) %>/"><%= sib.meta.title %></a></li>
    <% }); %>
  </ul>
<% } %>
```

### `sitemap(props, config?)`

Generates hierarchical HTML sitemap with nested `<ul>/<li>/<a>` elements.

```ejs
<!-- Basic usage -->
<nav><%= _helpers.sitemap(props) %></nav>

<!-- With CSS classes -->
<%= _helpers.sitemap(props, {
  ulClass: 'nav-list',
  liClass: 'nav-item',
  aClass: 'nav-link'
}) %>
```

### `relative(fromPath, toPath)`

Calculates relative path between two page paths.

```ejs
<a href="<%= _helpers.relative(page.path, '/about') %>/">About</a>
<a href="<%= _helpers.relative(page.path, parent.path) %>/">Back</a>
```

### `reboot()`

Returns Bootstrap Reboot v5.3.7 CSS as a minified string.

```ejs
<style><%= _helpers.reboot() %></style>
```

### Additional Available Objects

- `_` - Full lodash library
- `SEPARATOR` - Platform path separator
- `ItemCollection` - [@marianmeres/item-collection](https://github.com/marianmeres/item-collection)

## Hidden Content

Directories starting with `_` or `.` are excluded from the output. Use this for:

- Draft content (`_drafts/`)
- Private notes (`_notes/`)
- Hidden sections (`.hidden/`)

The `node_modules` directory is always excluded.

## Example

See the [example source files](./example/src/) and the generated
[output](./example/dist/) or view it [on the web](https://emde.meres.sk).

To build the example:

```sh
deno task build:example
```

## Utilities

The package also exports a frontmatter parser:

```ts
import { parseFrontMatter } from "@marianmeres/emde";

const result = parseFrontMatter(`---
title: Hello
date: 2024-01-15
---

# Content here
`);

console.log(result.meta);    // { title: "Hello", date: "2024-01-15" }
console.log(result.content); // "# Content here"
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
