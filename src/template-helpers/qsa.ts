declare const document: any;

export function qsa(
	selector: string,
	context?: any /*HTMLElement | Document*/
): any[] {
	return Array.from((context ?? document)?.querySelectorAll(selector) || []);
}
