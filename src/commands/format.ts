import { parseArgs } from "node:util";
import type { Cmd } from "../types";
import { usage, fail } from "../cli";
import { one, dest, log } from "../util";
import { read, write, cols } from "../csv";

export const format: Cmd = {
  name: "format",
  async run(argv) {
    const { values: opts, positionals: pos } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        columns: { type: "string", short: "c" },
        upper: { type: "boolean", default: false },
        lower: { type: "boolean", default: false },
        title: { type: "boolean", default: false },
        truncate: { type: "string", short: "t" },
        strip: { type: "string" },
        ascii: { type: "boolean", default: false },
        domain: { type: "boolean", default: false },
        output: { type: "string", short: "o" },
        help: { type: "boolean", short: "h" },
      },
    });

    if (opts.help || pos.length === 0) {
      usage("format");
      process.exit(0);
    }

    const file = await one(pos, "format");
    const { headers, rows } = await read(file);
    const { names: targets, idxs } = cols(opts.columns, headers);

    const maxLen = opts.truncate ? parseInt(opts.truncate, 10) : null;
    if (maxLen !== null && (isNaN(maxLen) || maxLen < 1)) fail("--truncate must be a positive integer");

    const stripSet = opts.strip ? new Set([...opts.strip]) : null;

    let changes = 0;
    for (const row of rows) {
      for (const i of idxs) {
        const orig = row[i] ?? "";
        let val = orig.trim().replace(/\s+/g, " ");

        if (opts.upper) val = val.toUpperCase();
        else if (opts.lower) val = val.toLowerCase();
        else if (opts.title) val = val.replace(/\b\w/g, (ch) => ch.toUpperCase());

        if (opts.ascii) val = val.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "");
        if (opts.domain) val = val.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
        if (stripSet) val = [...val].filter((ch) => !stripSet.has(ch)).join("");
        if (maxLen && val.length > maxLen) val = val.slice(0, maxLen);

        if (val !== orig) {
          row[i] = val;
          changes++;
        }
      }
    }

    const out = dest(file, opts.output);
    await write(out, headers, rows);

    const flags = [
      opts.upper && "upper",
      opts.lower && "lower",
      opts.title && "title",
      opts.ascii && "ascii",
      opts.domain && "domain",
      maxLen && `truncate(${maxLen})`,
      stripSet && `strip(${opts.strip})`,
    ].filter(Boolean);

    log(
      `Format ${changes} values changed across ${rows.length} rows`,
      `Columns: ${targets.join(", ")}`,
      flags.length > 0 && `Applied: ${flags.join(", ")}`,
      `Output:  ${out}`,
    );
  },
};
