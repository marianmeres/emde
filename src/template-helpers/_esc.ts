/**
 * HTML-escapes a string for safe interpolation into both element content
 * and double-quoted attribute values.
 */
export function esc(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}
