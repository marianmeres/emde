// deno-lint-ignore-file no-explicit-any

import type { Props } from "../emde.ts";

export function children(props: Props) {
	const { page, _pages, _helpers } = props || {};
	const self = page;
	const out: any[] = [];
	// console.log(1234, path, parent);
	Object.entries(_pages).forEach(([_path, _page]) => {
		// if (_path.startsWith(self.path) && _page.depth === self.depth + 1) {
		if (_page.parent === self) {
			out.push(_page);
		}
	});

	return out;
}
