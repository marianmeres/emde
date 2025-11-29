declare const document: any;

/**
 * Query Selector All - a utility for selecting DOM elements.
 *
 * This is a convenience wrapper around `querySelectorAll` that returns an array
 * instead of a NodeList. Primarily useful in client-side JavaScript helpers.
 *
 * @param selector - CSS selector string
 * @param context - Optional context element (defaults to document)
 * @returns Array of matching elements
 *
 * @example
 * ```js
 * // In a helpers.js file
 * export function highlightCode() {
 *   qsa('pre code').forEach(el => hljs.highlightElement(el));
 * }
 * ```
 */
export function qsa(
	selector: string,
	context?: any, /*HTMLElement | Document*/
): any[] {
	return Array.from((context ?? document)?.querySelectorAll(selector) || []);
}
