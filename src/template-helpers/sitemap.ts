import type { Page, Pages, Props } from "../emde.ts";
import { relative } from "./relative.ts";

/**
 * Configuration options for sitemap HTML generation.
 */
export interface SitemapOpts {
	/** CSS class for `<ul>` elements */
	ulClass: string;
	/** CSS class for `<li>` elements */
	liClass: string;
	/** CSS class for `<a>` elements */
	aClass: string;
}

function _children(
	self: Page,
	pages: Pages,
	depth: number,
	prefix: string,
	config: Partial<SitemapOpts> = {},
) {
	const { ulClass = "", liClass = "", aClass = "" } = config ?? {};
	let out = "";
	Object.entries(pages).forEach(([_path, _page]) => {
		if (self.path === _path) return;
		if (_page.depth === depth && _page.path.startsWith(prefix)) {
			if (!out) out += `\n<ul class="${ulClass}" data-depth="${depth}" >`;
			out += [
				`\n<li data-depth="${depth}" class="${liClass}">`,
				`<a href="${
					relative(
						self.path,
						_page.path,
					)
				}/" class="${aClass}" data-depth="${depth}" >`,
				_page.meta.title || _page.path,
				"</a>",
				_children(self, pages, depth + 1, _page.path, config),
				"</li>",
			].join("");
		}
	});

	if (out) out += `\n</ul>`;
	return out;
}

/**
 * Generates a hierarchical HTML sitemap of all pages.
 *
 * Creates nested `<ul>` / `<li>` / `<a>` structure representing the entire site hierarchy.
 * Links are generated with relative paths from the current page. Each element includes
 * a `data-depth` attribute indicating its level in the hierarchy.
 *
 * @param props - The template props object
 * @param config - Optional CSS class configuration for generated elements
 * @returns HTML string containing the sitemap navigation
 *
 * @example
 * ```ejs
 * <nav aria-label="Site navigation">
 *   <%= _helpers.sitemap(props) %>
 * </nav>
 * ```
 *
 * @example
 * ```ejs
 * <!-- With custom classes for styling -->
 * <%= _helpers.sitemap(props, {
 *   ulClass: 'nav-list',
 *   liClass: 'nav-item',
 *   aClass: 'nav-link'
 * }) %>
 * ```
 */
export function sitemap(
	props: Props,
	config: Partial<SitemapOpts> = {},
): string {
	return _children(props.page, props._pages, 0, "/", config);
}
