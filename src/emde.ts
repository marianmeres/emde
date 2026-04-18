import { ItemCollection } from "@marianmeres/item-collection";
import { deepMerge } from "@std/collections";
import { encodeBase64 } from "@std/encoding";
import { dim, green, red } from "@std/fmt/colors";
import { copySync, emptyDirSync, ensureDirSync, existsSync, walkSync } from "@std/fs";
import { isAbsolute, join, normalize, SEPARATOR } from "@std/path";
import { parse as parseYaml } from "@std/yaml";
import _ from "lodash";
import { marked } from "marked";
import { breadcrumbs } from "./template-helpers/breadcrumbs.ts";
import { children } from "./template-helpers/children.ts";
import { qsa } from "./template-helpers/qsa.ts";
import { reboot } from "./template-helpers/reboot.ts";
import { relative } from "./template-helpers/relative.ts";
import { siblings } from "./template-helpers/siblings.ts";
import { parseFrontMatter } from "./utils/frontmatter.ts";
import { hreflang } from "./template-helpers/hreflang.ts";
import { jsonLd } from "./template-helpers/json-ld.ts";
import { seoMeta } from "./template-helpers/seo.ts";
import { sitemap } from "./template-helpers/sitemap.ts";
import { versionHash } from "./template-helpers/version-hash.ts";
import { tokens, tokensWithReboot } from "./template-helpers/tokens.ts";
import { htmlHead } from "./template-helpers/html-head.ts";
import { htmlShell } from "./template-helpers/html-shell.ts";
import { BUILT_IN_LAYOUTS_DIR } from "./built-in-layouts/mod.ts";

/**
 * Configuration options for the emde static site generator.
 */
export interface EmdeOptions {
	/**
	 * If `true`, logs progress for each processed page to the console.
	 * @default true
	 */
	verbose?: boolean;
	/**
	 * If `true`, allows overwriting a non-empty destination directory.
	 * By default, emde will throw an error if the destination is not empty.
	 * @default false
	 */
	force?: boolean;
	/**
	 * Directories containing `.ejs` layout files, resolved by name from `meta.layout`.
	 *
	 * When a page specifies `layout: docs` in its metadata, emde will look for
	 * `docs.ejs` in these directories (left-to-right priority), then in the
	 * built-in layouts directory.
	 *
	 * @example
	 * ```ts
	 * await emde("src", "dist", {
	 *   layouts: ["./my-layouts", "/shared/emde-layouts"]
	 * });
	 * ```
	 */
	layouts?: string[];
}

// required to consider the given directory as content
const FILENAME_INDEX = "index.md";
// optional
const FILENAME_META = "meta.yaml";
const FILENAME_LAYOUT = "layout.ejs";
const FILENAME_HELPERS = "helpers.js";

const FALLBACK_LAYOUT_EJS = `<% const { page, _pages, _helpers } = props;  %>
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title><%= page.meta?.title ?? 'Untitled' %></title>
		<style><%= _helpers?.reboot() %></style>
		<style>body { padding: 1rem; } main { max-width: 65ch; }</style>
	</head>
	<body><main><%= page.html %></main></body>
</html>`;

/**
 * Internal representation of page information during processing.
 * @internal
 */
export interface RawPageInfo {
	/** Relative path from source root */
	relPath: string;
	/** Absolute filesystem path */
	path: string;
	/** Parent page path or null for root */
	parent: string | null;
	/** Merged metadata from frontmatter and meta.yaml files */
	meta: Record<string, any>;
	/** Raw markdown content (without frontmatter) */
	content: string;
	/** Parsed HTML output from markdown */
	html: string;
	/** Hierarchy depth (0 for root) */
	depth: number;
}

/**
 * Represents a page in the generated site.
 *
 * This is the primary interface you'll work with in templates. Each page contains
 * its metadata, content, and relationships to other pages in the hierarchy.
 *
 * @example
 * ```ejs
 * <h1><%= page.meta.title %></h1>
 * <p>Depth: <%= page.depth %></p>
 * <% if (page.parent) { %>
 *   <a href="<%= _helpers.relative(page.path, page.parent.path) %>/">Back</a>
 * <% } %>
 * ```
 */
export interface Page extends Omit<RawPageInfo, "relPath" | "parent" | "html"> {
	/** Reference to the parent page, or null for the root page */
	parent: Page | null;
}

/**
 * Built-in and custom helper functions available in templates.
 *
 * These helpers are accessible via `_helpers` in your layout templates.
 * Custom helpers from `helpers.js` files are merged into this object.
 */
