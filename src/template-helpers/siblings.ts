// deno-lint-ignore-file no-explicit-any

import type { Props } from "../emde.ts";

export function siblings(props: Props) {
	const { page, parent, _pages } = props || {};
	const self = page;
	const out: any[] = [];
	// console.log("_pages", _pages);
	Object.entries(_pages).forEach(([_path, _page]) => {
		// if (_path !== path && parent && parent.path === page.parent?.path) {
		if (_path !== self.path && _page.parent === self.parent) {
			out.push(_page);
		}
	});

	// if (out.length) console.log("siblings", path, out);

	return out;
}
