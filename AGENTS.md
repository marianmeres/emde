# @marianmeres/emde — Agent Guide

## Quick Reference
- **Stack**: Deno, TypeScript
- **Test**: `deno task test` | **Build example**: `deno task example:build` | **Build layout showcase**: `deno task example-layouts:build`
- **Exports**: `./src/mod.ts` (main), `./src/cli.ts` (CLI)

## Project Structure
```
src/
├── mod.ts                  — Public exports (re-exports emde.ts + utils)
├── emde.ts                 — Core generator function + all public types
├── cli.ts                  — CLI entry point + watch loop
├── utils/
│   ├── mod.ts              — Utility exports
│   └── frontmatter.ts      — YAML frontmatter parser
├── built-in-layouts/       — 7 themed `*.ejs` layouts (blog, docs, landing, minimal, news, personal, storefront)
│   └── mod.ts              — exports BUILT_IN_LAYOUTS_DIR
└── template-helpers/       — Built-in template helpers (one helper per file)
    ├── _esc.ts             — Shared HTML escape (use this; do not duplicate)
    ├── breadcrumbs.ts      — Root-to-current page trail
    ├── children.ts         — Direct child pages
    ├── siblings.ts         — Sibling pages
    ├── sitemap.ts          — Hierarchical HTML sitemap
    ├── relative.ts         — Relative path calculation
    ├── qsa.ts              — querySelectorAll wrapper (client-side)
    ├── reboot.ts           — Bootstrap Reboot CSS v5.3.7
    ├── tokens.ts           — Design-token CSS (incl. tokensWithReboot)
    ├── version-hash.ts     — Cache-busting hash (per-process)
    ├── seo.ts              — SEO meta tags (title, OG, Twitter Card)
    ├── hreflang.ts         — hreflang alternate links for /<locale>/ paths
    ├── json-ld.ts          — BreadcrumbList JSON-LD (uses \uXXXX escapes for safe JSON-in-script)
    ├── html-head.ts        — Composes <head> contents
    └── html-shell.ts       — Composes full <!DOCTYPE html> document
tests/                      — Deno tests (one file per public surface)
tests/fixtures/             — Test fixtures (src-a, src-cascade, src-bad-meta)
example/src/                — Beatles-themed example site
example-layouts/src/        — One section per built-in layout, demonstrating each
```

## Critical Conventions

1. Each page = directory with `index.md`
2. Per-directory special files: `index.md`, `meta.yaml`, `layout.ejs`, `helpers.js`
3. Hidden directories (`_*` or `.*`) and `node_modules` are excluded from output
4. Templates use lodash/EJS syntax (`<%= %>` for raw, `<%- %>` for HTML-escaped, `<% %>` for control flow). **Lodash is the opposite of EJS — `<%= %>` does NOT escape.**
5. Metadata cascade: root `meta.yaml` → leaf `meta.yaml` → page frontmatter (deeper wins)
6. Layout cascade: page's `layout.ejs` → walk ancestors up to root → `meta.layout` resolved by name in `options.layouts` (left → right) → built-in layouts → fallback
7. Helper cascade: `helpers.js` exports merge root → leaf (deeper wins). Cached per-file across pages within one build.
8. All public types live in `src/emde.ts` — keep them there
9. Each template helper gets its own file in `src/template-helpers/`
10. HTML escape — always import from `template-helpers/_esc.ts` for attribute-safe escaping (covers `& < > "`). Do not write a fresh `_esc` per file. **Exception**: `json-ld.ts` has a JSON-in-script-specific escape (`\u003c` style) that must NOT escape `"` (would corrupt JSON).

## Error Handling

- Per-page errors during info/generation phases are collected into a local `errors[]` array, logged in red, and at the very end of `emde()` thrown as an `AggregateError`. Output is still moved to `destDir` first; the throw signals partial failure (CI-friendly).
- `parseYaml` errors in `meta.yaml` re-throw with the offending file path included in the message. There is no warn-and-continue mode for malformed YAML.
- Watch-mode rebuilds (`cli.ts`) catch the error so the watcher keeps running.

## Key Dependencies
- `marked` — Markdown to HTML (called as `marked.parse(content, { async: false })`)
- `lodash` — Template engine (`_.template(ejs, { variable: "props" })`)
- `@std/*` — Deno standard library (`fs`, `path`, `yaml`, `encoding`, `cli`, `fmt`, `collections`)
- `@marianmeres/item-collection` — Collection utility (exposed as `_helpers.ItemCollection`)
- `@marianmeres/design-tokens` — Theme schema → CSS variables

## Processing Flow

1. Validate inputs (`srcDir` exists; `destDir` is not equal to / under / parent of `srcDir`; empty unless `force`)
2. `copySync(srcDir, tempDir)` into a fresh `__emde__*` temp dir
3. `walkSync` to discover all dirs containing `index.md`; classify hidden vs. valid
4. Per page: read markdown + frontmatter, compute merged `meta` from `meta.yaml` cascade, render markdown via `marked.parse`. Errors push to `errors[]`.
5. Build `_pages` map keyed by forward-slash paths; back-fill `parent` references.
6. Per page: resolve layout (cascade), import helpers (cached per-file), call template with `Props`. Errors push to `errors[]`.
7. Remove `forbiddenPageDirs` (hidden), then dedupe + remove all `meta.yaml`/`layout.ejs`/`helpers.js` system files.
8. `emptyDirSync(destDir)` then `copySync(tempDir, destDir, { overwrite: true })`. Preserves `destDir`'s inode.
9. If `errors.length`, throw `AggregateError`. Otherwise return `destDir`.
10. `finally`: remove `tempDir`.

## Backwards-compatibility notes for recent changes

| Change | BC? | Notes |
|--------|-----|-------|
| Layout cascade walks ancestors as documented (was a no-op before) | Yes — but a fix; sites using non-root `layout.ejs` now actually inherit it | |
| `meta.yaml` parse errors throw instead of warn | Yes | Sites with broken YAML that previously built (with warnings) will now fail. Major-version-bump worthy. |
| Per-page errors aggregate into `AggregateError` thrown after publish | Yes | CI scripts checking exit code will start failing on previously silent breakage. Major-version-bump worthy. |
| `htmlHead` now escapes `"` in attribute values | No | Strict bug fix — outputs become safer; only changes broken attribute output. |
| `json-ld` uses `\u003c` escapes instead of `&lt;` | No | Same observable JSON; previously corrupted titles containing `<`/`>`/`&` now round-trip correctly. |
| `--force` publish uses `emptyDirSync` + `copySync` (was `moveSync`) | No | Same wipe behavior; preserves `destDir` inode for symlinks/watchers. |
| `destDir === srcDir` and `srcDir under destDir` rejected | Yes | Edge case that previously could destroy source. Worth a patch note. |

## Before Making Changes
- [ ] Check existing patterns in similar files
- [ ] Run `deno task test` (and run both `example:build` + `example-layouts:build`)
- [ ] Types are defined in `src/emde.ts` — keep them there
- [ ] Template helpers each get their own file in `src/template-helpers/`
- [ ] Use `_esc` from `template-helpers/_esc.ts` for HTML attribute escapes
- [ ] If you touch the layout/helper cascade, add a fixture-driven test under `tests/fixtures/`
- [ ] If a behavior change is BC, update the table above and flag it for a major version bump
