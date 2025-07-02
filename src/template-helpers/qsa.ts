// deno-lint-ignore-file no-explicit-any

declare const document: any;

export function qsa(
	selector: string,
	context?: any /*HTMLElement | Document*/
) {
	return Array.from((context ?? document)?.querySelectorAll(selector) || []);
}
