import { resolve } from "node:path";
import { fail } from "./cli";
import { read as readCsv } from "./csv";

type Pred = (val: string) => boolean;
type RowPred = (row: string[]) => boolean;
type Token = { type: "(" | ")" | "AND" | "OR" | "ATOM"; val: string };

export function jw(a: string, b: string): number {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  if (s === t) return 1;
  const sl = s.length, tl = t.length;
  if (!sl || !tl) return 0;

  const range = Math.max(0, Math.floor(Math.max(sl, tl) / 2) - 1);
  const sm = new Array(sl).fill(false);
  const tm = new Array(tl).fill(false);
  let matches = 0;

  for (let i = 0; i < sl; i++) {
    const lo = Math.max(0, i - range);
    const hi = Math.min(tl - 1, i + range);
    for (let j = lo; j <= hi; j++) {
      if (tm[j] || s[i] !== t[j]) continue;
      sm[i] = tm[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;

  let trans = 0, k = 0;
  for (let i = 0; i < sl; i++) {
    if (!sm[i]) continue;
    while (!tm[k]) k++;
    if (s[i] !== t[k]) trans++;
    k++;
  }

  const jaro = (matches / sl + matches / tl + (matches - trans / 2) / matches) / 3;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, sl, tl); i++) {
    if (s[i] === t[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  const re = /\(|\)|\s+AND\s+|\s+OR\s+/g;
  let last = 0;
  let m: RegExpExecArray | null;

  const inRegex = (pos: number): boolean => {
    const before = expr.slice(0, pos);
    const open = before.lastIndexOf("~/");
    if (open < 0) return false;
    const after = expr.slice(open + 2);
    const close = after.indexOf("/");
    return close < 0 || open + 2 + close > pos;
  };

  while ((m = re.exec(expr)) !== null) {
    if (inRegex(m.index)) continue;
    if (m.index > last) {
      const atom = expr.slice(last, m.index).trim();
      if (atom) tokens.push({ type: "ATOM", val: atom });
    }
    const matched = m[0].trim();
    if (matched === "(") tokens.push({ type: "(", val: "(" });
    else if (matched === ")") tokens.push({ type: ")", val: ")" });
    else tokens.push({ type: matched as "AND" | "OR", val: matched });
    last = m.index + m[0].length;
  }

  if (last < expr.length) {
    const atom = expr.slice(last).trim();
    if (atom) tokens.push({ type: "ATOM", val: atom });
  }

  return tokens;
}

export async function compile(expr: string, headers: string[]): Promise<RowPred> {
  const tokens = tokenize(expr);
  let pos = 0;

  function peek(): Token | undefined { return tokens[pos]; }
  function next(): Token {
    if (pos >= tokens.length) fail("Unexpected end of expression");
    return tokens[pos++]!;
  }

  async function parseExpr(): Promise<RowPred> {
    const branches: RowPred[] = [await parseTerm()];
    while (peek()?.type === "OR") {
      next();
      branches.push(await parseTerm());
    }
    return branches.length === 1 ? branches[0]! : (row) => branches.some((b) => b(row));
  }

  async function parseTerm(): Promise<RowPred> {
    const factors: RowPred[] = [await parseFactor()];
    while (peek()?.type === "AND") {
      next();
      factors.push(await parseFactor());
    }
    return factors.length === 1 ? factors[0]! : (row) => factors.every((f) => f(row));
  }

  async function parseFactor(): Promise<RowPred> {
    if (peek()?.type === "(") {
      next();
      const inner = await parseExpr();
      const t = next();
      if (t.type !== ")") fail(`Expected ")", got "${t.val}"`);
      return inner;
    }
    const t = next();
    if (t.type !== "ATOM") fail(`Expected expression, got "${t.val}"`);

    const sim = t.val.match(/^(.+?)%(.+?)(>=?|<=?|!=|=)(.+)$/);
    if (sim) {
      const [, ca, cb, op, rv] = sim;
      const colA = ca!.trim(), colB = cb!.trim();
      const threshold = num(rv!.trim(), t.val);
      const ia = headers.indexOf(colA);
      const ib = headers.indexOf(colB);
      if (ia === -1) fail(`Column "${colA}" not found`);
      if (ib === -1) fail(`Column "${colB}" not found`);
      const cmp = comparator(op!, threshold);
      return (row) => cmp(jw(row[ia] ?? "", row[ib] ?? ""));
    }

    const { col, test } = await leaf(t.val);
    const idx = headers.indexOf(col);
    if (idx === -1) fail(`Column "${col}" not found`);
    return (row) => test(row[idx] ?? "");
  }

  const result = await parseExpr();
  if (pos < tokens.length) fail(`Unexpected token: "${tokens[pos]!.val}"`);
  return result;
}

async function load(path: string): Promise<string> {
  const abs = resolve(path);
  if (!(await Bun.file(abs).exists())) fail(`File not found: ${abs}`);
  return Bun.file(abs).text();
}

async function leaf(part: string): Promise<{ col: string; test: Pred }> {
  let m: RegExpMatchArray | null;

  if (part.includes("!~/")) {
    const [c, rest] = part.split("!~/", 2);
    const col = c!.trim();
    const re = regex(rest!);
    return { col, test: not((v) => re.test(v)) };
  }

  if (part.includes("~/")) {
    const [c, rest] = part.split("~/", 2);
    const col = c!.trim();
    const re = regex(rest!);
    return { col, test: (v) => re.test(v) };
  }

  if ((m = part.match(/^(.+?)\.len(>=?|<=?|!=|=)(.+)$/))) {
    const col = m[1]!.trim();
    const op = m[2]!;
    const threshold = num(m[3]!.trim(), part);
    const cmp = comparator(op, threshold);
    return { col, test: (v) => cmp(v.length) };
  }

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

  if (part.includes("!:")) {
    const [c, v] = part.split("!:", 2);
    const col = c!.trim();
    const raw = v!.trim();
    if (raw.startsWith("@")) {
      const path = raw.slice(1);
      const vals = path.endsWith(".csv")
        ? new Set((await readCsv(resolve(path))).rows.map((r) => r[0] ?? ""))
        : new Set((await load(path)).split("\n").map((s) => s.trim()).filter(Boolean));
      return { col, test: not((v) => vals.has(v)) };
    }
    const vals = new Set(raw.split(",").map((s) => s.trim()));
    return { col, test: not((v) => vals.has(v)) };
  }

  if (part.includes(":")) {
    const [c, v] = part.split(":", 2);
    const col = c!.trim();
    const raw = v!.trim();
    if (raw.startsWith("@")) {
      const path = raw.slice(1);
      const vals = path.endsWith(".csv")
        ? new Set((await readCsv(resolve(path))).rows.map((r) => r[0] ?? ""))
        : new Set((await load(path)).split("\n").map((s) => s.trim()).filter(Boolean));
      return { col, test: (v) => vals.has(v) };
    }
    const vals = new Set(raw.split(",").map((s) => s.trim()));
    return { col, test: (v) => vals.has(v) };
  }

  if (part.includes("!~~")) {
    const [c, v] = part.split("!~~", 2);
    const col = c!.trim();
    const raw = v!.trim();
    if (raw.startsWith("@")) {
      const hay = (await load(raw.slice(1))).toLowerCase();
      return { col, test: not((v) => v !== "" && hay.includes(v.toLowerCase())) };
    }
    const hay = unquote(raw).toLowerCase();
    return { col, test: not((v) => v !== "" && hay.includes(v.toLowerCase())) };
  }

  if (part.includes("~~")) {
    const [c, v] = part.split("~~", 2);
    const col = c!.trim();
    const raw = v!.trim();
    if (raw.startsWith("@")) {
      const hay = (await load(raw.slice(1))).toLowerCase();
      return { col, test: (v) => v !== "" && hay.includes(v.toLowerCase()) };
    }
    const hay = unquote(raw).toLowerCase();
    return { col, test: (v) => v !== "" && hay.includes(v.toLowerCase()) };
  }

  if (part.includes("!~")) {
    const [c, v] = part.split("!~", 2);
    const col = c!.trim();
    const sub = v!.trim();
    return { col, test: not((v) => v.toLowerCase().includes(sub.toLowerCase())) };
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

function comparator(op: string, threshold: number): (n: number) => boolean {
  if (op === ">=") return (n) => n >= threshold;
  if (op === ">")  return (n) => n > threshold;
  if (op === "<=") return (n) => n <= threshold;
  if (op === "<")  return (n) => n < threshold;
  if (op === "!=") return (n) => n !== threshold;
  return (n) => n === threshold;
}

function not(fn: Pred): Pred {
  return (v) => !fn(v);
}

function regex(s: string): RegExp {
  const last = s.lastIndexOf("/");
  if (last < 0) fail("Invalid regex: missing closing /");
  const pattern = s.slice(0, last);
  const flags = s.slice(last + 1);
  return new RegExp(pattern, flags);
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
