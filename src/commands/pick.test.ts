import { test, expect, describe, afterAll } from "bun:test";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { tmp, run } from "../../test/fixture";
import { read } from "../csv";

const csv = `name,email,country,notes
Acme,acme@test.com,US,internal
Beta,beta@test.com,UK,draft
`;

describe("pick", () => {
  let cleanup: () => Promise<void>;
  afterAll(async () => { if (cleanup) await cleanup(); });

  test("-c keeps and reorders columns", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { stdout, code } = await run("pick", file, "-c", "email,name", "-o", out);

    expect(code).toBe(0);
    expect(stdout).toContain("Pick");
    const sheet = await read(out);
    expect(sheet.headers).toEqual(["email", "name"]);
    expect(sheet.rows[0]).toEqual(["acme@test.com", "Acme"]);
  });

  test("--drop removes columns", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { code } = await run("pick", file, "--drop", "notes,country", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.headers).toEqual(["name", "email"]);
    expect(sheet.rows[0]).toEqual(["Acme", "acme@test.com"]);
  });

  test("--dry-run skips file write", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "dry.csv");

    const { stdout, code } = await run("pick", file, "-c", "email,name", "-o", out, "--dry-run");

    expect(code).toBe(0);
    expect(stdout).toContain("[dry-run]");
    expect(existsSync(out)).toBe(false);
  });

  test("errors when both -c and --drop given", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);

    const { code, stderr } = await run("pick", file, "-c", "name", "--drop", "notes");

    expect(code).not.toBe(0);
    expect(stderr).toContain("Cannot use both");
  });
});
