import { parseArgs } from "node:util";
import { resolve, basename, extname, dirname, join } from "node:path";
import type { Cmd } from "../../types";
import { usage, fail } from "../../cli";
import { run } from "./join";
import { strategies } from "./strategies";

const modes = Object.keys(strategies);

export const merge: Cmd = {
  name: "merge",
  async run(argv) {
    const { values: opts, positionals: pos } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        mode: { type: "string", short: "m", default: "outer" },
        keys: { type: "string", short: "k" },
        columns: { type: "string", short: "c" },
        output: { type: "string", short: "o" },
        help: { type: "boolean", short: "h" },
      },
    });

    if (opts.help || pos.length === 0) {
      usage("merge");
      process.exit(0);
    }

    const mode = opts.mode!;
    if (!strategies[mode]) fail(`Unknown mode: ${mode} (valid: ${modes.join(", ")})`);
    if (!opts.keys) fail("--keys is required");

    const files: string[] = [];
    for (const p of pos) {
      const abs = resolve(p);
      if (!(await Bun.file(abs).exists())) fail(`File not found: ${abs}`);
      files.push(abs);
    }

    const keys = opts.keys!.split(",").map((s) => s.trim()).filter(Boolean);
    if (keys.length === 0) fail("--keys must specify at least one column");

    const cols = opts.columns
      ? opts.columns.split(",").map((s) => s.trim()).filter(Boolean)
      : null;

    const first = files[0]!;
    const ext = extname(first);
    const dest = opts.output
      ? resolve(opts.output)
      : join(dirname(first), `${basename(first, ext)}.out${ext}`);

    await run({ files, keys, cols, dest }, strategies[mode]!);
  },
};
