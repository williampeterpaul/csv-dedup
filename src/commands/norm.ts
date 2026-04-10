import { parseArgs } from "node:util";
import type { Cmd } from "../types";
import { usage } from "../cli";
import { one, dest, log } from "../util";
import { read, write, cols } from "../csv";

export const norm: Cmd = {
  name: "norm",
  async run(argv) {
    const { values: opts, positionals: pos } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        columns: { type: "string", short: "c" },
        domain: { type: "boolean", default: false },
        ascii: { type: "boolean", default: false },
        output: { type: "string", short: "o" },
        help: { type: "boolean", short: "h" },
      },
    });

    if (opts.help || pos.length === 0) {
      usage("norm");
      process.exit(0);
    }

    const file = await one(pos, "norm");
    const { headers, rows } = await read(file);
    const { names: targets, idxs } = cols(opts.columns, headers);

    let changes = 0;
    for (const row of rows) {
      for (const i of idxs) {
        const orig = row[i] ?? "";
        let val = orig.trim().toLowerCase().replace(/\s+/g, " ");
        if (opts.ascii) val = val.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "");
        if (opts.domain) val = val.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
        if (val !== orig) {
          row[i] = val;
          changes++;
        }
      }
    }

    const out = dest(file, opts.output);
    await write(out, headers, rows);

    log(
      `Norm ${changes} values changed across ${rows.length} rows`,
      `Columns: ${targets.join(", ")}`,
      opts.ascii && "ASCII cleanup: on",
      opts.domain && "Domain cleanup: on",
      `Output:  ${out}`,
    );
  },
};
