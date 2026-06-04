/**
 * @module
 * CLI entry point for the emde static site generator.
 * Parses command-line arguments and runs the build pipeline.
 */

import { parseArgs } from "@std/cli";
import { bold, dim, green, red, yellow } from "@std/fmt/colors";
import { emde } from "./mod.ts";

export default async function cli(): Promise<void> {
	const flags = parseArgs(Deno.args, {
		boolean: ["help", "h", "force", "verbose", "watch"],
		string: ["indir", "outdir"],
		collect: ["layouts"],
	});
	const showHelp = flags.help || flags.h || !Deno.args.length;
	const { indir, outdir, force, verbose, watch } = flags;
	const layouts = flags.layouts as string[] | undefined;
	if (showHelp || !indir || !outdir) {
		// prettier-ignore
		// deno-fmt-ignore
		return console.log(`
${dim("Usage:")} ${bold(`deno run -A jsr:@marianmeres/emde/cli --indir <src> --outdir <dist> [options]`)}

${dim("Options:")}
  --indir <path>       Source directory containing markdown files (required)
  --outdir <path>      Destination directory for generated HTML (required)
  --force              Overwrite a non-empty destination directory
  --verbose            Log each processed page
  --watch              Rebuild on file changes in --indir and --layouts
  --layouts <path>     Extra layout directory (repeat for multiple, priority left→right)
  --help, -h           Show this help

${dim("Example:")}
  ${bold("deno run -A jsr:@marianmeres/emde/cli --indir src --outdir dist \\")}
    ${bold("--layouts ./my-layouts --layouts ./shared --force --verbose")}
`);
	}

	async function build() {
		const start = Date.now();
		await emde(indir!, outdir!, { verbose, force, layouts });
		console.log(green(`OK in ${Date.now() - start}ms`));
	}

	try {
		await build();
	} catch (e: any) {
		if (!watch) {
			console.error(red(`${e}`));
			Deno.exit(1);
		}
		console.error(red(`Build error: ${e}`));
	}

	if (!watch) {
		Deno.exit(0);
	}

	// Watch mode
	const watchPaths = [indir!, ...(layouts ?? [])];
	console.log(
		yellow(`\nWatching for changes: ${watchPaths.join(", ")}`),
	);

	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	let building = false;
	let pending = false;

	async function rebuild() {
		// Serialize: if a build is in flight, mark a rebuild as pending and
		// the in-flight one will trigger it on completion.
		if (building) {
			pending = true;
			return;
		}
		building = true;
		try {
			console.log(dim(`\nChange detected, rebuilding...`));
			await build();
		} catch (e: any) {
			console.error(red(`Build error: ${e}`));
		} finally {
			building = false;
			if (pending) {
				pending = false;
				rebuild();
			}
		}
	}

	const watcher = Deno.watchFs(watchPaths);
	for await (const event of watcher) {
		if (event.kind === "access") continue;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(rebuild, 300);
	}
}

//////////////////////////////////////////////////////////////////////////////////////////
if (import.meta.main) {
	cli();
}
