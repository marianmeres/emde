# @marianmeres/emde

Simple, directory based, markdown to html static site generator. Yet another.

Works out-of-the box with no configuration, while still being fully extensible 
if needed.

## Example

See [example source files](./example/src/) and/or the output [here](./example/dist/) or [on the web](https://emde.meres.sk).

## Usage

```sh
deno run -A jsr:@marianmeres/emde/cli --indir src --outdir dist --verbose
```

This example source `indir` folder structure:
```
+-- src
|   +-- some
|   |   +-- index.md
|   +--  index.md
```
will generate these pages in the `outdir`:
- `/index.html`
- `/some/index.html`

## Customization

### Metadata

For pages metadata both markdown's "front matter" as well as `meta.yaml` files are supported. The `meta.yaml` files are supported to be located anywhere in the page hierarchy path (lower level is merged with the upper).

### Rendering

Pages are rendered via [lodash's template function](https://lodash.com/docs/4.17.15#template) with optional `layout.ejs` anywhere in the page hierarchy path (lower level overrides). If no custom `layout.ejs` is found, the very basic default one will be used.

The compiled template is called with the `props` argument:

```ts
interface Props {
    page: Page; // currently rendered page
    root: Page | null; // the root page
    parent: Page | null; // the parent page
    _pages: Record<string, Page>; // path based map of all pages
    _helpers: Helpers; // view helpers
}

interface Page {
    path: string; // "/some/path/to/page" (without the trailing slash)
    root: Page | null; // the root Page (at "/")
    parent: Page | null;
    meta: Record<string, any>; // the frontmatter merged with meta.yaml
    html: string; // the parsed markdown file output
    depth: number; // hierarchy tree level
}
```

### View helpers

View helpers exported from `helpers.js` are supported anywhere in the page hierarchy path (lower level is merged with the upper). The merged exported members will
be passed to compiled layout under `_helpers` props key.

There are some [out-of-the-box available helpers](./src/template-helpers/).

## Batteries are not included

If you need full featured production grade (with themes, plugins, deploy helpers, ...) static site generator, you should probably look elsewhere. I guess you know that already.