export interface Helpers extends Record<string, any> {
	/** Lodash library */
	_: typeof _;
	/** Platform-specific path separator */
	SEPARATOR: string;
	/** ItemCollection utility class */
	ItemCollection: typeof ItemCollection;
	/** Returns array of pages from root to current page */
	breadcrumbs: typeof breadcrumbs;
	/** Returns a short hash for cache-busting static asset URLs */
	versionHash: typeof versionHash;
	/** Returns array of direct child pages */
	children: typeof children;
	/** Generates hreflang alternate link tags for multilanguage pages */
	hreflang: typeof hreflang;
	/** Generates JSON-LD structured data (BreadcrumbList) */
	jsonLd: typeof jsonLd;
	/** Returns a minimal CSS reset string */
	reboot: typeof reboot;
	/** Calculates relative path between two page paths */
	relative: typeof relative;
	/** Generates SEO meta tags (title, description, OG, Twitter Card) */
	seoMeta: typeof seoMeta;
	/** Returns array of sibling pages (same parent) */
	siblings: typeof siblings;
	/** Generates HTML sitemap navigation */
	sitemap: typeof sitemap;
	/** Query selector helper for working with HTML strings */
	qsa: typeof qsa;
	/** Generates CSS custom properties from a design token theme schema */
	tokens: typeof tokens;
	/** Generates CSS custom properties + Bootstrap Reboot bridge variables */
	tokensWithReboot: typeof tokensWithReboot;
	/** Generates inner content of a `<head>` element */
	htmlHead: typeof htmlHead;
	/** Generates a complete HTML document shell */
	htmlShell: typeof htmlShell;
}

/**
 * A path-indexed map of all pages in the site.
 *
 * Keys are page paths (e.g., "/", "/about", "/blog/post-1").
 */
export interface Pages extends Record<string, Page> {}

/**
 * The props object passed to layout templates.
 *
 * This is the main context available in your `layout.ejs` templates via the `props` variable.
 *
 * @example
 * ```ejs
 * <% const { page, root, parent, _pages, _helpers } = props; %>
 * <!DOCTYPE html>
 * <html>
 *   <head><title><%= page.meta.title %></title></head>
 *   <body>
 *     <nav><%= _helpers.sitemap(props) %></nav>
 *     <main><%= page.html %></main>
 *   </body>
 * </html>
 * ```
 */
export interface Props {
	/** The currently rendered page */
	page: Page;
	/** The root page (at "/"), or null if not available */
	root: Page | null;
	/** The parent of the current page, or null for root */
	parent: Page | null;
	/** Map of all pages indexed by their path */
	_pages: Pages;
	/** Helper functions for use in templates */
	_helpers: Helpers;
}

/**
 * Generates a static HTML site from markdown source files.
 *
 * This is the main entry point for the emde static site generator. It processes
 * a directory of markdown files and generates corresponding HTML files using
 * customizable layouts and helpers.
 *
 * ## Directory Structure
 *
 * Each page is represented by a directory containing an `index.md` file:
 * ```
 * src/
 * ├── index.md           # Root page (/)
 * ├── meta.yaml           # Optional: shared metadata for all pages
 * ├── layout.ejs          # Optional: custom layout template
 * ├── helpers.js          # Optional: custom template helpers
 * ├── about/
 * │   └── index.md       # /about page
 * └── blog/
 *     ├── index.md       # /blog page
 *     ├── meta.yaml       # Optional: metadata for blog section
 *     └── first-post/
 *         └── index.md   # /blog/first-post page
 * ```
 *
 * ## Special Files
 *
 * - `index.md` - Required. Page content with optional YAML frontmatter.
 * - `meta.yaml` - Optional. Metadata merged from root to leaf (leaf wins).
 * - `layout.ejs` - Optional. EJS template using lodash syntax. Inherits from parent.
 * - `helpers.js` - Optional. Custom helper functions merged from root to leaf.
 *
 * ## Hidden Content
 *
 * Directories starting with `_` or `.` are excluded from the output.
 * The `node_modules` directory is always ignored.
 *
 * @param srcDir - Source directory containing markdown files
 * @param destDir - Destination directory for generated HTML files
 * @param options - Optional configuration options
 * @returns Promise resolving to the absolute path of the destination directory
 *
 * @throws {TypeError} If source directory doesn't exist
 * @throws {TypeError} If destination is inside source directory
 * @throws {TypeError} If destination is not empty (unless `force: true`)
 *
 * @example
 * ```ts
 * import { emde } from "@marianmeres/emde";
 *
 * // Basic usage
 * await emde("./src", "./dist");
 *
 * // With options
 * await emde("./src", "./dist", {
 *   verbose: true,
 *   force: true
 * });
 * ```
 */
