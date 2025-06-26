// deno-lint-ignore-file no-explicit-any
import type { Page, Props } from "../emde.ts";

/** Will return all sibling pages to self. */
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
