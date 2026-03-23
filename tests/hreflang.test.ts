import { assertEquals } from "@std/assert";
import { hreflang } from "../src/template-helpers/hreflang.ts";
import type { Page, Props } from "../src/emde.ts";

function _makePage(path: string, title?: string): Page {
	return {
		path,
		parent: null,
		meta: { title: title || path },
		content: "",
		depth: path === "/" ? 0 : path.split("/").filter(Boolean).length,
	};
}

function _makeProps(paths: string[], currentPath: string): Props {
	const _pages: Record<string, Page> = {};
	for (const p of paths) {
		_pages[p] = _makePage(p);
	}
	return {
		page: _pages[currentPath] || _makePage(currentPath),
		root: _pages["/"] || null,
		parent: null,
		_pages,
		_helpers: {} as any,
	};
}

Deno.test("hreflang - basic two-locale symmetric content", () => {
	const props = _makeProps(
		["/en", "/en/about", "/sk", "/sk/about"],
		"/en/about",
	);
	const html = hreflang(props, { locales: ["en", "sk"] });
	assertEquals(html.includes('hreflang="en"'), true);
	assertEquals(html.includes('hreflang="sk"'), true);
	assertEquals(html.includes('href="/en/about/"'), true);
	assertEquals(html.includes('href="/sk/about/"'), true);
});

Deno.test("hreflang - asymmetric content skips missing locale", () => {
	const props = _makeProps(
		["/en", "/en/about", "/en/pricing", "/sk", "/sk/about"],
		"/en/pricing",
	);
	const html = hreflang(props, { locales: ["en", "sk"] });
	// en/pricing exists
	assertEquals(html.includes('hreflang="en"'), true);
	// sk/pricing does NOT exist
	assertEquals(html.includes('hreflang="sk"'), false);
});

Deno.test("hreflang - x-default points to defaultLocale", () => {
	const props = _makeProps(
		["/en", "/en/about", "/sk", "/sk/about"],
		"/sk/about",
	);
	const html = hreflang(props, {
		locales: ["en", "sk"],
		defaultLocale: "en",
	});
	assertEquals(html.includes('hreflang="x-default"'), true);
	assertEquals(
		html.includes('hreflang="x-default" href="/en/about/"'),
		true,
	);
});

Deno.test("hreflang - x-default defaults to first locale", () => {
	const props = _makeProps(
		["/en", "/sk"],
		"/en",
	);
	const html = hreflang(props, { locales: ["en", "sk"] });
	// x-default should point to "en" (first locale)
	assertEquals(html.includes('hreflang="x-default" href="/en/"'), true);
});

Deno.test("hreflang - with siteUrl produces absolute URLs", () => {
	const props = _makeProps(
		["/en", "/en/about", "/sk", "/sk/about"],
		"/en/about",
	);
	const html = hreflang(props, {
		locales: ["en", "sk"],
		siteUrl: "https://example.com",
	});
	assertEquals(
		html.includes('href="https://example.com/en/about/"'),
		true,
	);
	assertEquals(
		html.includes('href="https://example.com/sk/about/"'),
		true,
	);
});

Deno.test("hreflang - page not under locale prefix returns empty", () => {
	const props = _makeProps(["/", "/about"], "/about");
	const html = hreflang(props, { locales: ["en", "sk"] });
	assertEquals(html, "");
});

Deno.test("hreflang - single locale returns empty", () => {
	const props = _makeProps(["/en", "/en/about"], "/en/about");
	const html = hreflang(props, { locales: ["en"] });
	assertEquals(html, "");
});

Deno.test("hreflang - auto-detects locales from _pages", () => {
	const props = _makeProps(
		["/en", "/en/about", "/sk", "/sk/about"],
		"/en/about",
	);
	// no locales config — should auto-detect
	const html = hreflang(props);
	assertEquals(html.includes('hreflang="en"'), true);
	assertEquals(html.includes('hreflang="sk"'), true);
});

Deno.test("hreflang - locale root pages work", () => {
	const props = _makeProps(["/en", "/sk"], "/en");
	const html = hreflang(props, { locales: ["en", "sk"] });
	assertEquals(html.includes('href="/en/"'), true);
	assertEquals(html.includes('href="/sk/"'), true);
});
