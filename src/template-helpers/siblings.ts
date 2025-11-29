import type { Page, Props } from "../emde.ts";

/**
 * Returns all sibling pages of the current page.
 *
 * Siblings are pages that share the same parent. The current page is excluded
 * from the results.
 *
 * @param props - The template props object
 * @returns Array of sibling pages (unordered), excluding the current page
 *
 * @example
 * ```ejs
 * <% const sibs = _helpers.siblings(props); %>
 * <% if (sibs.length) { %>
 *   <h2>See also:</h2>
 *   <ul>
 *     <% sibs.forEach((sib) => { %>
 *       <li><a href="<%= _helpers.relative(page.path, sib.path) %>/"><%= sib.meta.title %></a></li>
 *     <% }); %>
 *   </ul>
 * <% } %>
 * ```
 */
export function siblings(props: Props): Page[] {
	const { page, _pages } = props || {};
	const self = page;
	const out: any[] = [];

	Object.entries(_pages).forEach(([_path, _page]) => {
		if (_path !== self.path && _page.parent === self.parent) {
			out.push(_page);
		}
	});

	return out;
}
