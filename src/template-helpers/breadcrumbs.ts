import type { Page, Props } from "../emde.ts";

/**
 * Returns an array of pages from root to the current page (breadcrumb trail).
 *
 * Useful for generating navigation breadcrumbs showing the path to the current page.
 *
 * @param props - The template props object
 * @returns Array of pages ordered from root to current page
 *
 * @example
 * ```ejs
 * <nav aria-label="Breadcrumb">
 *   <ol>
 *     <% _helpers.breadcrumbs(props).forEach((crumb, i, arr) => { %>
 *       <li>
 *         <% if (i < arr.length - 1) { %>
 *           <a href="<%= _helpers.relative(page.path, crumb.path) %>/"><%= crumb.meta.title %></a>
 *         <% } else { %>
 *           <span><%= crumb.meta.title %></span>
 *         <% } %>
 *       </li>
 *     <% }); %>
 *   </ol>
 * </nav>
 * ```
 */
export function breadcrumbs(props: Props): Page[] {
	const { page } = props || {};
	const self = page;
	const out: any[] = [];

	let crumb: Page | null = self;
	do {
		out.push(crumb);
		crumb = crumb.parent;
	} while (crumb);

	return out.toReversed();
}