export async function emde(
	srcDir: string,
	destDir: string,
	options?: EmdeOptions,
): Promise<string> {
	srcDir = _normalize(srcDir);
	destDir = _normalize(destDir);

	if (destDir === srcDir) {
		throw new TypeError(`Destination cannot equal source`);
	}
	if (destDir.startsWith(srcDir + SEPARATOR)) {
		throw new TypeError(`Destination cannot be located under source`);
	}
	if (srcDir.startsWith(destDir + SEPARATOR)) {
		throw new TypeError(`Source cannot be located under destination`);
	}

	if (!existsSync(srcDir, { isDirectory: true })) {
		throw new TypeError(`Source directory not found ("${srcDir}")`);
	}

	const { verbose = true, force = false, layouts = [] } = options ?? {};

	// Normalize layout directories to absolute paths
	const layoutDirs = layouts.map((d) => _normalize(d));

	// is the dest empty?
	if (!force && !_isDirEmptySync(destDir)) {
		throw new TypeError(
			`Destination directory "${destDir}" does not appear to be empty (use --force to override)`,
		);
	}

	// NOTE: for simplicity sake, we will not just cherry-pick what we see as known content,
	// we will pick all, and later remove what we know is hidden. This is definitely easier
	// to implement, although perhaps not the most efficient approach (disk io operations).
	// Also we're going to process it all in multiple rounds.

	// 1. start just by blindly copying the source to tempDir
	const tempDir = Deno.makeTempDirSync({ prefix: "__emde__" });

	try {
		copySync(srcDir, tempDir, { overwrite: true });

		// 2. collect relevant dir paths info
		const pageDirs = [];
		const forbiddenPageDirs = [];
		for (
			const dirEntry of walkSync(tempDir, {
				includeDirs: true,
				includeFiles: false,
			})
		) {
			const relPath = dirEntry.path.slice(tempDir.length) || SEPARATOR;
			if (_isValidContentDir(dirEntry.path)) {
				if (_hasHiddenLikeSegment(relPath)) {
					forbiddenPageDirs.push(dirEntry.path);
				} else {
					pageDirs.push(dirEntry.path);
				}
			}
		}

		// Per-page errors are collected and surfaced once at the end so the build
		// fails loudly (CI-friendly) rather than silently dropping broken pages.
		const errors: Array<{ relPath: string; stage: string; error: Error }> = [];

		// 3. read the known (and not hidden) content dirs info
		const info: Record<string, RawPageInfo> = {};
		for (const pageDir of pageDirs) {
			const relPath = pageDir.slice(tempDir.length) || SEPARATOR;
			try {
				// read actual content
				const md = Deno.readTextFileSync(join(pageDir, FILENAME_INDEX));
				const parsed = parseFrontMatter(md);
				const html = marked.parse(parsed.content, { async: false });
				const meta = _collectMeta(relPath, tempDir) ?? {};

				info[relPath] = {
					relPath,
					path: pageDir,
					content: parsed.content,
					meta: deepMerge(meta, parsed.meta || {}),
					html,
					depth: relPath === SEPARATOR
						? 0
						: relPath.split(SEPARATOR).length - 1,
					parent: relPath === SEPARATOR
						? null
						: _normalizeSlash(_removeLastSegment(relPath)),
				};
			} catch (e: any) {
				errors.push({ relPath, stage: "info", error: e });
				console.log(red(` ✘ ${relPath} (info stage)`));
				console.error(red(`   ${e}`));
				console.debug(dim(e.stack?.split("\n").slice(1).join("\n")));
			}
		}
		// console.log(info);

		// prepare the helper "_pages" (slightly different shape for template needs)
		// which will be passed as template prop
		let _pages: Pages = Object.fromEntries(
			Object.entries(info).map(([k, v]) => {
				v = { ...v }; // need to clone here, as we're removing some props
				v.path = _normalizeSlash(v.relPath) || SEPARATOR;
				delete (v as any).relPath;
				return [_normalizeSlash(k)!, v as Page];
			}),
		);
		// fix parents in second loop (we needed to have all collected first)
		_pages = Object.fromEntries(
			Object.entries(_pages).map(([k, v]) => {
				v.parent = v.parent === null ? null : _pages[v.parent as any];
				return [k, v];
			}),
		);
		// console.log(_pages);

		// 4. generate (write) the static index.html
		// Cache helper modules across pages — same file shouldn't be base64+imported per-page.
		const helpersCache = new Map<string, any>();
		for (const [relPath, row] of Object.entries(info)) {
			// _pages is keyed by forward-slash paths; normalize for cross-platform lookup
			const pageKey = _normalizeSlash(relPath)!;
			try {
				const layout = _getLayout(relPath, tempDir, row.meta, layoutDirs);

				let html = row.html;
				if (layout) {
					html = layout({
						page: _pages[pageKey],
						parent: row.parent === null ? null : _pages[row.parent],
						root: _pages["/"] ?? null,
						_pages,
						_helpers: {
							_,
							ItemCollection,
							SEPARATOR,
							breadcrumbs,
							versionHash,
							children,
							hreflang,
							jsonLd,
							reboot,
							relative,
							seoMeta,
							siblings,
							sitemap,
							qsa,
							tokens,
							tokensWithReboot,
							htmlHead,
							htmlShell,
							...(await _collectHelpers(relPath, tempDir, helpersCache)),
						},
					});
				}

				// actual static file
				Deno.writeTextFileSync(join(row.path, "index.html"), html);
				_removeSyncIfExists(join(row.path, FILENAME_INDEX));

				verbose && console.log(green(` ✔ ${relPath}`));
			} catch (e: any) {
				errors.push({ relPath, stage: "generation", error: e });
				console.log(red(` ✘ ${relPath} (generation stage)`));
				console.error(red(`   ${e}`));
				console.debug(dim(e.stack?.split("\n").slice(1).join("\n")));
			}
		}

		// 5. remove the forbidden
		for (const dir of forbiddenPageDirs) {
			_removeSyncIfExists(dir);
		}

		// 6. "system" files cleanup — collect unique target paths first to avoid
		//    re-trying the same delete N×D×3 times in deep trees with many leaves.
		const systemFiles = new Set<string>();
		for (const pageDir of pageDirs) {
			const relPath = pageDir.slice(tempDir.length) || SEPARATOR;
			for (const dir of _collectParentDirs(relPath)) {
				for (const file of [FILENAME_META, FILENAME_LAYOUT, FILENAME_HELPERS]) {
					systemFiles.add(join(tempDir, dir, file));
				}
			}
		}
		for (const filePath of systemFiles) {
			_removeSyncIfExists(filePath);
		}

		// 7. publish: empty destDir then copy temp contents in.
		// Preserves destDir's inode (so file-watchers / symlinks / mount points
		// remain valid), unlike a naive moveSync over an existing dir.
		ensureDirSync(destDir);
		emptyDirSync(destDir);
		copySync(tempDir, destDir, { overwrite: true });

		// 8. surface per-page failures so callers (CI, scripts) can react
		if (errors.length) {
			const summary = errors
				.map((e) => `  - ${e.relPath} (${e.stage}): ${e.error.message ?? e.error}`)
				.join("\n");
			throw new AggregateError(
				errors.map((e) => e.error),
				`emde: ${errors.length} page(s) failed:\n${summary}`,
			);
		}

		return destDir;
	} catch (e) {
		throw e;
	} finally {
		// (maybe) left cleanup
		_removeSyncIfExists(tempDir);
	}
}

