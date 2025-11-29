import { parse as parseYaml } from "@std/yaml";

/**
 * Result of parsing YAML frontmatter from a markdown file.
 */
export interface ParsedFrontMatter {
	/**
	 * Parsed YAML metadata, or `null` if no valid frontmatter was found.
	 */
	meta: null | Record<string, any>;
	/**
	 * The markdown content with frontmatter removed.
	 */
	content: string;
}

/**
 * Extracts YAML frontmatter from a markdown string.
 *
 * Frontmatter must be at the beginning of the file (whitespace allowed before)
 * and enclosed between two `---` delimiters.
 *
 * @param markdown - The raw markdown string to parse
 * @param strict - If `true` (default), throws on YAML parse errors.
 *                 If `false`, returns original content on parse errors.
 * @returns Object containing parsed metadata and remaining content
 *
 * @example
 * ```ts
 * import { parseFrontMatter } from "@marianmeres/emde";
 *
 * const result = parseFrontMatter(`---
 * title: Hello World
 * date: 2024-01-15
 * ---
 *
 * # Hello
 *
 * This is the content.
 * `);
 *
 * console.log(result.meta);    // { title: "Hello World", date: "2024-01-15" }
 * console.log(result.content); // "# Hello\n\nThis is the content."
 * ```
 *
 * @example
 * ```ts
 * // No frontmatter - returns original content
 * const result = parseFrontMatter("# Just markdown");
 * console.log(result.meta);    // null
 * console.log(result.content); // "# Just markdown"
 * ```
 */
export function parseFrontMatter(
	markdown: string,
	strict: boolean = true,
): ParsedFrontMatter {
	const orig = `${markdown}`; // untouched backup
	const result: ParsedFrontMatter = { meta: null, content: "" };

	markdown = markdown.trimStart();

	if (!markdown.startsWith("---")) {
		result.content = orig;
		return result;
	}

	// Find the closing delimiter
	const lines = markdown.split("\n");
	let closingIndex = -1;

	for (let i = 1; i < lines.length; i++) {
		if (lines[i].trim() === "---") {
			closingIndex = i;
			break;
		}
	}

	// If no closing delimiter found, treat as regular content
	if (closingIndex === -1) {
		result.content = orig;
		return result;
	}

	// Extract YAML section (between the delimiters)
	const yamlContent = lines.slice(1, closingIndex).join("\n");

	// Extract content after front matter
	result.content = lines
		.slice(closingIndex + 1)
		.join("\n")
		.trim();

	try {
		result.meta = parseYaml(yamlContent) as ParsedFrontMatter["meta"];
	} catch (e) {
		if (strict) throw e;
		result.content = orig;
	}

	return result;
}
