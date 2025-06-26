/**
 * Will return relative path between from and to.
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
