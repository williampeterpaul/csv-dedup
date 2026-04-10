import Papa from "papaparse";
import type { Sheet } from "./types";
import { fail, dry } from "./cli";

export async function read(path: string): Promise<Sheet> {
  const raw = await Bun.file(path).text();
  const parsed = Papa.parse<string[]>(raw, {
    header: false,
    skipEmptyLines: true,
  });

  const errs = parsed.errors.filter((e) => e.code !== "UndetectableDelimiter");
  if (errs.length > 0) {
    console.error("CSV parse errors:", errs);
    process.exit(1);
  }

  const [headers, ...rows] = parsed.data;
  if (!headers) {
    console.error("Error: CSV must have a header row");
    process.exit(1);
  }

  return { headers, rows };
}

export async function write(path: string, headers: string[], rows: string[][]) {
  if (dry) return;
  const csv = Papa.unparse({ fields: headers, data: rows });
  await Bun.write(path, csv);
}

export function cols(raw: string | undefined, headers: string[]): { names: string[]; idxs: number[] } {
  const names = raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : headers;
  const idxs = names.map((n) => {
    const i = headers.indexOf(n);
    if (i === -1) fail(`Column "${n}" not found`);
    return i;
  });
  return { names, idxs };
}
