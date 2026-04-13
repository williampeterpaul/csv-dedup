import { test, expect, describe, afterAll } from "bun:test";
import { join } from "node:path";
import { tmp, run } from "../../test/fixture";
import { read } from "../csv";

const csv = `name,email,country
Acme Corp,acme@test.com,US
Acme Corp,acme2@test.com,UK
Beta,beta@test.com,US
Beta,beta2@test.com,DE
Al,al@test.com,US
Al,al2@test.com,FR
`;

describe("unique", () => {
  let cleanup: () => Promise<void>;
  afterAll(async () => { if (cleanup) await cleanup(); });

  test("dedup by key keeps first occurrence", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { code } = await run("unique", file, "-k", "name", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.rows.length).toBe(3);
    expect(sheet.rows.map((r) => r[0])).toEqual(["Acme Corp", "Beta", "Al"]);
    expect(sheet.rows[0]![1]).toBe("acme@test.com");
  });

  test("-e restricts dedup to matching rows", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { stdout, code } = await run("unique", file, "-k", "name", "-e", "name.len>=4", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    // Acme Corp: len=9 >=4, deduped → 1 row
    // Beta: len=4 >=4, deduped → 1 row
    // Al: len=2 <4, both kept as-is → 2 rows
    expect(sheet.rows.length).toBe(4);
    const names = sheet.rows.map((r) => r[0]);
    expect(names).toEqual(["Acme Corp", "Beta", "Al", "Al"]);
  });

  test("-e with no duplicates in matching rows", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const src = `name,email\nAlpha,a@b.com\nBeta,b@c.com\n`;
    const file = await t.file("data.csv", src);
    const out = join(t.dir, "out.csv");

    const { code } = await run("unique", file, "-k", "name", "-e", "name.len>=3", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.rows.length).toBe(2);
  });

  test("-c restricts output columns", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { code } = await run("unique", file, "-k", "name", "-c", "name,email", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.headers).toEqual(["name", "email"]);
    expect(sheet.rows[0]!.length).toBe(2);
  });

  test("errors without --keys", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);

    const { code, stderr } = await run("unique", file);

    expect(code).not.toBe(0);
    expect(stderr).toContain("--keys");
  });
});
