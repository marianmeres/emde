// deno-lint-ignore-file no-explicit-any

import { parseArgs } from "@std/cli";
import { bold, dim, red } from "@std/fmt/colors";
import { emde } from "./mod.ts";

export default async function cli(): Promise<void> {
	const flags = parseArgs(Deno.args, {
		boolean: ["help", "h", "force", "verbose"],
		string: ["indir", "outdir"],
	});
	const showHelp = flags.help || flags.h || !Deno.args.length;
	const { indir, outdir, force, verbose } = flags;
	if (showHelp || !indir || !outdir) {
		// prettier-ignore
		// deno-fmt-ignore
		return console.log(`
${dim("Usage:")} ${bold(`deno run -A jsr:@marianmeres/emde/cli --indir my/src --outdir my/dist [--force] [--verbose]`)}
`);
	}

	//
	try {
		const start = Date.now();
		await emde(indir, outdir, { verbose, force });
		console.log(`OK in ${Date.now() - start}ms`);
		Deno.exit(0);
	} catch (e: any) {
		console.error(red(`${e}`));
		// console.debug(dim(e.stack?.split("\n").slice(1).join("\n")));
		Deno.exit(1);
	}
}

//////////////////////////////////////////////////////////////////////////////////////////
if (import.meta.main) {
	cli();
}
