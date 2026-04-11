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
        invert: { type: "boolean", short: "v" },
        output: { type: "string", short: "o" },
        help: { type: "boolean", short: "h" },
      },
    });

    if (opts.help || pos.length === 0) {
      usage("filter");
      process.exit(0);
    }

    if (!opts.expr || opts.expr.length === 0) fail("Provide --expr (-e)");

    const file = await one(pos, "filter");
    const { headers, rows } = await read(file);

    const preds = await Promise.all(opts.expr.map((e) => compile(e, headers)));

    const inv = !!opts.invert;
    const kept = rows.filter((row) => {
      const match = preds.every((p) => p(row));
      return inv ? !match : match;
    });

    const out = dest(file, opts.output);
    await write(out, headers, kept);

    const dropped = rows.length - kept.length;
    log(
      `Filter ${kept.length} rows kept, ${dropped} dropped`,
      `Output: ${out}`,
    );
  },
};
