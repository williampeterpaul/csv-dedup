import { fail } from "./cli";

type Pred = (val: string) => boolean;

export function compile(expr: string, headers: string[]): (row: string[]) => boolean {
  const parts = expr.split(/\s+AND\s+/);
  const checks: { idx: number; test: Pred }[] = [];

  for (const part of parts) {
    let col: string, test: Pred;

    if (part.includes("!=")) {
      const [c, v] = part.split("!=", 2);
      col = c!.trim();
      const val = unquote(v!.trim());
      test = val === "" ? (v) => v.trim() !== "" : (v) => v !== val;
    } else if (part.includes(":")) {
      const [c, v] = part.split(":", 2);
      col = c!.trim();
      const vals = new Set(v!.split(",").map((s) => s.trim()));
      test = (v) => vals.has(v);
    } else if (part.includes("~")) {
      const [c, v] = part.split("~", 2);
      col = c!.trim();
      const sub = v!.trim();
      test = (v) => v.toLowerCase().includes(sub.toLowerCase());
    } else if (part.includes("=")) {
      const [c, v] = part.split("=", 2);
      col = c!.trim();
      const val = unquote(v!.trim());
      test = val === "" ? (v) => v.trim() === "" : (v) => v === val;
    } else {
      fail(`Invalid expression: ${part}`);
    }

    const idx = headers.indexOf(col);
    if (idx === -1) fail(`Column "${col}" not found`);
    checks.push({ idx, test });
  }

  return (row) => checks.every(({ idx, test }) => test(row[idx] ?? ""));
}

function unquote(s: string): string {
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"')))
    return s.slice(1, -1);
  return s;
}
