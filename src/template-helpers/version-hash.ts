/**
 * Cache-busting helper that returns a short hash, constant within a single
 * build but different on every rebuild.
 *
 * @example
 * ```ejs
 * <script src="/app.js?v=<%= _helpers.versionHash() %>"></script>
 * <link rel="stylesheet" href="/style.css?v=<%= _helpers.versionHash() %>" />
 * ```
 */

const hash = crypto.randomUUID().slice(0, 8);

/**
 * Returns a short random hash for cache-busting static asset URLs.
 *
 * The hash is generated once per build (per process), so all pages in a single
 * build get the same value, but each rebuild produces a new one.
 */
export function versionHash(): string {
	return hash;
}
