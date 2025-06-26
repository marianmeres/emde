import { assertEquals, assertThrows } from "@std/assert";
import { parseFrontMatter } from "../src/utils/frontmatter.ts";

Deno.test("parse front matter works", () => {
	const md = `
---
foo: bar
---
# baz
    `;

	assertEquals(parseFrontMatter(md), {
		meta: { foo: "bar" },
		content: "# baz",
	});
});

Deno.test("parse front matter strict by default", () => {
	const md = `
---
foo: bar
- )
---
# baz
    `;

	// invalid throws by default
	assertThrows(() => parseFrontMatter(md));

	// but can be silenced
	const { content, meta } = parseFrontMatter(md, false);
	assertEquals(content, md);
	assertEquals(meta, null);
});
