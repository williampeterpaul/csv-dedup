import { test, expect, describe, afterAll } from "bun:test";
import { join } from "node:path";
import { tmp, run } from "../../test/fixture";
import { read } from "../csv";

const csv = `name,email
Acme,acme@test.com
Beta,beta@test.com
`;

describe("repeat", () => {
  let cleanup: () => Promise<void>;
  afterAll(async () => { if (cleanup) await cleanup(); });

  test("doubles rows by default", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { stdout, code } = await run("repeat", file, "-o", out);

    expect(code).toBe(0);
    expect(stdout).toContain("× 2");
    const sheet = await read(out);
    expect(sheet.rows.length).toBe(4);
    expect(sheet.rows[0]![0]).toBe("Acme");
    expect(sheet.rows[2]![0]).toBe("Acme");
  });

  test("-n 3 triples rows", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { stdout, code } = await run("repeat", file, "-n", "3", "-o", out);

    expect(code).toBe(0);
    expect(stdout).toContain("× 3");
    const sheet = await read(out);
    expect(sheet.rows.length).toBe(6);
    expect(sheet.headers).toEqual(["name", "email"]);
  });

  test("-n 1 is a no-op copy", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { code } = await run("repeat", file, "-n", "1", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.rows.length).toBe(2);
  });
});