function _collectParentDirs(relPath: string): string[] {
	const segments = relPath.split(SEPARATOR).toReversed();
	const out = new Set<string>();
	for (let i = 0; i < segments.length; i++) {
		out.add(segments.slice(i).toReversed().join(SEPARATOR) || SEPARATOR);
	}
	return [...out];
}

function _getLayout(
	relPath: string,
	srcRoot: string,
	meta?: Record<string, any>,
	layoutDirs?: string[],
): CallableFunction {
	const _readLayout = (filename: string) => {
		try {
			return _ejsCompile(Deno.readTextFileSync(filename));
		} catch (error) {
			if (!(error instanceof Deno.errors.NotFound)) {
				throw error;
			}
		}
		return null;
	};

	// 1. Walk source tree for layout.ejs (user's file always wins).
	// Cascade: deepest layout.ejs wins; otherwise inherit from any ancestor up to root.
	let path = relPath;
	while (true) {
		const layout = _readLayout(join(srcRoot, path, FILENAME_LAYOUT));
		if (layout) return layout;
		if (path === SEPARATOR || path === "") break;
		path = _removeLastSegment(path);
	}

	// 2. If meta.layout is set, resolve by name from layout directories
	if (meta?.layout && typeof meta.layout === "string") {
		const name = meta.layout;

		// Search external layout dirs first (left-to-right priority)
		for (const dir of layoutDirs ?? []) {
			const layout = _readLayout(join(dir, `${name}.ejs`));
			if (layout) return layout;
		}

		// Then built-in layouts dir
		const builtIn = _readLayout(
			join(BUILT_IN_LAYOUTS_DIR, `${name}.ejs`),
		);
		if (builtIn) return builtIn;

		const searched = [...(layoutDirs ?? []), BUILT_IN_LAYOUTS_DIR]
			.join(", ");
		throw new Error(
			`Layout "${meta.layout}" not found. Searched: ${searched}`,
		);
	}

	// 3. Fallback
	return _ejsCompile(FALLBACK_LAYOUT_EJS);
}

