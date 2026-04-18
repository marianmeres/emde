import type { Props } from "../emde.ts";
import { breadcrumbs } from "./breadcrumbs.ts";

/**
 * Configuration options for JSON-LD structured data generation.
 */
export interface JsonLdConfig {
	/** Site name */
	siteName?: string;
	/** Canonical base URL without trailing slash (e.g., "https://example.com") */
	siteUrl?: string;
}

// JSON-in-<script> safe escape: replace dangerous characters with JSON-compatible
// unicode escapes that JSON.parse will correctly decode. Escaping `<` to `&lt;` (HTML
// entity escape) would corrupt content because JSON.parse does not unescape entities.
// Also escapes U+2028 / U+2029 — valid in JSON but illegal as raw chars in a JS script.
// See https://medium.com/node-security/the-most-common-xss-vulnerability-in-react-js-applications-2bdffbcc1fa0
function _esc(value: string): string {
	return value
		.replace(/</g, "\\u003c")
		.replace(/>/g, "\\u003e")
		.replace(/&/g, "\\u0026")
		.replace(/\u2028/g, "\\u2028")
		.replace(/\u2029/g, "\\u2029");
}

/**
 * Generates a `<script type="application/ld+json">` tag with BreadcrumbList
 * structured data for Google rich results.
 *
 * Only emitted when there are 2 or more breadcrumbs (i.e., not on root).
 * Requires `siteUrl` to produce valid absolute URLs.
 *
 * @param props - The template props object
 * @param config - Optional configuration
 * @returns HTML script tag with JSON-LD, or empty string
 *
 * @example
 * ```ejs
 * <%= _helpers.jsonLd(props, { siteUrl: "https://example.com" }) %>
 * ```
 */
export function jsonLd(props: Props, config?: JsonLdConfig): string {
	const { siteUrl } = config || {};
	if (!siteUrl) return "";

	const crumbs = breadcrumbs(props);
	if (crumbs.length < 2) return "";

	const items = crumbs.map((crumb, i) => ({
		"@type": "ListItem",
		position: i + 1,
		name: crumb.meta?.title || crumb.path,
		item: `${siteUrl}${crumb.path}/`,
	}));

	const data = {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items,
	};

	return `<script type="application/ld+json">${_esc(JSON.stringify(data))}</script>`;
}
