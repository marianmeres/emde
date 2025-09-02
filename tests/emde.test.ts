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

	// dest under sourtce
	await assertRejects(() =>
		emde("tests/fixtures/src-a", "tests/fixtures/src-a/foo")
	);

	// not empty destination
	emptyDirSync(tmp);
	Deno.writeTextFileSync(join(tmp, "foo.txt"), "bar");
	await assertRejects(() => emde("tests/fixtures/src-a", tmp));
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
