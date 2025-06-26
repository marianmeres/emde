// deno-lint-ignore-file no-explicit-any
import type { Props } from "../emde.ts";

/** Will return all children pages relative to self */
export function children(props: Props) {
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
