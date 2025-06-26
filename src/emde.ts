// deno-lint-ignore-file no-explicit-any

import { ItemCollection } from "@marianmeres/item-collection";
import { deepMerge } from "@std/collections";
import { encodeBase64 } from "@std/encoding";
import { dim, green, red, yellow } from "@std/fmt/colors";
import { copySync, existsSync, moveSync, walkSync } from "@std/fs";
import { isAbsolute, join, normalize, SEPARATOR } from "@std/path";
import { parse as parseYaml } from "@std/yaml";
import _ from "lodash";
import { marked } from "marked";
import { breadcrumbs } from "./template-helpers/breadcrumbs.ts";
import { children } from "./template-helpers/children.ts";
import { reboot } from "./template-helpers/reboot.ts";
import { relative } from "./template-helpers/relative.ts";
import { siblings } from "./template-helpers/siblings.ts";
import { parseFrontMatter } from "./utils/frontmatter.ts";

/** Options */
export interface EmdeOptions {
	/** Will console.log more */
	verbose?: boolean;
	/** If truthy will proceed even if destDir is not empty. */
	force?: boolean;
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
	</head>
	<body><%= page.html %></body>
</html>`;

export interface RawPageInfo {
	relPath: string;
	path: string;
	parent: string | null;
	meta: Record<string, any>;
	content: string;
	html: string;
	depth: number;
}

export interface Page extends Omit<RawPageInfo, "relPath" | "parent" | "html"> {
	parent: Page | null;
}

interface Helpers extends Record<string, any> {
	_: typeof _;
	SEPARATOR: string;
	ItemCollection: ItemCollection<any>;
	breadcrumbs: typeof breadcrumbs;
	children: typeof children;
	reboot: typeof reboot;
	relative: typeof relative;
	siblings: typeof siblings;
}

export interface Pages extends Record<string, Page> {}

export interface Props {
	page: Page;
	root: Page | null;
	parent: Page | null;
	_pages: Pages;
	_helpers: Helpers;
}

/**
 * Will generate static html files in the `destDir` from the source markdown files in `srcDir`.
 */
export async function emde(
	srcDir: string,
	destDir: string,
	options?: EmdeOptions
): Promise<string> {
	srcDir = _normalize(srcDir);
	destDir = _normalize(destDir);

	if (destDir.startsWith(srcDir + SEPARATOR)) {
		throw new TypeError(`Destination cannot be located under source`);
	}

	if (!existsSync(srcDir, { isDirectory: true })) {
		throw new TypeError(`Source directory not found ("${srcDir}")`);
	}

	const { verbose = true, force = false } = options ?? {};

	// is the dest empty?
	if (!force && !_isDirEmptySync(destDir)) {
		throw new TypeError(
			`Destination directory "${destDir}" does not appear to be empty (use --force to override)`
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
		for (const dirEntry of walkSync(tempDir, {
			includeDirs: true,
			includeFiles: false,
		})) {
			const relPath = dirEntry.path.slice(tempDir.length) || SEPARATOR;
			if (_isValidContentDir(dirEntry.path)) {
				if (_hasHiddenLikeSegment(relPath)) {
					forbiddenPageDirs.push(dirEntry.path);
				} else {
					pageDirs.push(dirEntry.path);
				}
			}
		}

		// 3. read the known (and not hidden) content dirs info
		const info: Record<string, RawPageInfo> = {};
		for (const pageDir of pageDirs) {
			const relPath = pageDir.slice(tempDir.length) || SEPARATOR;
			try {
				// read actual content
				const md = Deno.readTextFileSync(join(pageDir, FILENAME_INDEX));
				const parsed = parseFrontMatter(md);
				const html = marked(parsed.content) as string;
				const meta = _collectMeta(relPath, tempDir) ?? {};

				info[relPath] = {
					relPath,
					path: pageDir,
					content: parsed.content,
					meta: deepMerge(meta, parsed.meta || {}),
					html,
					depth:
						relPath === SEPARATOR ? 0 : relPath.split(SEPARATOR).length - 1,
					parent:
						relPath === SEPARATOR
							? null
							: _normalizeSlash(_removeLastSegment(relPath)),
				};
			} catch (e: any) {
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
			})
		);
		// fix parents in second loop (we needed to have all collected first)
		_pages = Object.fromEntries(
			Object.entries(_pages).map(([k, v]) => {
				v.parent = v.parent === null ? null : _pages[v.parent as any];
				return [k, v];
			})
		);

		// 4. generate (write) the static index.html
		for (const [relPath, row] of Object.entries(info)) {
			try {
				const layout = _getLayout(relPath, tempDir);

				let html = row.html;
				if (layout) {
					html = layout({
						page: _pages[relPath],
						parent: row.parent === null ? null : _pages[row.parent],
						root: _pages["/"] ?? null,
						_pages,
						_helpers: {
							_,
							ItemCollection,
							SEPARATOR,
							breadcrumbs,
							children,
							reboot,
							relative,
							siblings,
							...(await _collectHelpers(relPath, tempDir)),
						},
					});
				}

				// actual static file
				Deno.writeTextFileSync(join(row.path, "index.html"), html);
				_removeSyncIfExists(join(row.path, FILENAME_INDEX));

				verbose && console.log(green(` ✔ ${relPath}`));
			} catch (e: any) {
				console.log(red(` ✘ ${relPath} (generation stage)`));
				console.error(red(`   ${e}`));
				console.debug(dim(e.stack?.split("\n").slice(1).join("\n")));
			}
		}

		// 5. remove the forbidden
		for (const dir of forbiddenPageDirs) {
			_removeSyncIfExists(dir);
		}

		// 6. "system" files cleanup...
		for (const pageDir of pageDirs) {
			const relPath = pageDir.slice(tempDir.length) || SEPARATOR;
			_collectParentDirs(relPath).forEach((dir: string) => {
				[FILENAME_META, FILENAME_LAYOUT, FILENAME_HELPERS].forEach(
					(file: string) => {
						_removeSyncIfExists(join(tempDir, dir, file));
					}
				);
			});
		}

		// 7. final move the result to dest (this effectively cleans up the temp)
		moveSync(tempDir, destDir, { overwrite: true });

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

function _getLayout(relPath: string, srcRoot: string): CallableFunction {
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

	let path = relPath;
	do {
		const layout = _readLayout(join(srcRoot, relPath, FILENAME_LAYOUT));
		if (layout) return layout;
		path = _removeLastSegment(path);
	} while (path && path !== SEPARATOR);

	// handle root
	return (
		_readLayout(join(srcRoot, "", FILENAME_LAYOUT)) ??
		_ejsCompile(FALLBACK_LAYOUT_EJS)
	);
}

async function _collectHelpers(relPath: string, srcRoot: string) {
	let helpers: any = {};

	const _import = async (_relPath: string) => {
		const helpersFile = join(srcRoot, _relPath, FILENAME_HELPERS);
		if (existsSync(helpersFile)) {
			// const imported = await import(helpersFile);
			// https://docs.deno.com/deploy/api/dynamic-import/
			const jsSource = encodeBase64(Deno.readTextFileSync(helpersFile));
			const imported = await import(`data:text/javascript;base64,${jsSource}`);
			helpers = { ...(imported || {}), ...helpers };
		}
		return helpers;
	};

	let path = relPath;
	do {
		helpers = await _import(path);
		path = _removeLastSegment(path);
	} while (path && path !== SEPARATOR);

	await _import("");
	// console.log(helpers);

	return helpers;
}

function _collectMeta(relPath: string, srcRoot: string): Record<string, any> {
	let config: Record<string, any> = {};

	let path = relPath;
	do {
		// we going from leaf to root, the leafs must overwrite the root
		config = deepMerge(
			_parseYamlFileSyncIfExists(join(srcRoot, path, FILENAME_META)),
			config
		);
		path = _removeLastSegment(path);
	} while (path && path !== SEPARATOR);

	// handle root
	return deepMerge(
		_parseYamlFileSyncIfExists(join(srcRoot, "", FILENAME_META)),
		config
	);
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

// is this optimal?
function _isDirEmptySync(dir: string): boolean {
	let counter = 0;
	for (const dirEntry of walkSync(dir)) {
		if (dirEntry.path !== dir) counter++;
		if (counter) return false;
	}
	return true;
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
	} catch (e) {
		console.warn(yellow(`Unable to yaml parse "${filename}" (${e})`));
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
