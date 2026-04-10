import type { JoinArgs } from "./cli";
import { fail } from "./cli";
import { read, write } from "./csv";

export interface Strategy {
  name: string;
  filter(order: string[], hits: Map<string, Set<number>>, count: number): string[];
}

export async function run(args: JoinArgs, strategy: Strategy) {
  const sheets = await Promise.all(args.files.map(read));

  for (let i = 0; i < sheets.length; i++)
    for (const k of args.keys)
      if (!sheets[i]!.headers.includes(k))
        fail(`Key column "${k}" not found in ${args.files[i]}`);

  const all = [...new Set(sheets.flatMap((s) => s.headers))];
  const cols = args.cols
    ? [...new Set([...args.keys, ...args.cols.filter((c) => all.includes(c))])]
    : all;

  if (args.cols)
    for (const c of args.cols)
      if (!all.includes(c))
        console.warn(`Warning: column "${c}" not found in any input file`);

  const map = new Map<string, Record<string, string>>();
  const hits = new Map<string, Set<number>>();
  const order: string[] = [];

  for (let fi = 0; fi < sheets.length; fi++) {
    const { headers, rows } = sheets[fi]!;
    const idx = Object.fromEntries(headers.map((h, i) => [h, i]));

    for (const row of rows) {
      const key = args.keys.map((k) => row[idx[k]!] ?? "").join("\0");

      if (!map.has(key)) {
        map.set(key, Object.fromEntries(cols.map((c) => [c, ""])));
        hits.set(key, new Set());
        order.push(key);
      }

      hits.get(key)!.add(fi);

      const rec = map.get(key)!;
      for (const c of cols) {
        const ci = idx[c];
        if (ci !== undefined && row[ci] && !rec[c]) rec[c] = row[ci]!;
      }
    }
  }

  const kept = strategy.filter(order, hits, sheets.length);
  const rows = kept.map((k) => cols.map((c) => map.get(k)![c] ?? ""));

  await write(args.dest, cols, rows);

  const dropped = order.length - kept.length;
  console.log(`${strategy.name} ${kept.length} rows from ${sheets.length} file(s)${dropped ? ` (${dropped} dropped)` : ""}`);
  console.log(`  Columns: ${cols.join(", ")}`);
  console.log(`  Keys:    ${args.keys.join(", ")}`);
  console.log(`  Output:  ${args.dest}`);
}
