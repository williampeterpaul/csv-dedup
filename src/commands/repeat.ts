import { parseArgs } from "node:util";
import type { Cmd } from "../types";
import { usage, fail } from "../cli";
import { one, dest, log } from "../util";
import { read, write } from "../csv";
import { compile } from "../expr";

export const repeat: Cmd = {
  name: "repeat",
  async run(argv) {
    const { values: opts, positionals: pos } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        times: { type: "string", short: "n" },
        expr: { type: "string", short: "e", multiple: true },
        output: { type: "string", short: "o" },
        help: { type: "boolean", short: "h" },
      },
    });

    if (opts.help || pos.length === 0) {
      usage("repeat");
      process.exit(0);
    }

    const n = parseInt(opts.times ?? "2", 10);
    if (isNaN(n) || n < 1) fail("--times must be a positive integer");

    const file = await one(pos, "repeat");
    const { headers, rows } = await read(file);

    const preds = opts.expr
      ? await Promise.all(opts.expr.map((e) => compile(e, headers)))
      : null;

    const out = dest(file, opts.output);
    const duped: string[][] = [];
    for (const row of rows) {
      const match = !preds || preds.every((p) => p(row));
      const times = match ? n : 1;
      for (let i = 0; i < times; i++) duped.push(row);
    }
    await write(out, headers, duped);

    log(
      `Repeat ${rows.length} rows × ${n} = ${duped.length} rows`,
      preds && `Expr:   ${opts.expr!.join(" AND ")}`,
      `Output: ${out}`,
    );
  },
};
