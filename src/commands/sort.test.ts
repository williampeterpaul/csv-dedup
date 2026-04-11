import { test, expect, describe, afterAll } from "bun:test";
import { join } from "node:path";
import { tmp, run } from "../../test/fixture";
import { read } from "../csv";

const csv = `name,email,score
Charlie,charlie@test.com,30
Acme,acme@test.com,75
Beta,beta@test.com,50
`;

describe("sort", () => {
  let cleanup: () => Promise<void>;
  afterAll(async () => { if (cleanup) await cleanup(); });

  test("sorts by first column by default", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { stdout, code } = await run("sort", file, "-o", out);

    expect(code).toBe(0);
    expect(stdout).toContain("Sort");
    const sheet = await read(out);
    expect(sheet.rows[0]![0]).toBe("Acme");
    expect(sheet.rows[1]![0]).toBe("Beta");
    expect(sheet.rows[2]![0]).toBe("Charlie");
  });

  test("-c sorts by specified column", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { code } = await run("sort", file, "-c", "email", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.rows[0]![1]).toBe("acme@test.com");
    expect(sheet.rows[1]![1]).toBe("beta@test.com");
    expect(sheet.rows[2]![1]).toBe("charlie@test.com");
  });

  test("-d sorts descending", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { code } = await run("sort", file, "-c", "name", "-d", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.rows[0]![0]).toBe("Charlie");
    expect(sheet.rows[1]![0]).toBe("Beta");
    expect(sheet.rows[2]![0]).toBe("Acme");
  });

  test("auto-detects numeric column", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { stdout, code } = await run("sort", file, "-c", "score", "-o", out);

    expect(code).toBe(0);
    expect(stdout).toContain("numeric");
    const sheet = await read(out);
    expect(sheet.rows[0]![2]).toBe("30");
    expect(sheet.rows[1]![2]).toBe("50");
    expect(sheet.rows[2]![2]).toBe("75");
  });

  test("auto-detects alphabetical column", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { stdout, code } = await run("sort", file, "-c", "name", "-o", out);

    expect(code).toBe(0);
    expect(stdout).toContain("alphabetical");
    const sheet = await read(out);
    expect(sheet.rows[0]![0]).toBe("Acme");
    expect(sheet.rows[2]![0]).toBe("Charlie");
  });

  test("-d with auto-detected numeric sorts descending", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { code } = await run("sort", file, "-c", "score", "-d", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.rows[0]![2]).toBe("75");
    expect(sheet.rows[1]![2]).toBe("50");
    expect(sheet.rows[2]![2]).toBe("30");
  });
});
