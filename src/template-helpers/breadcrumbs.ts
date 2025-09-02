import type { Page, Props } from "../emde.ts";

/** Will return list of page from self to root */
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
