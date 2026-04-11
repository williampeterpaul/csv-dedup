import { parseArgs } from "node:util";
import type { Cmd } from "../types";
import { usage, fail } from "../cli";
import { one, dest, log } from "../util";
import { read, write } from "../csv";
import { compile } from "../expr";

export const append: Cmd = {
  name: "append",
  async run(argv) {
    const { values: opts, positionals: pos } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        set: { type: "string", multiple: true },
        expr: { type: "string", short: "e", multiple: true },
        output: { type: "string", short: "o" },
        help: { type: "boolean", short: "h" },
      },
    });

    if (opts.help || pos.length === 0) {
      usage("append");
      process.exit(0);
    }

    if (!opts.set || opts.set.length === 0) fail("--set <col=val> is required");

    const pairs = opts.set.map((s) => {
      const eq = s.indexOf("=");
      if (eq === -1) fail(`Invalid --set "${s}", expected col=val`);
      return { col: s.slice(0, eq), val: s.slice(eq + 1) };
    });

    const file = await one(pos, "append");
    const { headers, rows } = await read(file);

    const preds = await Promise.all((opts.expr ?? []).map((e) => compile(e, headers)));

    const outHeaders = [...headers];
    const assignments: { idx: number; val: string }[] = [];

    for (const { col, val } of pairs) {
      const existing = outHeaders.indexOf(col);
      if (existing !== -1) {
        assignments.push({ idx: existing, val });
      } else {
        outHeaders.push(col);
        assignments.push({ idx: outHeaders.length - 1, val });
      }
    }

    let matched = 0;
    const outRows = rows.map((row) => {
      const nr = [...row];
      while (nr.length < outHeaders.length) nr.push("");
      if (!preds.length || preds.every((p) => p(row))) {
        for (const { idx, val } of assignments) nr[idx] = val;
        matched++;
      }
      return nr;
    });

    const out = dest(file, opts.output);
    await write(out, outHeaders, outRows);

    const desc = pairs.map((p) => `${p.col}=${p.val}`).join(", ");
    const scope = preds.length ? `${matched} of ${rows.length}` : `${rows.length}`;
    log(
      `Append ${pairs.length} column(s) across ${scope} rows`,
      `Set: ${desc}`,
      `Output: ${out}`,
    );
  },
};
