import { assertEquals, assertRejects } from "@std/assert";
import { emptyDirSync, existsSync } from "@std/fs";
import { join } from "@std/path";
import { emde } from "../src/emde.ts";

const _dirname = import.meta.dirname!;
const tmp = join(_dirname, "./tmp/");
const verbose = false;

Deno.test("emde sanity check", async () => {
	// source not found
	await assertRejects(() => emde("./foo", "tests/tmp"));

	// dest under source
	await assertRejects(() => emde("tests/fixtures/src-a", "tests/fixtures/src-a/foo"));

	// dest equals source — must be rejected (would otherwise wipe the source on --force)
	await assertRejects(() => emde("tests/fixtures/src-a", "tests/fixtures/src-a"));

	// source under dest — must be rejected (move would clobber source)
	await assertRejects(() => emde("tests/fixtures/src-a/foo", "tests/fixtures/src-a"));

	// not empty destination
	emptyDirSync(tmp);
	Deno.writeTextFileSync(join(tmp, "foo.txt"), "bar");
	await assertRejects(() => emde("tests/fixtures/src-a", tmp));
});

Deno.test("emde - consecutive force builds succeed and remove stale files", async () => {
	emptyDirSync(tmp);

	// First build
	await emde("tests/fixtures/src-a", tmp, { verbose });
	assertEquals(existsSync(join(tmp, "hey/index.html")), true);

	// Inject a stale file that wasn't part of the build
	Deno.writeTextFileSync(join(tmp, "stale-file.txt"), "stale");
	assertEquals(existsSync(join(tmp, "stale-file.txt")), true);

	// Second build with force — must succeed and the stale file must be gone
	await emde("tests/fixtures/src-a", tmp, { verbose, force: true });
	assertEquals(existsSync(join(tmp, "hey/index.html")), true);
	assertEquals(existsSync(join(tmp, "stale-file.txt")), false);
});

Deno.test("emde - malformed meta.yaml fails the build with a useful error", async () => {
	emptyDirSync(tmp);
	await assertRejects(
		() => emde("tests/fixtures/src-bad-meta", tmp, { verbose }),
		Error,
		"Failed to parse YAML",
	);
});

Deno.test("emde - layout.ejs cascades from intermediate dir to deeper page", async () => {
	emptyDirSync(tmp);
	await emde("tests/fixtures/src-cascade", tmp, { verbose });

	// mid/leaf has no layout.ejs of its own — must inherit mid/layout.ejs
	const leafHtml = Deno.readTextFileSync(join(tmp, "mid/leaf/index.html"));
	assertEquals(leafHtml.includes("<MID-LAYOUT"), true);
	assertEquals(leafHtml.includes('page="/mid/leaf"'), true);

	// mid itself uses its own layout
	const midHtml = Deno.readTextFileSync(join(tmp, "mid/index.html"));
	assertEquals(midHtml.includes("<MID-LAYOUT"), true);

	// root has no layout.ejs anywhere reachable from "/" — falls back to default
	const rootHtml = Deno.readTextFileSync(join(tmp, "index.html"));
	assertEquals(rootHtml.includes("<MID-LAYOUT"), false);
	assertEquals(rootHtml.includes("<!DOCTYPE html>"), true);
});

Deno.test("emde works", async () => {
	emptyDirSync(tmp);

	await emde("tests/fixtures/src-a", tmp, { verbose });

	const routes = ["/", "/hey", "/foo", "/foo/bar", "/sitemap"];

	routes.forEach((route) => {
		// must
		assertEquals(existsSync(join(tmp, route, "index.html")), true);
		// must NOT
		assertEquals(existsSync(join(tmp, route, "index.md")), false);
		assertEquals(existsSync(join(tmp, route, "meta.yaml")), false);
	});

	// not routes content
	["/foo/assets/foo.js", "/xxx/yyy.txt"].forEach((route) => {
		assertEquals(existsSync(join(tmp, route)), true);
	});
});
