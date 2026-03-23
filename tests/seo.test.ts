import { assertEquals } from "@std/assert";
import { seoMeta } from "../src/template-helpers/seo.ts";
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

Deno.test("seoMeta - basic title and description", () => {
	const html = seoMeta(
		_makeProps({ title: "About Us", description: "We are great" }),
	);
	assertEquals(html.includes("<title>About Us</title>"), true);
	assertEquals(html.includes('content="We are great"'), true);
});

Deno.test("seoMeta - title with siteName suffix on non-root", () => {
	const html = seoMeta(
		_makeProps({ title: "About" }, "/about"),
		{ siteName: "MySaaS" },
	);
	assertEquals(html.includes("<title>About | MySaaS</title>"), true);
});

Deno.test("seoMeta - root page uses siteName alone", () => {
	const html = seoMeta(
		_makeProps({ title: undefined }, "/"),
		{ siteName: "MySaaS" },
	);
	assertEquals(html.includes("<title>MySaaS</title>"), true);
});

Deno.test("seoMeta - custom titleSuffix overrides siteName", () => {
	const html = seoMeta(
		_makeProps({ title: "Pricing" }),
		{ siteName: "MySaaS", titleSuffix: "My Cool Product" },
	);
	assertEquals(
		html.includes("<title>Pricing | My Cool Product</title>"),
		true,
	);
});

Deno.test("seoMeta - noindex emits robots meta", () => {
	const html = seoMeta(_makeProps({ noindex: true }));
	assertEquals(html.includes("noindex,nofollow"), true);
});

Deno.test("seoMeta - no noindex means no robots tag", () => {
	const html = seoMeta(_makeProps({ title: "Hi" }));
	assertEquals(html.includes("robots"), false);
});

Deno.test("seoMeta - canonical URL", () => {
	const html = seoMeta(
		_makeProps({ title: "X" }, "/pricing"),
		{ siteUrl: "https://example.com" },
	);
	assertEquals(
		html.includes('href="https://example.com/pricing/"'),
		true,
	);
});

Deno.test("seoMeta - Open Graph tags", () => {
	const html = seoMeta(
		_makeProps({
			title: "About",
			description: "Desc",
			image: "/img/about.jpg",
		}),
		{ siteUrl: "https://example.com", siteName: "MySaaS" },
	);
	assertEquals(html.includes('property="og:title" content="About"'), true);
	assertEquals(html.includes('property="og:description" content="Desc"'), true);
	assertEquals(
		html.includes('property="og:image" content="https://example.com/img/about.jpg"'),
		true,
	);
	assertEquals(html.includes('property="og:site_name" content="MySaaS"'), true);
	assertEquals(html.includes('property="og:type" content="website"'), true);
});

Deno.test("seoMeta - Twitter Card tags", () => {
	const html = seoMeta(
		_makeProps({ title: "T", description: "D", image: "/img.jpg" }),
		{ siteUrl: "https://x.com", twitterHandle: "@me" },
	);
	assertEquals(html.includes('name="twitter:card" content="summary_large_image"'), true);
	assertEquals(html.includes('name="twitter:site" content="@me"'), true);
	assertEquals(html.includes('name="twitter:title" content="T"'), true);
});

Deno.test("seoMeta - missing values produce no empty tags", () => {
	const html = seoMeta(_makeProps({}));
	assertEquals(html.includes('content=""'), false);
	// no title, no description -> no og:title, no og:description
	assertEquals(html.includes("og:title"), false);
	assertEquals(html.includes("og:description"), false);
});

Deno.test("seoMeta - default image fallback", () => {
	const html = seoMeta(
		_makeProps({ title: "X" }),
		{ siteUrl: "https://example.com", defaultImage: "/default.png" },
	);
	assertEquals(
		html.includes('content="https://example.com/default.png"'),
		true,
	);
});

Deno.test("seoMeta - escapes special characters", () => {
	const html = seoMeta(_makeProps({ title: 'He said "hello" & <bye>' }));
	assertEquals(html.includes("&amp;"), true);
	assertEquals(html.includes("&quot;"), true);
	assertEquals(html.includes("&lt;"), true);
});
