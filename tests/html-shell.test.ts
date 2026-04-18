import { assertEquals } from "@std/assert";
import { htmlShell } from "../src/template-helpers/html-shell.ts";
import type { Props } from "../src/emde.ts";

function _makeProps(
	pageMeta: Record<string, any> = {},
	path = "/about",
): Props {
	const page = {
		path,
		parent: null,
		meta: pageMeta,
		content: "",
		depth: path === "/" ? 0 : path.split("/").filter(Boolean).length,
	};
	return {
		page,
		root: null,
		parent: null,
		_pages: { [path]: page },
		_helpers: {} as any,
	};
}

Deno.test("htmlShell - produces complete HTML document", () => {
	const html = htmlShell(_makeProps(), { body: "<main>Hello</main>" });
	assertEquals(html.includes("<!DOCTYPE html>"), true);
	assertEquals(html.includes("<html"), true);
	assertEquals(html.includes("</html>"), true);
	assertEquals(html.includes("<head>"), true);
	assertEquals(html.includes("</head>"), true);
	assertEquals(html.includes("<body>"), true);
	assertEquals(html.includes("</body>"), true);
	assertEquals(html.includes("<main>Hello</main>"), true);
});

Deno.test("htmlShell - default lang is en", () => {
	const html = htmlShell(_makeProps(), { body: "" });
	assertEquals(html.includes('lang="en"'), true);
});

Deno.test("htmlShell - lang from option", () => {
	const html = htmlShell(_makeProps(), { lang: "sk", body: "" });
	assertEquals(html.includes('lang="sk"'), true);
});

Deno.test("htmlShell - lang from page.meta.lang", () => {
	const html = htmlShell(_makeProps({ lang: "de" }), { body: "" });
	assertEquals(html.includes('lang="de"'), true);
});

Deno.test("htmlShell - option lang overrides meta.lang", () => {
	const html = htmlShell(_makeProps({ lang: "de" }), {
		lang: "fr",
		body: "",
	});
	assertEquals(html.includes('lang="fr"'), true);
});

Deno.test("htmlShell - bodyClass", () => {
	const html = htmlShell(_makeProps(), {
		bodyClass: "dark-mode",
		body: "",
	});
	assertEquals(html.includes('class="dark-mode"'), true);
});

Deno.test("htmlShell - bodyAttrs", () => {
	const html = htmlShell(_makeProps(), {
		bodyAttrs: { "data-theme": "dark", id: "app" },
		body: "",
	});
	assertEquals(html.includes('data-theme="dark"'), true);
	assertEquals(html.includes('id="app"'), true);
});

Deno.test("htmlShell - delegates head options", () => {
	const html = htmlShell(_makeProps({ title: "Test Page" }), {
		reboot: true,
		body: "<p>content</p>",
	});
	assertEquals(html.includes("<title>Test Page</title>"), true);
	assertEquals(html.includes("<style>"), true); // reboot CSS
});

Deno.test("htmlShell - no body attributes when none provided", () => {
	const html = htmlShell(_makeProps(), { body: "hello" });
	assertEquals(html.includes("<body>"), true);
	// Should NOT have <body followed by space (which would mean attributes)
	assertEquals(html.includes("<body "), false);
});
