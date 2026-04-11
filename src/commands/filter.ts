import { parseArgs } from "node:util";
import { resolve } from "node:path";
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
        in: { type: "string" },
        columns: { type: "string", short: "c" },
        invert: { type: "boolean", short: "v" },
        output: { type: "string", short: "o" },
        help: { type: "boolean", short: "h" },
      },
    });

    if (opts.help || pos.length === 0) {
      usage("filter");
      process.exit(0);
    }

    const hasExpr = opts.expr && opts.expr.length > 0;
    const hasIn = !!opts.in;
    if (!hasExpr && !hasIn) fail("Provide --expr (-e) or --in");
    if (hasIn && !opts.columns) fail("--columns (-c) is required with --in");

    const file = await one(pos, "filter");
    const { headers, rows } = await read(file);

    const preds: ((row: string[]) => boolean)[] = [];

    if (hasExpr) {
      for (const e of opts.expr!) preds.push(compile(e, headers));
    }

    if (hasIn) {
      const abs = resolve(opts.in!);
      if (!(await Bun.file(abs).exists())) fail(`File not found: ${abs}`);
      const ref = await Bun.file(abs).text();
      const colNames = opts.columns!.split(",").map((s) => s.trim());
      const srcIdxs = colNames.map((n) => {
        const i = headers.indexOf(n);
        if (i === -1) fail(`Column "${n}" not found in source`);
        return i;
      });
      preds.push((row) => srcIdxs.some((i) => {
        const v = row[i] ?? "";
        return v !== "" && ref.includes(v);
      }));
    }

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
