import { parse as parseYaml } from "@std/yaml";

/** parseFrontMatter return type */
export interface ParsedFrontMatter {
	meta: null | Record<string, any>;
	content: string;
}

/**
 * Simple YAML front matter extractor
 */
export function parseFrontMatter(
	markdown: string,
	strict: boolean = true
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
