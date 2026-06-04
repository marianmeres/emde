# API

## Functions

### `emde(srcDir, destDir, options?)`

Generate a static HTML site from a directory of markdown files.

**Parameters:**
- `srcDir` (string) — Source directory containing markdown content
- `destDir` (string) — Destination directory for generated HTML
- `options` (EmdeOptions, optional) — Configuration options

**Returns:** `Promise<string>` — Path to the generated output directory

**Throws:**
- `TypeError` — If `srcDir` does not exist, if `destDir` equals `srcDir`, if `destDir` is inside `srcDir`, if `srcDir` is inside `destDir`, or if `destDir` is non-empty and `force` is not set.
- `AggregateError` — If one or more pages fail to parse or render. The error message lists each failed page with its stage (`info` or `generation`) and the underlying error. Built output is still moved to `destDir`; the throw signals partial failure so CI can react.

**Example:**
```ts
import { emde } from "@marianmeres/emde";

await emde("./src", "./dist", {
  verbose: true,
  force: true,
  layouts: ["./my-layouts"],
});
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
deno run -A jsr:@marianmeres/emde/cli --indir src --outdir dist [options]
```

**Flags:**
- `--indir <path>` — Source directory (required)
- `--outdir <path>` — Destination directory (required)
- `--force` — Overwrite a non-empty destination directory
- `--verbose` — Log each processed page
- `--watch` — Rebuild on file changes in `--indir` and any `--layouts` paths (debounced 300 ms; rebuilds are serialized)
- `--layouts <path>` — Layout directory searched by name for `meta.layout`; repeat for multiple paths (priority left → right). emde ships no bundled layouts.
- `--help`, `-h` — Show help

**Example:**
```sh
deno run -A jsr:@marianmeres/emde/cli --indir src --outdir dist \
  --layouts ./my-layouts --layouts ./shared --force --verbose
```

---

## Behavior Notes

### Layout resolution order

1. `layout.ejs` in the page's own directory
2. `layout.ejs` in any ancestor directory, walking up to the source root
3. If `meta.layout: <name>` is set, look for `<name>.ejs` in each `options.layouts` directory (left → right). emde ships no bundled layouts, so an unresolved named layout throws.
4. Otherwise (no `meta.layout`), a basic built-in fallback layout

### Metadata merging

`meta.yaml` values cascade root → leaf, with deeper directories taking precedence. Frontmatter on the page itself wins over all `meta.yaml` values.

### Helper merging

`helpers.js` exports cascade root → leaf, with deeper directories taking precedence.

### Strict YAML parsing

A malformed `meta.yaml` (or frontmatter, with `strict: true`) is fatal — the build throws an `AggregateError` listing affected pages. There is no warn-and-continue mode.

### `--force` publish step

When `force: true` (or `--force`), the destination is emptied with `emptyDirSync` and the generated output copied in. The destination directory's inode is preserved (safe for symlinks, mount points, and file watchers). All pre-existing contents of `destDir` are removed; put assets you want preserved (e.g. `CNAME`) inside `srcDir` so they are copied through.

### Named layouts

Use `meta.layout: <name>` to resolve `<name>.ejs` by name from your `options.layouts`
(`--layouts`) directories. emde **bundles no layouts** — an unresolved named layout is a
hard error.

Seven copy-paste starter layouts (`blog`, `docs`, `landing`, `minimal`, `news`,
`personal`, `storefront`) live in `example-layouts/layouts/`; `example-layouts/src/`
demonstrates them (built with `--layouts ./example-layouts/layouts`).

---

## Types

### `EmdeOptions`

```ts
interface EmdeOptions {
  verbose?: boolean;   // Log progress (default: true)
  force?: boolean;     // Overwrite non-empty dest (default: false)
  layouts?: string[];  // Extra layout directories searched by name from meta.layout
}
```

### `Page`

