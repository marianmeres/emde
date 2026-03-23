# API

## Functions

### `emde(srcDir, destDir, options?)`

Generate a static HTML site from a directory of markdown files.

**Parameters:**
- `srcDir` (string) — Source directory containing markdown content
- `destDir` (string) — Destination directory for generated HTML
- `options` (EmdeOptions, optional) — Configuration options

**Returns:** `Promise<string>` — Path to the generated output directory

**Example:**
```ts
import { emde } from "@marianmeres/emde";

await emde("./src", "./dist", { verbose: true, force: true });
```

---

### `parseFrontMatter(markdown, strict?)`

Extract YAML frontmatter from a markdown string.

**Parameters:**
- `markdown` (string) — Raw markdown string to parse
- `strict` (boolean, optional) — If `true` (default), throws on YAML parse errors. If `false`, returns original content on errors.

**Returns:** `ParsedFrontMatter`

**Example:**
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

---

### `relative(fromPath, toPath)`

Calculate relative path between two page paths.

**Parameters:**
- `fromPath` (string) — Source page path
- `toPath` (string) — Target page path

**Returns:** `string` — Relative path (e.g., `"../"`, `"../../about"`)

**Example:**
```ejs
<a href="<%= _helpers.relative(page.path, '/about') %>/">About</a>
```

---

## CLI

```sh
deno run -A jsr:@marianmeres/emde/cli --indir src --outdir dist
```

**Flags:**
- `--indir` — Source directory (required)
- `--outdir` — Destination directory (required)
- `--force` — Overwrite non-empty destination
- `--verbose` — Log progress per page

---

## Types

### `EmdeOptions`

```ts
interface EmdeOptions {
  verbose?: boolean;  // Log progress (default: true)
  force?: boolean;    // Overwrite non-empty dest (default: false)
}
```

### `Page`

```ts
interface Page {
  path: string;                  // e.g., "/blog/first-post"
  parent: Page | null;           // Parent page reference
  meta: Record<string, any>;     // Merged frontmatter + meta.yaml
  content: string;               // Raw markdown (without frontmatter)
  depth: number;                 // Hierarchy level (0 for root)
}
```

### `Props`

Template context passed to `layout.ejs` files via the `props` variable.

```ts
interface Props {
  page: Page;                         // Currently rendered page
  root: Page | null;                  // Root page (at "/")
  parent: Page | null;                // Parent of current page
  _pages: Record<string, Page>;       // All pages by path
  _helpers: Helpers;                  // Helper functions
}
```

### `Helpers`

Built-in and custom helper functions available via `_helpers` in templates.

```ts
interface Helpers extends Record<string, any> {
  _: typeof lodash;
  SEPARATOR: string;
  ItemCollection: typeof ItemCollection;
  breadcrumbs: (props: Props) => Page[];
  children: (props: Props) => Page[];
  siblings: (props: Props) => Page[];
  sitemap: (props: Props, config?: Partial<SitemapOpts>) => string;
  relative: (fromPath: string, toPath: string) => string;
  reboot: () => string;
  tokens: (schema: ThemeSchema, prefix: string) => string;
  tokensWithReboot: (schema: ThemeSchema, prefix: string) => string;
  qsa: (selector: string, context?: any) => any[];
}
```

### `SitemapOpts`

```ts
interface SitemapOpts {
  ulClass: string;  // CSS class for <ul> elements
  liClass: string;  // CSS class for <li> elements
  aClass: string;   // CSS class for <a> elements
}
```

### `ParsedFrontMatter`

```ts
interface ParsedFrontMatter {
  meta: null | Record<string, any>;  // Parsed YAML metadata
  content: string;                   // Markdown with frontmatter removed
}
```

---

## Built-in Template Helpers

### `breadcrumbs(props)`

Returns array of `Page` objects from root to current page.

```ejs
<% _helpers.breadcrumbs(props).forEach((crumb, i, arr) => { %>
  <% if (i < arr.length - 1) { %>
    <a href="<%= _helpers.relative(page.path, crumb.path) %>/"><%= crumb.meta.title %></a>
  <% } else { %>
    <span><%= crumb.meta.title %></span>
  <% } %>
<% }); %>
```

### `children(props)`

Returns array of direct child `Page` objects.

```ejs
<% _helpers.children(props).forEach((child) => { %>
  <a href="<%= _helpers.relative(page.path, child.path) %>/"><%= child.meta.title %></a>
<% }); %>
```

### `siblings(props)`

Returns array of sibling `Page` objects (same parent, excluding current).

```ejs
<% _helpers.siblings(props).forEach((sib) => { %>
  <a href="<%= _helpers.relative(page.path, sib.path) %>/"><%= sib.meta.title %></a>
<% }); %>
```

### `sitemap(props, config?)`

Generates hierarchical HTML sitemap with nested `<ul>/<li>/<a>` elements. Each element includes a `data-depth` attribute.

```ejs
<nav><%= _helpers.sitemap(props) %></nav>

<!-- With CSS classes -->
<%= _helpers.sitemap(props, { ulClass: 'nav-list', liClass: 'nav-item', aClass: 'nav-link' }) %>
```

### `reboot()`

Returns Bootstrap Reboot v5.3.7 CSS as a minified string.

```ejs
<style><%= _helpers.reboot() %></style>
```

### `tokens(schema, prefix)`

Generates CSS custom properties from a design token schema. Uses [@marianmeres/design-tokens](https://jsr.io/@marianmeres/design-tokens).

- `schema` (`ThemeSchema`) — Token schema with `light` (required) and optional `dark` mode
- `prefix` (`string`) — CSS variable prefix (e.g. `"site-"`, `"my-"`)

Returns a CSS string with `:root { ... }` and optional `:root.dark { ... }` blocks.

```ejs
<style><%= _helpers.tokens(myTheme, "site-") %></style>
```

### `tokensWithReboot(schema, prefix)`

Same as `tokens()` but also maps design tokens to Bootstrap Reboot's `--bs-*` variables (`--bs-body-color`, `--bs-link-color-rgb`, `--bs-border-color`, etc.). Use when your layout includes `_helpers.reboot()`.

```ejs
<style><%= _helpers.reboot() %></style>
<style><%= _helpers.tokensWithReboot(myTheme, "site-") %></style>
```

See [README.md](README.md#design-tokens) for the full token schema structure and examples.

### `qsa(selector, context?)`

Client-side `querySelectorAll` wrapper that returns an array instead of a NodeList. Useful in `helpers.js` for DOM manipulation in generated pages.

```js
export function highlightCode() {
  qsa('pre code').forEach(el => hljs.highlightElement(el));
}
```

### Additional Objects

- **`_`** — Full [lodash](https://lodash.com/docs/4.17.15) library
- **`SEPARATOR`** — Platform path separator
- **`ItemCollection`** — [@marianmeres/item-collection](https://github.com/marianmeres/item-collection) utility class
