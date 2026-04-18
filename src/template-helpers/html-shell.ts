import type { Props } from "../emde.ts";
import { htmlHead, type HtmlHeadOptions } from "./html-head.ts";
import { esc as _esc } from "./_esc.ts";

/**
 * Options for the `htmlShell` helper.
 *
 * Extends `HtmlHeadOptions` with body-level configuration.
 */
export interface HtmlShellOptions extends HtmlHeadOptions {
	/** HTML `lang` attribute. Defaults to `page.meta.lang` or `"en"`. */
	lang?: string;
	/** CSS class(es) for the `<body>` tag. */
	bodyClass?: string;
	/** Additional attributes for the `<body>` tag. */
	bodyAttrs?: Record<string, string>;
	/** HTML content for the `<body>`. */
	body: string;
}

/**
 * Generates a complete HTML document (`<!DOCTYPE html>` through `</html>`).
 *
 * Delegates to `htmlHead` for the `<head>` content, then wraps the provided
 * body HTML in `<body>` tags with optional class and attributes.
 *
 * @param props - The template props object
 * @param options - Configuration for head and body
 * @returns Complete HTML document string
 *
 * @example
 * ```ejs
 * <%= _helpers.htmlShell(props, {
 *   reboot: true,
 *   seo: { siteName: "My Site" },
 *   body: '<main>' + page.html + '</main>'
 * }) %>
 * ```
 */
export function htmlShell(props: Props, options: HtmlShellOptions): string {
	const { page } = props || {};
	const meta = page?.meta || {};

	const lang = _esc(options.lang ?? meta.lang ?? "en");
	const head = htmlHead(props, options);

	// Build body tag attributes
	const bodyAttrParts: string[] = [];
	if (options.bodyClass) {
		bodyAttrParts.push(`class="${_esc(options.bodyClass)}"`);
	}
	if (options.bodyAttrs) {
		for (const [key, value] of Object.entries(options.bodyAttrs)) {
			bodyAttrParts.push(`${key}="${_esc(value)}"`);
		}
	}
	const bodyTag = bodyAttrParts.length
		? `<body ${bodyAttrParts.join(" ")}>`
		: "<body>";

	return `<!DOCTYPE html>
<html lang="${lang}">
<head>
${head}
</head>
${bodyTag}
${options.body}
</body>
</html>`;
}
