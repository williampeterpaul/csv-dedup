import { test, expect, describe, afterAll } from "bun:test";
import { join } from "node:path";
import { tmp, run } from "../../test/fixture";
import { read } from "../csv";

const csv = `name,email
Acme,acme@test.com
Beta,beta@test.com
`;

describe("append", () => {
  let cleanup: () => Promise<void>;
  afterAll(async () => { if (cleanup) await cleanup(); });

  test("--set adds new column", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { stdout, code } = await run("append", file, "--set", "source=linkedin", "-o", out);

    expect(code).toBe(0);
    expect(stdout).toContain("Append");
    const sheet = await read(out);
    expect(sheet.headers).toContain("source");
    expect(sheet.rows[0]![2]).toBe("linkedin");
    expect(sheet.rows[1]![2]).toBe("linkedin");
  });

  test("--set overwrites existing column", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { code } = await run("append", file, "--set", "email=redacted", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.headers).toEqual(["name", "email"]);
    expect(sheet.rows[0]![1]).toBe("redacted");
  });

  test("multiple --set flags", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { code } = await run("append", file, "--set", "a=1", "--set", "b=2", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.headers).toEqual(["name", "email", "a", "b"]);
    expect(sheet.rows[0]![2]).toBe("1");
    expect(sheet.rows[0]![3]).toBe("2");
  });
});
