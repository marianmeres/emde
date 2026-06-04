import { assertEquals } from "@std/assert";
import { vanilla } from "../src/template-helpers/vanilla.ts";

Deno.test("vanilla - returns a non-empty JS string", () => {
	const js = vanilla();
	assertEquals(typeof js, "string");
	assertEquals(js.length > 1000, true);
});

Deno.test("vanilla - binds the library to globalThis.vanilla", () => {
	assertEquals(vanilla().includes("globalThis.vanilla=vanilla"), true);
});

Deno.test("vanilla - is an IIFE, not ESM (no bare exports)", () => {
	assertEquals(vanilla().includes("export {"), false);
});

Deno.test("vanilla - is safe to inline verbatim in <script>...</script>", () => {
	const js = vanilla();
	// premature script-close / HTML-comment sequences must be neutralized
	assertEquals(js.includes("</script"), false);
	assertEquals(js.includes("<!--"), false);
});

Deno.test("vanilla - exposes the documented public API names", () => {
	const js = vanilla();
	for (const name of ["observable", "reactTo", "computed", "fromTemplate"]) {
		assertEquals(js.includes(name), true);
	}
});
