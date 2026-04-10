import { parseArgs } from "node:util";
import type { Cmd } from "../types";
import { usage, fail } from "../cli";
import { one, dest, log } from "../util";
import { read, write } from "../csv";

export const pick: Cmd = {
  name: "pick",
  async run(argv) {
    const { values: opts, positionals: pos } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        columns: { type: "string", short: "c" },
        drop: { type: "string" },
        output: { type: "string", short: "o" },
        help: { type: "boolean", short: "h" },
      },
    });

    if (opts.help || pos.length === 0) {
      usage("pick");
      process.exit(0);
    }

    if (opts.columns && opts.drop) fail("Cannot use both --columns and --drop");
    if (!opts.columns && !opts.drop) fail("Provide --columns (-c) or --drop");

    const file = await one(pos, "pick");
    const { headers, rows } = await read(file);

    let idxs: number[];

    if (opts.columns) {
      const names = opts.columns.split(",").map((s) => s.trim());
      idxs = names.map((n) => {
        const i = headers.indexOf(n);
        if (i === -1) fail(`Column "${n}" not found`);
        return i;
      });
    } else {
      const dropSet = new Set(opts.drop!.split(",").map((s) => s.trim()));
      for (const d of dropSet) {
        if (!headers.includes(d)) fail(`Column "${d}" not found`);
      }
      idxs = headers.map((_, i) => i).filter((i) => !dropSet.has(headers[i]!));
    }

    const outHeaders = idxs.map((i) => headers[i]!);
    const outRows = rows.map((row) => idxs.map((i) => row[i] ?? ""));

    const out = dest(file, opts.output);
    await write(out, outHeaders, outRows);

    log(
      `Pick ${outHeaders.length} of ${headers.length} columns`,
      `Columns: ${outHeaders.join(", ")}`,
      `Rows: ${rows.length}`,
      `Output: ${out}`,
    );
  },
};
