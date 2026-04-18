import { assertEquals } from "@std/assert";
import { htmlHead } from "../src/template-helpers/html-head.ts";
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

Deno.test("htmlHead - always includes charset and viewport", () => {
	const html = htmlHead(_makeProps());
	assertEquals(html.includes('<meta charset="utf-8" />'), true);
	assertEquals(html.includes('name="viewport"'), true);
});

Deno.test("htmlHead - renders title from page.meta", () => {
	const html = htmlHead(_makeProps({ title: "Hello" }));
	assertEquals(html.includes("<title>Hello</title>"), true);
});

Deno.test("htmlHead - renders title with suffix", () => {
	const html = htmlHead(_makeProps({ title: "About" }), {
		titleSuffix: "My Site",
	});
	assertEquals(html.includes("<title>About | My Site</title>"), true);
});

Deno.test("htmlHead - custom title overrides page.meta.title", () => {
	const html = htmlHead(_makeProps({ title: "From Meta" }), {
		title: "Custom Title",
	});
	assertEquals(html.includes("<title>Custom Title</title>"), true);
	assertEquals(html.includes("From Meta"), false);
});

Deno.test("htmlHead - no title when none provided", () => {
	const html = htmlHead(_makeProps());
	assertEquals(html.includes("<title>"), false);
});

Deno.test("htmlHead - skips title when seo option is set", () => {
	const html = htmlHead(_makeProps({ title: "Test" }), {
		seo: { siteName: "MySite" },
	});
	// seoMeta generates its own <title>, so htmlHead should not duplicate it
	const titleMatches = html.match(/<title>/g);
	assertEquals(titleMatches?.length, 1);
});

Deno.test("htmlHead - includes reboot CSS when enabled", () => {
	const html = htmlHead(_makeProps(), { reboot: true });
	assertEquals(html.includes("<style>"), true);
	// reboot CSS is large, just check it's present
	assertEquals(html.length > 1000, true);
});

Deno.test("htmlHead - no reboot CSS by default", () => {
	const html = htmlHead(_makeProps());
	// Only charset + viewport, no style tags
	assertEquals(html.includes("<style>"), false);
});

Deno.test("htmlHead - inline CSS", () => {
	const html = htmlHead(_makeProps(), { css: "body { color: red; }" });
	assertEquals(html.includes("<style>body { color: red; }</style>"), true);
});

Deno.test("htmlHead - multiple inline CSS", () => {
	const html = htmlHead(_makeProps(), {
		css: ["body { color: red; }", "h1 { font-size: 2rem; }"],
	});
	assertEquals(html.includes("color: red"), true);
	assertEquals(html.includes("font-size: 2rem"), true);
});

Deno.test("htmlHead - external stylesheets", () => {
	const html = htmlHead(_makeProps(), {
		stylesheets: ["https://example.com/style.css"],
	});
	assertEquals(
		html.includes(
			'<link rel="stylesheet" href="https://example.com/style.css" />',
		),
		true,
	);
});

Deno.test("htmlHead - script tags as strings", () => {
	const html = htmlHead(_makeProps(), {
		scripts: ["https://example.com/app.js"],
	});
	assertEquals(
		html.includes('<script src="https://example.com/app.js"></script>'),
		true,
	);
});

Deno.test("htmlHead - script tags with defer/async", () => {
	const html = htmlHead(_makeProps(), {
		scripts: [{ src: "app.js", defer: true }],
	});
	assertEquals(html.includes('src="app.js" defer'), true);
});

Deno.test("htmlHead - seo meta tags", () => {
	const html = htmlHead(
		_makeProps({ title: "About Us", description: "We build things" }),
		{ seo: { siteName: "MySite" } },
	);
	assertEquals(html.includes("About Us"), true);
	assertEquals(html.includes("We build things"), true);
	assertEquals(html.includes("og:title"), true);
});

Deno.test("htmlHead - extra raw HTML", () => {
	const html = htmlHead(_makeProps(), {
		extra: '<link rel="icon" href="/favicon.ico" />',
	});
	assertEquals(
		html.includes('<link rel="icon" href="/favicon.ico" />'),
		true,
	);
});

Deno.test("htmlHead - no tokens CSS by default", () => {
	const html = htmlHead(_makeProps());
	assertEquals(html.includes("--"), false);
});

Deno.test("htmlHead - escapes double quotes in stylesheet href", () => {
	const html = htmlHead(_makeProps(), {
		stylesheets: ['/x"y.css'],
	});
	assertEquals(html.includes('href="/x&quot;y.css"'), true);
	assertEquals(html.includes('"/x"y.css"'), false);
});

Deno.test("htmlHead - escapes double quotes in script src", () => {
	const html = htmlHead(_makeProps(), {
		scripts: ['/a"b.js', { src: '/c"d.js', defer: true }],
	});
	assertEquals(html.includes('src="/a&quot;b.js"'), true);
	assertEquals(html.includes('src="/c&quot;d.js" defer'), true);
});
