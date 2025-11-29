import type { Page, Props } from "../emde.ts";

/**
 * Returns all direct child pages of the current page.
 *
 * Only returns immediate children (one level deep), not grandchildren.
 *
 * @param props - The template props object
 * @returns Array of child pages (unordered)
 *
 * @example
 * ```ejs
 * <% const kids = _helpers.children(props); %>
 * <% if (kids.length) { %>
 *   <h2>In this section:</h2>
 *   <ul>
 *     <% kids.forEach((child) => { %>
 *       <li><a href="<%= _helpers.relative(page.path, child.path) %>/"><%= child.meta.title %></a></li>
 *     <% }); %>
 *   </ul>
 * <% } %>
 * ```
 */
export function children(props: Props): Page[] {
	const { page, _pages } = props || {};
	const self = page;
	const out: any[] = [];

	Object.entries(_pages).forEach(([_path, _page]) => {
		if (_page.parent === self) {
			out.push(_page);
		}
	});

	return out;
}
