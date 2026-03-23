import type { Props } from "../emde.ts";

/**
 * Configuration options for hreflang tag generation.
 */
export interface HreflangConfig {
	/**
	 * List of supported locale codes (e.g., ["en", "sk"]).
	 * If omitted, locales are auto-detected from top-level 2-letter path segments in `_pages`.
	 */
	locales?: string[];
	/**
	 * Default locale used for the `x-default` hreflang.
	 * Falls back to the first item in `locales`.
	 */
	defaultLocale?: string;
	/**
	 * Canonical base URL without trailing slash (e.g., "https://example.com").
	 * If omitted, hrefs are relative paths.
	 */
	siteUrl?: string;
}

/**
 * Extracts the locale prefix and the remainder from a page path.
 *
 * For `/en/about/pricing` returns `{ locale: "en", remainder: "/about/pricing" }`.
 * For `/en` (locale root) returns `{ locale: "en", remainder: "/" }`.
 * For `/about` (no locale prefix) returns `null`.
 */
function _parsePath(
	path: string,
	locales: string[],
): { locale: string; remainder: string } | null {
	// path looks like "/en" or "/en/about/..."
	const segments = path.split("/").filter(Boolean);
	if (!segments.length) return null;

	const first = segments[0];
	if (locales.includes(first)) {
		const remainder = "/" + segments.slice(1).join("/");
		return { locale: first, remainder: remainder === "/" ? "/" : remainder };
	}
	return null;
}

/**
 * Auto-detects locales from _pages by finding top-level path segments
 * that look like locale codes (2-3 letter lowercase strings).
 */
function _detectLocales(props: Props): string[] {
	const found = new Set<string>();
	for (const path of Object.keys(props._pages)) {
		const segments = path.split("/").filter(Boolean);
		if (segments.length && /^[a-z]{2,3}$/.test(segments[0])) {
			found.add(segments[0]);
		}
	}
	return [...found].sort();
}

/**
 * Generates `<link rel="alternate" hreflang="...">` tags for multilanguage pages.
 *
 * Assumes locale-prefixed URL structure: `/en/about/`, `/sk/about/`.
 * Only emits tags for locales where the equivalent page **actually exists** in `_pages`,
 * making it safe for asymmetric content (not every locale has every page).
 *
 * If the current page is not under a locale prefix, returns an empty string.
 *
 * @param props - The template props object
 * @param config - Optional hreflang configuration
 * @returns HTML string with `<link>` tags (one per line), or empty string
 *
 * @example
 * ```ejs
 * <%= _helpers.hreflang(props, { locales: ["en", "sk"], siteUrl: "https://example.com" }) %>
 * ```
 *
 * @example
 * ```ejs
 * <!-- Auto-detect locales from page structure -->
 * <%= _helpers.hreflang(props) %>
 * ```
 */
export function hreflang(props: Props, config?: HreflangConfig): string {
	const { page, _pages } = props || {};
	const { siteUrl, defaultLocale } = config || {};

	const locales = config?.locales?.length
		? config.locales
		: _detectLocales(props);

	if (locales.length < 2) return "";

	const parsed = _parsePath(page.path, locales);
	if (!parsed) return "";

	const { remainder } = parsed;
	const xDefault = defaultLocale || locales[0];

	const tags: string[] = [];

	for (const locale of locales) {
		const alternatePath = locale + (remainder === "/" ? "" : remainder);
		const fullPath = `/${alternatePath}/`;

		// only emit if this page actually exists
		// check both with and without trailing content
		const normalizedCheck = `/${alternatePath}`;
		if (!(normalizedCheck in _pages) && !(fullPath in _pages)) continue;

		const href = siteUrl ? `${siteUrl}${fullPath}` : fullPath;
		tags.push(
			`<link rel="alternate" hreflang="${locale}" href="${href}" />`,
		);

		if (locale === xDefault) {
			tags.push(
				`<link rel="alternate" hreflang="x-default" href="${href}" />`,
			);
		}
	}

	return tags.join("\n");
}
