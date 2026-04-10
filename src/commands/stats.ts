import type { Cmd } from "../types";
import { one } from "../util";
import { read } from "../csv";

export const stats: Cmd = {
  name: "stats",
  async run(argv) {
  const file = await one(argv, "stats");
  const { headers, rows } = await read(file);

  const total = rows.length;
  const freqs: Map<string, number>[] = headers.map(() => new Map());
  const filled: number[] = headers.map(() => 0);

  for (const row of rows) {
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
