import { parseArgs } from "node:util";
import type { Cmd } from "../types";
import { usage, fail } from "../cli";
import { one, dest, log } from "../util";
import { read, write } from "../csv";

export const sort: Cmd = {
  name: "sort",
  async run(argv) {
    const { values: opts, positionals: pos } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        column: { type: "string", short: "c" },
        desc: { type: "boolean", short: "d" },
        numeric: { type: "boolean", short: "n" },
        output: { type: "string", short: "o" },
        help: { type: "boolean", short: "h" },
      },
    });

    if (opts.help || pos.length === 0) {
      usage("sort");
      process.exit(0);
    }

    const file = await one(pos, "sort");
    const { headers, rows } = await read(file);

    const col = opts.column ?? headers[0]!;
    const idx = headers.indexOf(col);
    if (idx === -1) fail(`Column "${col}" not found`);

    const numeric = opts.numeric ?? rows.every((r) => {
      const v = (r[idx] ?? "").trim();
      return v === "" || !isNaN(parseFloat(v));
    });

    const dir = opts.desc ? -1 : 1;
    const cmp = numeric
      ? (a: string[], b: string[]) => {
          const na = parseFloat(a[idx] ?? "");
          const nb = parseFloat(b[idx] ?? "");
          return ((isNaN(na) ? Infinity : na) - (isNaN(nb) ? Infinity : nb)) * dir;
        }
      : (a: string[], b: string[]) => {
          return (a[idx] ?? "").localeCompare(b[idx] ?? "") * dir;
        };

    const sorted = [...rows].sort(cmp);

    const out = dest(file, opts.output);
    await write(out, headers, sorted);

    const mode = numeric ? "numeric" : "alphabetical";
    log(
      `Sort ${rows.length} rows by "${col}" (${mode}${opts.desc ? ", desc" : ""})`,
      `Output: ${out}`,
    );
  },
};
