import { parseArgs } from "node:util";
import type { Cmd } from "../types";
import { usage, fail } from "../cli";
import { one, dest, log } from "../util";
import { read, write } from "../csv";

export const join: Cmd = {
  name: "join",
  async run(argv) {
    const { values: opts, positionals: pos } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        from: { type: "string" },
        glue: { type: "string", default: "" },
        as: { type: "string" },
        drop: { type: "boolean", default: false },
        output: { type: "string", short: "o" },
        help: { type: "boolean", short: "h" },
      },
    });

    if (opts.help || pos.length === 0) {
      usage("join");
      process.exit(0);
    }

    if (!opts.from) fail("--from is required");
    if (!opts.as) fail("--as is required");

    const srcNames = opts.from.split(",").map((s) => s.trim());
    const file = await one(pos, "join");
    const { headers, rows } = await read(file);

    const srcIdxs = srcNames.map((n) => {
      const i = headers.indexOf(n);
      if (i === -1) fail(`Column "${n}" not found`);
      return i;
    });

    const dropSet = opts.drop ? new Set(srcIdxs) : null;
    const keepIdxs = dropSet
      ? headers.map((_, i) => i).filter((i) => !dropSet.has(i))
      : headers.map((_, i) => i);

    const outHeaders = [...keepIdxs.map((i) => headers[i]!), opts.as];
    const outRows = rows.map((row) => {
      const joined = srcIdxs.map((i) => row[i] ?? "").join(opts.glue);
      return [...keepIdxs.map((i) => row[i] ?? ""), joined];
    });

    const out = dest(file, opts.output);
    await write(out, outHeaders, outRows);

    log(
      `Join ${srcNames.join(", ")} → "${opts.as}"`,
      `Glue: "${opts.glue}"`,
      `Rows: ${rows.length}`,
      opts.drop && "Source columns dropped",
      `Output: ${out}`,
    );
  },
};
