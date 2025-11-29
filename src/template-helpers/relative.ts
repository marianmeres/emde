/**
 * Calculates the relative path from one page path to another.
 *
 * Useful for generating relative URLs in templates that work correctly
 * regardless of the site's deployment location.
 *
 * @param fromPath - The source page path (e.g., "/blog/posts")
 * @param toPath - The destination page path (e.g., "/about")
 * @returns Relative path string (e.g., "../../about")
 *
 * @example
 * ```ejs
 * <!-- From /blog/posts to /about -->
 * <a href="<%= _helpers.relative('/blog/posts', '/about') %>/">About</a>
 * <!-- Outputs: <a href="../../about/">About</a> -->
 * ```
 *
 * @example
 * ```ejs
 * <!-- Navigate to parent -->
 * <a href="<%= _helpers.relative(page.path, page.parent.path) %>/">Back</a>
 * ```
 */
export function relative(fromPath: string, toPath: string): string {
	// Normalize paths by removing trailing slashes and splitting into parts
	const normalize = (path: string) =>
		path
			.replace(/\/+$/, "")
			.split("/")
			.filter((part) => part !== "");

	const fromParts = normalize(fromPath);
	const toParts = normalize(toPath);

	// Find the common base path
	let commonLength = 0;
	const minLength = Math.min(fromParts.length, toParts.length);

	for (let i = 0; i < minLength; i++) {
		if (fromParts[i] === toParts[i]) {
			commonLength++;
		} else {
			break;
		}
	}

	// Calculate how many directories to go up from the 'from' path
	const upLevels = fromParts.length - commonLength;

	// Get the remaining parts of the 'to' path after the common base
	const remainingToParts = toParts.slice(commonLength);

	// Build the relative path
	const upParts = Array(upLevels).fill("..");
	const relativeParts = [...upParts, ...remainingToParts];

	// Handle edge cases
	if (relativeParts.length === 0) {
		return "."; // Same directory
	}

	return relativeParts.join("/");
}
