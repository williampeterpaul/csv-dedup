import { parseArgs } from "node:util";
import type { Cmd } from "../types";
import { usage } from "../cli";
import { one } from "../util";
import { read } from "../csv";
import { compile } from "../expr";

export const stats: Cmd = {
  name: "stats",
  async run(argv) {
    const { values: opts, positionals: pos } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        expr: { type: "string", short: "e", multiple: true },
        help: { type: "boolean", short: "h" },
      },
    });

    if (opts.help || pos.length === 0) {
      usage("stats");
      process.exit(0);
    }

    const file = await one(pos, "stats");
    const { headers, rows } = await read(file);

    const preds = (opts.expr ?? []).map((e) => compile(e, headers));
    const filtered = preds.length
      ? rows.filter((row) => preds.every((p) => p(row)))
      : rows;

    const total = filtered.length;
    const freqs: Map<string, number>[] = headers.map(() => new Map());
    const filled: number[] = headers.map(() => 0);

    for (const row of filtered) {
      for (let i = 0; i < headers.length; i++) {
        const val = (row[i] ?? "").trim();
        if (val) {
          filled[i]!++;
          const m = freqs[i]!;
          m.set(val, (m.get(val) ?? 0) + 1);
        }
      }
    }

    console.log(`\n${file}`);
    if (preds.length) console.log(`Filtered: ${filtered.length} of ${rows.length} rows`);
    console.log(`${total} rows, ${headers.length} columns\n`);

    const pad = Math.max(...headers.map((h) => h.length), 6);

    console.log(`${"Column".padEnd(pad)}  ${"Fill".padStart(6)}  ${"Unique".padStart(6)}  Top values`);
    console.log("─".repeat(pad + 40));

    for (let i = 0; i < headers.length; i++) {
      const pct = total ? ((filled[i]! / total) * 100).toFixed(1) + "%" : "0%";
      const uniq = freqs[i]!.size;
      const top = [...freqs[i]!.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([v, n]) => `${v} (${n})`)
        .join(", ");

      console.log(`${headers[i]!.padEnd(pad)}  ${pct.padStart(6)}  ${String(uniq).padStart(6)}  ${top}`);
    }

    console.log();
  },
};
