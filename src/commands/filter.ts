import { parseArgs } from "node:util";
import type { Cmd } from "../types";
import { usage, fail } from "../cli";
import { one, dest, log } from "../util";
import { read, write } from "../csv";
import { compile } from "../expr";

export const filter: Cmd = {
  name: "filter",
  async run(argv) {
    const { values: opts, positionals: pos } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        expr: { type: "string", short: "e", multiple: true },
        output: { type: "string", short: "o" },
        help: { type: "boolean", short: "h" },
      },
    });

    if (opts.help || pos.length === 0) {
      usage("filter");
      process.exit(0);
    }

    if (!opts.expr || opts.expr.length === 0) fail("--expr is required");

    const file = await one(pos, "filter");
    const { headers, rows } = await read(file);

    const preds = opts.expr!.map((e) => compile(e, headers));
    const kept = rows.filter((row) => preds.every((p) => p(row)));

    const out = dest(file, opts.output);
    await write(out, headers, kept);

    const dropped = rows.length - kept.length;
    log(
      `Filter ${kept.length} rows kept, ${dropped} dropped`,
      `Output: ${out}`,
    );
  },
};
