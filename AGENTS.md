# @marianmeres/emde — Agent Guide

## Quick Reference
- **Stack**: Deno, TypeScript
- **Test**: `deno task test` | **Build example**: `deno task example:build`
- **Exports**: `./src/mod.ts` (main), `./src/cli.ts` (CLI)

## Project Structure
```
src/
├── mod.ts                  — Public exports (re-exports emde.ts + utils)
├── emde.ts                 — Core generator function (~550 lines)
├── cli.ts                  — CLI entry point
├── utils/
│   ├── mod.ts              — Utility exports
│   └── frontmatter.ts      — YAML frontmatter parser
└── template-helpers/       — Built-in template helpers
    ├── breadcrumbs.ts       — Root-to-current page trail
    ├── children.ts          — Direct child pages
    ├── siblings.ts          — Sibling pages
    ├── sitemap.ts           — Hierarchical HTML sitemap
    ├── relative.ts          — Relative path calculation
    ├── qsa.ts               — querySelectorAll wrapper (client-side)
    └── reboot.ts            — Bootstrap Reboot CSS v5.3.7
tests/                      — Deno tests
example/src/                — Beatles-themed example site
```

## Critical Conventions

1. Each page = directory with `index.md`
2. Special files recognized per-directory: `index.md`, `meta.yaml`, `layout.ejs`, `helpers.js`
3. Directories starting with `_` or `.` are hidden (excluded from output)
4. `node_modules` always excluded
5. Templates use lodash/EJS syntax (`<%= %>`, `<% %>`)
6. Metadata merges hierarchically: root `meta.yaml` → leaf `meta.yaml` → frontmatter (deeper wins)
7. Layouts inherit from parent directories (closest to leaf wins)
8. Custom `helpers.js` files are async-imported and merged root-to-leaf

## Key Dependencies
- `marked` — Markdown to HTML
- `lodash` — Template engine (`_.template`)
- `@std/*` — Deno standard library
- `@marianmeres/item-collection` — Collection utility (exposed as `_helpers.ItemCollection`)

## Processing Flow
1. Validate inputs → 2. Copy source to temp dir → 3. Walk and discover `index.md` files →
4. Parse frontmatter + markdown → 5. Build page tree with parent refs →
6. Resolve layouts (leaf to root) → 7. Import helpers (leaf to root) →
8. Render HTML via lodash templates → 9. Clean up system files → 10. Move to dest

## Before Making Changes
- [ ] Check existing patterns in similar files
- [ ] Run `deno task test`
- [ ] Types are defined in `src/emde.ts` — keep them there
- [ ] Template helpers each get their own file in `src/template-helpers/`