async function _loadHelpersFile(
	helpersFile: string,
	cache: Map<string, any>,
): Promise<any> {
	if (cache.has(helpersFile)) return cache.get(helpersFile);
	let imported: any = null;
	if (existsSync(helpersFile)) {
		// Data URI workaround: file:// dynamic imports are restricted on Deno Deploy.
		// See https://docs.deno.com/deploy/api/dynamic-import/
		const jsSource = encodeBase64(Deno.readTextFileSync(helpersFile));
		imported = await import(`data:text/javascript;base64,${jsSource}`);
	}
	cache.set(helpersFile, imported);
	return imported;
}

async function _collectHelpers(
	relPath: string,
	srcRoot: string,
	cache: Map<string, any>,
) {
	let helpers: any = {};
	const seen = new Set<string>();

	// Walk leaf → root; deeper helpers override shallower ones (deeper imported first,
	// becomes "existing", later spreads put new keys at the head and let existing win).
	let path = relPath;
	while (true) {
		// Use the resolved absolute path as the dedupe key so root isn't visited twice.
		const helpersFile = join(srcRoot, path, FILENAME_HELPERS);
		if (!seen.has(helpersFile)) {
			seen.add(helpersFile);
			const imported = await _loadHelpersFile(helpersFile, cache);
			if (imported) {
				helpers = { ...imported, ...helpers };
			}
		}
		if (path === SEPARATOR || path === "") break;
		path = _removeLastSegment(path);
	}

	return helpers;
}

function _collectMeta(relPath: string, srcRoot: string): Record<string, any> {
	let config: Record<string, any> = {};
	const seen = new Set<string>();

	let path = relPath;
	while (true) {
		const metaFile = join(srcRoot, path, FILENAME_META);
		if (!seen.has(metaFile)) {
			seen.add(metaFile);
			// Going from leaf to root; leafs must overwrite the root.
			config = deepMerge(_parseYamlFileSyncIfExists(metaFile), config);
		}
		if (path === SEPARATOR || path === "") break;
		path = _removeLastSegment(path);
	}

	return config;
}

function _isValidContentDir(dir: string): boolean {
	if (dir.split(SEPARATOR).includes("node_modules")) {
		return false;
	}
	return existsSync(join(dir, FILENAME_INDEX));
}

function _hasHiddenLikeSegment(dir: string) {
	return dir.split(SEPARATOR).some((name) => {
		return ["_", "."].includes(name[0]);
	});
}

function _normalize(dir: string): string {
	dir = normalize(dir);
	if (!isAbsolute(dir)) dir = join(Deno.cwd(), dir);
	return dir;
}

function _isDirEmptySync(dir: string): boolean {
	try {
		for (const _ of Deno.readDirSync(dir)) return false;
		return true;
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) return true;
		throw error;
	}
}

function _ejsCompile(ejs: string): CallableFunction {
	return _.template(ejs, { variable: "props" });
}

function _removeSyncIfExists(fileOrDir: string): boolean {
	try {
		Deno.removeSync(fileOrDir, { recursive: true });
		return true;
	} catch (error) {
		if (!(error instanceof Deno.errors.NotFound)) {
			throw error;
		}
	}
	return false;
}

function _readTextFileSyncIfExists(filename: string): string | undefined {
	try {
		return Deno.readTextFileSync(filename);
	} catch (error) {
		if (!(error instanceof Deno.errors.NotFound)) {
			throw error;
		}
	}
}

function _parseYamlFileSyncIfExists(filename: string): any {
	try {
		return parseYaml(_readTextFileSyncIfExists(filename) ?? "") ?? {};
	} catch (e: any) {
		// Re-throw with the offending filename so the per-page error aggregator
		// (and any caller) gets useful context instead of an opaque YAML error.
		throw new Error(`Failed to parse YAML in "${filename}": ${e.message ?? e}`, {
			cause: e,
		});
	}
}

function _normalizeSlash(s: string | null) {
	if (!s) return s;
	return s.replaceAll("\\", "/");
}

function _removeLastSegment(path: string) {
	if (path === SEPARATOR) return path;
	return `${path}`.split(SEPARATOR).slice(0, -1).join(SEPARATOR) || SEPARATOR;
}
