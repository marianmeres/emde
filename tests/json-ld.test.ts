import { assertEquals } from "@std/assert";
import { jsonLd } from "../src/template-helpers/json-ld.ts";
import type { Page, Props } from "../src/emde.ts";

function _makePage(path: string, title: string, parent: Page | null): Page {
	return {
		path,
		parent,
		meta: { title },
		content: "",
		depth: path === "/" ? 0 : path.split("/").filter(Boolean).length,
	};
}

function _makeProps(
	chain: { path: string; title: string }[],
): Props {
	// Build parent chain: first is root, last is current page
	const pages: Page[] = [];
	for (let i = 0; i < chain.length; i++) {
		pages.push(
			_makePage(chain[i].path, chain[i].title, i > 0 ? pages[i - 1] : null),
		);
	}
	const current = pages[pages.length - 1];
	const _pages: Record<string, Page> = {};
	for (const p of pages) {
		_pages[p.path] = p;
	}
	return {
		page: current,
		root: pages[0] || null,
		parent: current.parent,
		_pages,
		_helpers: {} as any,
	};
}

Deno.test("jsonLd - returns empty without siteUrl", () => {
	const props = _makeProps([
		{ path: "/", title: "Home" },
		{ path: "/about", title: "About" },
	]);
	assertEquals(jsonLd(props), "");
});

Deno.test("jsonLd - returns empty on root (single breadcrumb)", () => {
	const props = _makeProps([{ path: "/", title: "Home" }]);
	assertEquals(jsonLd(props, { siteUrl: "https://example.com" }), "");
});

Deno.test("jsonLd - generates BreadcrumbList for nested page", () => {
	const props = _makeProps([
		{ path: "/", title: "Home" },
		{ path: "/blog", title: "Blog" },
		{ path: "/blog/post-1", title: "First Post" },
	]);
	const html = jsonLd(props, { siteUrl: "https://example.com" });

	assertEquals(html.includes("application/ld+json"), true);
	assertEquals(html.includes("BreadcrumbList"), true);

	// Parse out the JSON (unescape the HTML entities first)
	const jsonStr = html
		.replace(/<script type="application\/ld\+json">/, "")
		.replace(/<\/script>/, "")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">");

	const data = JSON.parse(jsonStr);
	assertEquals(data["@type"], "BreadcrumbList");
	assertEquals(data.itemListElement.length, 3);
	assertEquals(data.itemListElement[0].name, "Home");
	assertEquals(data.itemListElement[0].position, 1);
	assertEquals(data.itemListElement[0].item, "https://example.com//");
	assertEquals(data.itemListElement[2].name, "First Post");
	assertEquals(data.itemListElement[2].position, 3);
	assertEquals(
		data.itemListElement[2].item,
		"https://example.com/blog/post-1/",
	);
});

Deno.test("jsonLd - two breadcrumbs (direct child of root)", () => {
	const props = _makeProps([
		{ path: "/", title: "Home" },
		{ path: "/about", title: "About" },
	]);
	const html = jsonLd(props, { siteUrl: "https://example.com" });
	assertEquals(html.includes("BreadcrumbList"), true);

	const jsonStr = html
		.replace(/<script type="application\/ld\+json">/, "")
		.replace(/<\/script>/, "")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">");

	const data = JSON.parse(jsonStr);
	assertEquals(data.itemListElement.length, 2);
});
