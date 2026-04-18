/**
 * Built-in layout templates directory.
 *
 * Layouts are raw `.ejs` files in this directory, resolved by name
 * (e.g., `layout: docs` → `docs.ejs`).
 */
import { fromFileUrl } from "@std/path";

export const BUILT_IN_LAYOUTS_DIR = fromFileUrl(new URL(".", import.meta.url));
