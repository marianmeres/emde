import { assertEquals, assertThrows } from "@std/assert";
import { theme, themeNames } from "../src/template-helpers/theme.ts";

Deno.test("theme - returns CSS with design tokens + reboot bridge", () => {
	const css = theme("indigo-amber");
	assertEquals(css.length > 1000, true);
	assertEquals(css.includes(":root"), true);
	assertEquals(css.includes("--bs-"), true); // reboot bridge
	assertEquals(css.includes("--site-"), true); // default prefix
});

Deno.test("theme - includes a dark-mode block", () => {
	assertEquals(theme("zinc").includes(":root.dark"), true);
});

Deno.test("theme - honors a custom prefix", () => {
	const css = theme("zinc", "my-");
	assertEquals(css.includes("--my-"), true);
	assertEquals(css.includes("--site-"), false);
});

Deno.test("theme - resolves kebab-case names", () => {
	for (const name of ["zinc", "slate-teal-ocean", "violet-rose-dusk"]) {
		assertEquals(theme(name).length > 1000, true);
	}
});

Deno.test("theme - throws on unknown name with a helpful message", () => {
	assertThrows(
		() => theme("indigoAmber"), // camelCase is NOT accepted
		Error,
		'Theme "indigoAmber" not found',
	);
});

Deno.test("theme - themeNames is the sorted kebab list of all bundled themes", () => {
	assertEquals(themeNames.length > 0, true);
	assertEquals([...themeNames], [...themeNames].sort());
	assertEquals(themeNames.includes("zinc"), true);
	assertEquals(themeNames.includes("indigo-amber"), true);
});
