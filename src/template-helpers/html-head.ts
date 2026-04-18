import type { Props } from "../emde.ts";
import type { SeoConfig } from "./seo.ts";
import type { HreflangConfig } from "./hreflang.ts";
import type { JsonLdConfig } from "./json-ld.ts";
import type { ThemeSchema } from "./tokens.ts";
import { reboot } from "./reboot.ts";
import { seoMeta } from "./seo.ts";
import { hreflang } from "./hreflang.ts";
import { jsonLd } from "./json-ld.ts";
import { tokens, tokensWithReboot } from "./tokens.ts";
import { esc as _esc } from "./_esc.ts";

/**
 * Configuration for a `<script>` tag in the document head.
 */
export interface ScriptTag {
	/** Script URL */
	src: string;
	/** Add the `defer` attribute */
	defer?: boolean;
	/** Add the `async` attribute */
	async?: boolean;
}

/**
 * Design token configuration for CSS custom property generation.
 */
export interface TokensConfig {
	/** Theme schema with light (required) and optional dark mode */
	schema: ThemeSchema;
	/** CSS variable prefix (e.g., "site-", "my-") */
	prefix: string;
	/** If `true`, also generates Bootstrap Reboot bridge variables. @default false */
	withReboot?: boolean;
}

/**
 * Options for the `htmlHead` helper.
 *
 * All fields are optional. Only explicitly provided options produce output —
 * nothing is auto-detected from `page.meta`.
 */
export interface HtmlHeadOptions {
	/** Override page title. Defaults to `page.meta.title`. */
	title?: string;
	/** Suffix appended to title (e.g., `" | My Site"`). */
	titleSuffix?: string;
	/** Separator between title and suffix. @default " | " */
	titleSuffixSeparator?: string;

	/** Include Bootstrap Reboot CSS reset. @default false */
	reboot?: boolean;
	/** Generate design-token CSS custom properties. */
	tokens?: TokensConfig;
	/** Additional inline CSS string(s) to include in `<style>` tags. */
	css?: string | string[];
	/** External stylesheet URLs to include as `<link>` tags. */
	stylesheets?: string[];

	/** Generate SEO meta tags (title, OG, Twitter Card, canonical). */
	seo?: SeoConfig;
	/** Generate hreflang alternate link tags. */
	hreflang?: HreflangConfig;
	/** Generate JSON-LD structured data. */
	jsonLd?: JsonLdConfig;

	/** Script tags to include in the head. String values are treated as `src`. */
	scripts?: Array<string | ScriptTag>;

	/** Raw HTML string appended at the end of `<head>` content. */
	extra?: string;
}

/**
 * Generates the inner content of a `<head>` element.
 *
 * Produces charset, viewport, title, CSS (reboot, tokens, custom),
 * SEO meta tags, hreflang, JSON-LD, script tags, and any extra raw HTML —
 * all controlled explicitly via options.
 *
 * @param props - The template props object
 * @param options - Configuration for what to include
 * @returns HTML string suitable for placing inside `<head>...</head>`
 *
 * @example
 * ```ejs
 * <head>
 *   <%= _helpers.htmlHead(props, {
 *     reboot: true,
 *     seo: { siteName: "My Site", siteUrl: "https://example.com" },
 *     tokens: { schema: page.meta.tokens, prefix: "site-" }
 *   }) %>
 * </head>
 * ```
 */
export function htmlHead(props: Props, options?: HtmlHeadOptions): string {
	const { page } = props || {};
	const meta = page?.meta || {};
	const o = options || {};

	const parts: string[] = [];

	// charset + viewport (always)
	parts.push('<meta charset="utf-8" />');
	parts.push(
		'<meta name="viewport" content="width=device-width, initial-scale=1" />',
	);

	// title (only if no seo option — seoMeta generates its own <title>)
	if (!o.seo) {
		const title = o.title ?? meta.title;
		if (title) {
			const sep = o.titleSuffixSeparator ?? " | ";
			const full = o.titleSuffix ? `${title}${sep}${o.titleSuffix}` : title;
			parts.push(`<title>${_esc(full)}</title>`);
		}
	}

	// SEO meta tags
	if (o.seo) {
		const seoHtml = seoMeta(props, o.seo);
		if (seoHtml) parts.push(seoHtml);
	}

	// hreflang
	if (o.hreflang) {
		const hreflangHtml = hreflang(props, o.hreflang);
		if (hreflangHtml) parts.push(hreflangHtml);
	}

	// JSON-LD
	if (o.jsonLd) {
		const jsonLdHtml = jsonLd(props, o.jsonLd);
		if (jsonLdHtml) parts.push(jsonLdHtml);
	}

	// Reboot CSS
	if (o.reboot) {
		parts.push(`<style>${reboot()}</style>`);
	}

	// Design tokens
	if (o.tokens) {
		const { schema, prefix, withReboot } = o.tokens;
		const css = withReboot
			? tokensWithReboot(schema, prefix)
			: tokens(schema, prefix);
		if (css) parts.push(`<style>${css}</style>`);
	}

	// Custom inline CSS
	if (o.css) {
		const cssArr = Array.isArray(o.css) ? o.css : [o.css];
		for (const css of cssArr) {
			if (css) parts.push(`<style>${css}</style>`);
		}
	}

	// External stylesheets
	if (o.stylesheets) {
		for (const href of o.stylesheets) {
			if (href) parts.push(`<link rel="stylesheet" href="${_esc(href)}" />`);
		}
	}

	// Script tags
	if (o.scripts) {
		for (const script of o.scripts) {
			if (!script) continue;
			if (typeof script === "string") {
				parts.push(`<script src="${_esc(script)}"></script>`);
			} else {
				const attrs = [`src="${_esc(script.src)}"`];
				if (script.defer) attrs.push("defer");
				if (script.async) attrs.push("async");
				parts.push(`<script ${attrs.join(" ")}></script>`);
			}
		}
	}

	// Extra raw HTML
	if (o.extra) {
		parts.push(o.extra);
	}

	return parts.join("\n");
}
