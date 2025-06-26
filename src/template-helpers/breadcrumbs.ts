// deno-lint-ignore-file no-explicit-any

import type { Page, Props } from "../emde.ts";

export function breadcrumbs(props: Props) {
	const { page, parent, _pages, _helpers } = props || {};
	const self = page;
	const out: any[] = [];

	let crumb: Page | null = self;
	do {
		out.push(crumb);
		crumb = crumb.parent;
	} while (crumb);

	// if (out.length) console.log("breadcrumbs", out);

	return out.toReversed();
}
