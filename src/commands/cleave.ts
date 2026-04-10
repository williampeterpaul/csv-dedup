import { parseArgs } from "node:util";
import type { Cmd } from "../types";
import { usage, fail } from "../cli";
import { one, dest, log } from "../util";
import { read, write } from "../csv";

export const cleave: Cmd = {
  name: "cleave",
  async run(argv) {
    const { values: opts, positionals: pos } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        column: { type: "string", short: "c" },
        on: { type: "string", short: "d" },
        as: { type: "string" },
        last: { type: "boolean", default: false },
        keep: { type: "boolean", default: false },
        output: { type: "string", short: "o" },
        help: { type: "boolean", short: "h" },
      },
    });

    if (opts.help || pos.length === 0) {
      usage("cleave");
      process.exit(0);
    }

    if (!opts.column) fail("--column (-c) is required");
    if (!opts.on) fail("--on (-d) delimiter is required");

    const file = await one(pos, "cleave");
    const { headers, rows } = await read(file);

    const idx = headers.indexOf(opts.column);
    if (idx === -1) fail(`Column "${opts.column}" not found`);

    const [left, right] = opts.as
      ? opts.as.split(",").map((s) => s.trim())
      : [`${opts.column}_1`, `${opts.column}_2`];

    if (!left || !right) fail("--as requires two names separated by a comma");

    const newHeaders = [...headers];
    if (opts.keep) {
      newHeaders.splice(idx + 1, 0, left, right);
    } else {
      newHeaders.splice(idx, 1, left, right);
    }

    const delim = opts.on;
    const outRows: string[][] = [];

    for (const row of rows) {
      const val = row[idx] ?? "";
      const pos = opts.last ? val.lastIndexOf(delim) : val.indexOf(delim);
      const l = pos === -1 ? val : val.slice(0, pos);
      const r = pos === -1 ? "" : val.slice(pos + delim.length);

      const nr = [...row];
      if (opts.keep) {
        nr.splice(idx + 1, 0, l, r);
      } else {
        nr.splice(idx, 1, l, r);
      }
      outRows.push(nr);
    }

    const outPath = dest(file, opts.output);
    await write(outPath, newHeaders, outRows);

    log(
      `Cleave "${opts.column}" → "${left}", "${right}" on "${delim}"`,
      `Rows: ${rows.length}`,
      opts.keep && "Original column kept",
      `Output: ${outPath}`,
    );
  },
};
