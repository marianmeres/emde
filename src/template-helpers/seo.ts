import type { Props } from "../emde.ts";

/**
 * Configuration options for SEO meta tag generation.
 *
 * All fields are optional. Values from `page.meta` are used as fallbacks
 * when config values are not provided.
 */
export interface SeoConfig {
	/** Site name (used in title suffix and og:site_name) */
	siteName?: string;
	/** Canonical base URL without trailing slash (e.g., "https://example.com") */
	siteUrl?: string;
	/** Default OG image path (fallback when page has no image) */
	defaultImage?: string;
	/** Twitter @handle */
	twitterHandle?: string;
	/** Suffix appended to page title (e.g., " | MySaaS") */
	titleSuffix?: string;
	/** Separator between page title and suffix @default " | " */
	titleSuffixSeparator?: string;
}

function _esc(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function _tag(tag: string, attrs: Record<string, string | undefined>): string {
	const parts = Object.entries(attrs)
		.filter(([_, v]) => v != null && v !== "")
		.map(([k, v]) => `${k}="${_esc(v!)}"`);
	if (!parts.length) return "";
	return `<${tag} ${parts.join(" ")} />`;
}

function _meta(
	nameAttr: string,
	name: string,
	content: string | undefined,
): string {
	if (!content) return "";
	return _tag("meta", { [nameAttr]: name, content });
}

/**
 * Generates SEO meta tags including title, description, canonical URL,
 * Open Graph, and Twitter Card tags.
 *
 * All tags are conditional — if a value is missing, the corresponding tag
 * is simply not emitted.
 *
 * Relevant frontmatter fields: `title`, `description`, `image`, `noindex`, `og:type`.
 *
 * @param props - The template props object
 * @param config - Optional SEO configuration
 * @returns HTML string with meta tags (one per line)
 *
 * @example
 * ```ejs
 * <head>
 *   <%= _helpers.seoMeta(props, { siteName: "MySaaS", siteUrl: "https://example.com" }) %>
 * </head>
 * ```
 *
 * @example
 * ```ejs
 * <!-- Config from meta.yaml via page.meta.site -->
 * <%= _helpers.seoMeta(props, page.meta.site) %>
 * ```
 */
export function seoMeta(props: Props, config?: SeoConfig): string {
	const { page } = props || {};
	const meta = page?.meta || {};
	const {
		siteName,
		siteUrl,
		defaultImage,
		twitterHandle,
		titleSuffix,
		titleSuffixSeparator = " | ",
	} = config || {};

	const title = meta.title;
	const description = meta.description;
	const image = meta.image || defaultImage;
	const ogType = meta["og:type"] || "website";
	const canonical = siteUrl ? `${siteUrl}${page.path}/` : undefined;
	const imageUrl = image && siteUrl && !image.startsWith("http")
		? `${siteUrl}${image.startsWith("/") ? "" : "/"}${image}`
		: image;

	// Build full title
	let fullTitle: string | undefined;
	if (title && titleSuffix) {
		fullTitle = `${title}${titleSuffixSeparator}${titleSuffix}`;
	} else if (title && siteName && page.path !== "/") {
		fullTitle = `${title}${titleSuffixSeparator}${siteName}`;
	} else if (title) {
		fullTitle = title;
	} else if (siteName) {
		fullTitle = siteName;
	}

	const tags: string[] = [];

	// Title
	if (fullTitle) {
		tags.push(`<title>${_esc(fullTitle)}</title>`);
	}

	// Description
	if (description) {
		tags.push(_meta("name", "description", description));
	}

	// Robots
	if (meta.noindex) {
		tags.push(_meta("name", "robots", "noindex,nofollow"));
	}

	// Canonical
	if (canonical) {
		tags.push(_tag("link", { rel: "canonical", href: canonical }));
	}

	// Open Graph
	tags.push(_meta("property", "og:title", title));
	tags.push(_meta("property", "og:description", description));
	tags.push(_meta("property", "og:image", imageUrl));
	tags.push(_meta("property", "og:url", canonical));
	tags.push(_meta("property", "og:type", ogType));
	tags.push(_meta("property", "og:site_name", siteName));

	// Twitter Card
	if (twitterHandle || title || description || imageUrl) {
		tags.push(
			_meta("name", "twitter:card", imageUrl ? "summary_large_image" : "summary"),
		);
	}
	tags.push(_meta("name", "twitter:site", twitterHandle));
	tags.push(_meta("name", "twitter:title", title));
	tags.push(_meta("name", "twitter:description", description));
	tags.push(_meta("name", "twitter:image", imageUrl));

	return tags.filter(Boolean).join("\n");
}
