import { parseArgs } from "node:util";
import type { Cmd } from "../types";
import { usage, fail } from "../cli";
import { one, dest, log } from "../util";
import { read, write } from "../csv";
import { compile } from "../expr";

export const unique: Cmd = {
  name: "unique",
  async run(argv) {
    const { values: opts, positionals: pos } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        keys: { type: "string", short: "k" },
        expr: { type: "string", short: "e", multiple: true },
        columns: { type: "string", short: "c" },
        output: { type: "string", short: "o" },
        help: { type: "boolean", short: "h" },
      },
    });

    if (opts.help || pos.length === 0) {
      usage("unique");
      process.exit(0);
    }

    if (!opts.keys) fail("--keys is required");

    const file = await one(pos, "unique");
    const { headers, rows } = await read(file);

    const keys = opts.keys!.split(",").map((s) => s.trim()).filter(Boolean);
    for (const k of keys)
      if (!headers.includes(k)) fail(`Key column "${k}" not found`);

    const kidx = keys.map((k) => headers.indexOf(k));

    const preds = opts.expr
      ? await Promise.all(opts.expr.map((e) => compile(e, headers)))
      : null;

    const seen = new Set<string>();
    const kept: string[][] = [];

    for (const row of rows) {
      const match = !preds || preds.every((p) => p(row));

      if (!match) {
        kept.push(row);
        continue;
      }

      const key = kidx.map((i) => row[i] ?? "").join("\0");
      if (seen.has(key)) continue;
      seen.add(key);
      kept.push(row);
    }

    const cols = opts.columns
      ? opts.columns.split(",").map((s) => s.trim()).filter(Boolean)
      : null;

    const outHeaders = cols
      ? headers.filter((h) => cols.includes(h))
      : headers;
    const outIdx = outHeaders.map((h) => headers.indexOf(h));
    const outRows = kept.map((r) => outIdx.map((i) => r[i] ?? ""));

    const out = dest(file, opts.output);
    await write(out, outHeaders, outRows);

    const dropped = rows.length - kept.length;
    log(
      `Unique ${kept.length} rows, ${dropped} duplicates removed`,
      `Keys:    ${keys.join(", ")}`,
      preds && `Expr:    ${opts.expr!.join(" AND ")}`,
      `Output:  ${out}`,
    );
  },
};
