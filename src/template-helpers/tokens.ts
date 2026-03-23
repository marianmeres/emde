/**
 * Design token CSS generation helper.
 *
 * Generates CSS custom properties from a structured color token schema,
 * with optional Bootstrap Reboot bridge (`--bs-*` variable overrides).
 *
 * Uses `@marianmeres/design-tokens` — same mental model as stuic
 * (intent + role colors), but with raw CSS values (hex, rgb, oklch).
 *
 * @example
 * ```ejs
 * <head>
 *   <style><%= _helpers.reboot() %></style>
 *   <style><%= _helpers.tokens(myTheme, "site-") %></style>
 * </head>
 * ```
 *
 * @example
 * ```ejs
 * <head>
 *   <style><%= _helpers.reboot() %></style>
 *   <style><%= _helpers.tokensWithReboot(myTheme, "site-") %></style>
 * </head>
 * ```
 */

import type { ThemeSchema } from "@marianmeres/design-tokens";
import { generateThemeCss } from "@marianmeres/design-tokens";
import { generateThemedCss } from "@marianmeres/design-tokens/reboot";

export type { ThemeSchema };

/**
 * Generate CSS custom properties from a design token theme schema.
 *
 * @param schema - Theme with light (required) and optional dark mode
 * @param prefix - CSS variable prefix (e.g. "site-", "my-")
 * @returns CSS string with `:root { ... }` and optional `:root.dark { ... }` blocks
 */
export function tokens(schema: ThemeSchema, prefix: string): string {
	return generateThemeCss(schema, prefix);
}

/**
 * Generate CSS custom properties AND Bootstrap Reboot bridge variables.
 *
 * Same as `tokens()` but also maps design tokens to the `--bs-*` variables
 * that Reboot's CSS rules consume (body color/bg, link colors, border, etc.).
 * Use this when your layout includes `_helpers.reboot()`.
 *
 * @param schema - Theme with light (required) and optional dark mode
 * @param prefix - CSS variable prefix (e.g. "site-", "my-")
 * @returns CSS string with design tokens + reboot bridge variables
 */
export function tokensWithReboot(schema: ThemeSchema, prefix: string): string {
	return generateThemedCss(schema, prefix);
}