```ts
interface Page {
  path: string;                  // e.g., "/blog/first-post"
  parent: Page | null;           // Parent page reference
  meta: Record<string, any>;     // Merged frontmatter + meta.yaml
  content: string;               // Raw markdown (without frontmatter)
  html: string;                  // HTML rendered from content
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
  vanilla: () => string;
  tokens: (schema: ThemeSchema, prefix: string) => string;
  tokensWithReboot: (schema: ThemeSchema, prefix: string) => string;
  theme: (name: string, prefix?: string) => string;
  qsa: (selector: string, context?: any) => any[];
  versionHash: () => string;
  seoMeta: (props: Props, config?: SeoConfig) => string;
  hreflang: (props: Props, config?: HreflangConfig) => string;
  jsonLd: (props: Props, config?: JsonLdConfig) => string;
  htmlHead: (props: Props, options?: HtmlHeadOptions) => string;
  htmlShell: (props: Props, options: HtmlShellOptions) => string;
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

### `SeoConfig`

```ts
interface SeoConfig {
  siteName?: string;             // og:site_name and title suffix
  siteUrl?: string;              // canonical base URL, no trailing slash
  defaultImage?: string;         // fallback OG image
  twitterHandle?: string;        // @handle
  titleSuffix?: string;          // overrides siteName as suffix
  titleSuffixSeparator?: string; // default " | "
}
```

### `HreflangConfig`

```ts
interface HreflangConfig {
  locales?: string[];       // e.g. ["en", "sk"]; auto-detected from /<locale>/ paths if omitted
  defaultLocale?: string;   // for x-default; falls back to locales[0]
  siteUrl?: string;         // if omitted, hrefs are relative
}
```

### `JsonLdConfig`

```ts
interface JsonLdConfig {
  siteName?: string;
  siteUrl?: string;  // required for output; otherwise returns ""
}
```

### `HtmlHeadOptions`

```ts
interface HtmlHeadOptions {
  title?: string;
  titleSuffix?: string;
  titleSuffixSeparator?: string;  // default " | "
  reboot?: boolean;
  tokens?: { schema: ThemeSchema; prefix: string; withReboot?: boolean };
  css?: string | string[];        // inline CSS
  stylesheets?: string[];         // external <link> tags
  seo?: SeoConfig;
  hreflang?: HreflangConfig;
  jsonLd?: JsonLdConfig;
  scripts?: Array<string | { src: string; defer?: boolean; async?: boolean }>;
  extra?: string;                  // raw HTML appended at end of <head>
}
```

### `HtmlShellOptions`

```ts
interface HtmlShellOptions extends HtmlHeadOptions {
  lang?: string;                          // <html lang="...">; defaults to page.meta.lang ?? "en"
  bodyClass?: string;
  bodyAttrs?: Record<string, string>;
  body: string;                           // required body HTML
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

### `vanilla()`

Returns [`@marianmeres/vanilla`](https://jsr.io/@marianmeres/vanilla) — a tiny,
zero-dependency reactive DOM library — as a single inlinable JS string (a self-contained
IIFE that binds the library to `globalThis.vanilla`). Mirrors `reboot()`, but for JS:

```ejs
<head>
  <script><%= _helpers.vanilla() %></script>
</head>
```

Client code then destructures what it needs, e.g. `const { observable, reactTo } = vanilla;`.
Include it once per page; run wiring code after the DOM exists; inlining requires a CSP
allowing inline scripts. The vendored bundle is regenerated from JSR with
`deno task vendor:vanilla`. See `example/src/x/vanilla/` for a runnable demo.

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

### `theme(name, prefix?)`

Returns a **bundled** `@marianmeres/design-tokens` theme as CSS, including the Bootstrap Reboot bridge (equivalent to `tokensWithReboot` for that theme). Themes are looked up by **kebab-case** name — no `helpers.js` import needed.

- `name` (`string`) — Kebab-case theme name, e.g. `"zinc"`, `"indigo-amber"`, `"slate-teal-ocean"` (matches the design-tokens CSS filenames)
- `prefix` (`string`, optional) — CSS variable prefix. Default `"site-"`

Throws if `name` is not a bundled theme (the message lists the valid names). Light + dark blocks are emitted automatically.

```ejs
<style><%= _helpers.reboot() %></style>
<style><%= _helpers.theme("indigo-amber") %></style>
```

### `versionHash()`

Returns a short random hash, constant within a single build process. Use as a cache-buster query string for static assets.

```ejs
<link rel="stylesheet" href="/style.css?v=<%= _helpers.versionHash() %>" />
<script src="/app.js?v=<%= _helpers.versionHash() %>"></script>
```

Note: in `--watch` mode all rebuilds within one CLI process share the same hash; restart the process to bump it.

### `seoMeta(props, config?)`

Generates SEO meta tags: `<title>`, description, canonical, Open Graph, Twitter Card. All tags are conditional — missing values produce no empty tags. Reads `page.meta.title`, `description`, `image`, `noindex`, `og:type`.

```ejs
<head>
  <%= _helpers.seoMeta(props, { siteName: "MySaaS", siteUrl: "https://example.com" }) %>
</head>
```

### `hreflang(props, config?)`

Generates `<link rel="alternate" hreflang="...">` tags for multilanguage sites with `/<locale>/...` URL structure. Only emits tags for locales whose equivalent page actually exists in `_pages`.

```ejs
<%= _helpers.hreflang(props, { locales: ["en", "sk"], siteUrl: "https://example.com" }) %>
```

### `jsonLd(props, config?)`

Generates a `<script type="application/ld+json">` `BreadcrumbList` for Google rich results. Requires `siteUrl`. Returns empty string at the root or when no `siteUrl` is provided. JSON content uses `\u003c` / `\u003e` / `\u0026` escapes so any `<`, `>`, `&` in titles round-trips cleanly through `JSON.parse`.

```ejs
<%= _helpers.jsonLd(props, { siteUrl: "https://example.com" }) %>
```

### `htmlHead(props, options?)`

Builds the inner content of `<head>`: charset + viewport (always), then conditionally title, SEO, hreflang, JSON-LD, reboot CSS, design tokens, inline CSS, external stylesheets, scripts, and arbitrary extra HTML — only what you explicitly request. Attribute values (URLs in `stylesheets`, `scripts`) are HTML-escaped.

```ejs
<head>
  <%= _helpers.htmlHead(props, {
    reboot: true,
    seo: { siteName: "My Site", siteUrl: "https://example.com" },
    tokens: { schema: page.meta.tokens, prefix: "site-" },
    stylesheets: ["/style.css"],
    scripts: [{ src: "/app.js", defer: true }]
  }) %>
</head>
```

### `htmlShell(props, options)`

Builds an entire HTML document (`<!DOCTYPE html>` … `</html>`). Delegates the head to `htmlHead`, then wraps `options.body` in a `<body>` with optional class and attributes. `lang` defaults to `page.meta.lang ?? "en"`.

```ejs
<%= _helpers.htmlShell(props, {
  reboot: true,
  seo: { siteName: "My Site" },
  bodyClass: "page",
  body: '<main>' + page.html + '</main>'
}) %>
```

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
