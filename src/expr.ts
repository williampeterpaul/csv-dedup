import { fail } from "./cli";

type Pred = (val: string) => boolean;

export function compile(expr: string, headers: string[]): (row: string[]) => boolean {
  const branches = expr.split(/\s+OR\s+/).map((branch) => {
    const raw = branch.replace(/^\(|\)$/g, "").trim();
    const parts = raw.split(/\s+AND\s+/);
    const checks: { idx: number; test: Pred }[] = [];

    for (const part of parts) {
      const { col, test } = parse(part.trim());
      const idx = headers.indexOf(col);
      if (idx === -1) fail(`Column "${col}" not found`);
      checks.push({ idx, test });
    }

    return (row: string[]) => checks.every(({ idx, test }) => test(row[idx] ?? ""));
  });

  return (row) => branches.some((branch) => branch(row));
}

function parse(part: string): { col: string; test: Pred } {
  let m: RegExpMatchArray | null;

  if ((m = part.match(/^(.+?)!=(.*)$/))) {
    const col = m[1]!.trim();
    const val = unquote(m[2]!.trim());
    const test: Pred = val === "" ? (v) => v.trim() !== "" : (v) => v !== val;
    return { col, test };
  }

  if ((m = part.match(/^(.+?)>=(.*)$/))) {
    const col = m[1]!.trim();
    const threshold = num(m[2]!.trim(), part);
    return { col, test: (v) => { const n = parseFloat(v); return !isNaN(n) && n >= threshold; } };
  }

  if ((m = part.match(/^(.+?)<=(.*)$/))) {
    const col = m[1]!.trim();
    const threshold = num(m[2]!.trim(), part);
    return { col, test: (v) => { const n = parseFloat(v); return !isNaN(n) && n <= threshold; } };
  }

  if ((m = part.match(/^(.+?)>(.+)$/))) {
    const col = m[1]!.trim();
    const threshold = num(m[2]!.trim(), part);
    return { col, test: (v) => { const n = parseFloat(v); return !isNaN(n) && n > threshold; } };
  }

  if ((m = part.match(/^(.+?)<(.+)$/))) {
    const col = m[1]!.trim();
    const threshold = num(m[2]!.trim(), part);
    return { col, test: (v) => { const n = parseFloat(v); return !isNaN(n) && n < threshold; } };
  }

  if (part.includes(":")) {
    const [c, v] = part.split(":", 2);
    const col = c!.trim();
    const vals = new Set(v!.split(",").map((s) => s.trim()));
    return { col, test: (v) => vals.has(v) };
  }

  if (part.includes("~")) {
    const [c, v] = part.split("~", 2);
    const col = c!.trim();
    const sub = v!.trim();
    return { col, test: (v) => v.toLowerCase().includes(sub.toLowerCase()) };
  }

  if (part.includes("=")) {
    const [c, v] = part.split("=", 2);
    const col = c!.trim();
    const val = unquote(v!.trim());
    const test: Pred = val === "" ? (v) => v.trim() === "" : (v) => v === val;
    return { col, test };
  }

  fail(`Invalid expression: ${part}`);
}

function num(s: string, expr: string): number {
  const n = parseFloat(unquote(s));
  if (isNaN(n)) fail(`Expected a number in expression: ${expr}`);
  return n;
}

function unquote(s: string): string {
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"')))
    return s.slice(1, -1);
  return s;
}
