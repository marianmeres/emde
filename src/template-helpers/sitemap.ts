import type { Page, Pages, Props } from "../emde.ts";
import { relative } from "./relative.ts";

interface SitemapOpts {
	ulClass: string;
	liClass: string;
	aClass: string;
}

function _children(
	self: Page,
	pages: Pages,
	depth: number,
	prefix: string,
	config: Partial<SitemapOpts> = {}
) {
	const { ulClass = "", liClass = "", aClass = "" } = config ?? {};
	let out = "";
	Object.entries(pages).forEach(([_path, _page]) => {
		if (self.path === _path) return;
		if (_page.depth === depth && _page.path.startsWith(prefix)) {
			if (!out) out += `\n<ul class="${ulClass}" data-depth="${depth}" >`;
			out += [
				`\n<li data-depth="${depth}" class="${liClass}">`,
				`<a href="${relative(
					self.path,
					_page.path
				)}/" class="${aClass}" data-depth="${depth}" >`,
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

export function sitemap(
	props: Props,
	config: Partial<SitemapOpts> = {}
): string {
	return _children(props.page, props._pages, 0, "/", config);
}
