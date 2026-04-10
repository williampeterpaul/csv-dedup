import { test, expect, describe, afterAll } from "bun:test";
import { join } from "node:path";
import { tmp, run } from "../../test/fixture";
import { read } from "../csv";

const csv = `name,country,email
Acme,US,acme@test.com
Beta,UK,
Gamma,US,gamma@test.com
Delta,FR,delta@test.com
`;

describe("filter", () => {
  let cleanup: () => Promise<void>;
  afterAll(async () => { if (cleanup) await cleanup(); });

  test("equality filter keeps matching rows", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { stdout, code } = await run("filter", file, "-e", "country=US", "-o", out);

    expect(code).toBe(0);
    expect(stdout).toContain("2 rows kept");
    const sheet = await read(out);
    expect(sheet.rows.length).toBe(2);
    expect(sheet.rows.every((r) => r[1] === "US")).toBe(true);
  });

  test("negation filter excludes matching rows", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { code } = await run("filter", file, "-e", "country!=US", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.rows.length).toBe(2);
    expect(sheet.rows.every((r) => r[1] !== "US")).toBe(true);
  });

  test("combined AND expression", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { code } = await run("filter", file, "-e", "country=US AND email!=''", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.rows.length).toBe(2);
  });

  test("contains (~) case-insensitive substring match", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { code } = await run("filter", file, "-e", "name~amm", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.rows.length).toBe(1);
    expect(sheet.rows[0]![0]).toBe("Gamma");
  });

  test("in-set (:) matches any of the values", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { code } = await run("filter", file, "-e", "country:US,FR", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.rows.length).toBe(3);
    expect(sheet.rows.every((r) => r[1] === "US" || r[1] === "FR")).toBe(true);
  });

  test("--in keeps rows matching reference file", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const ref = await t.file("allow.csv", "email\nacme@test.com\ndelta@test.com\n");
    const out = join(t.dir, "out.csv");

    const { code } = await run("filter", file, "--in", ref, "-c", "email", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.rows.length).toBe(2);
    expect(sheet.rows.map((r) => r[0])).toEqual(["Acme", "Delta"]);
  });

  test("--in --invert excludes rows matching reference file", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const ref = await t.file("block.csv", "email\nacme@test.com\ndelta@test.com\n");
    const out = join(t.dir, "out.csv");

    const { code } = await run("filter", file, "--in", ref, "-c", "email", "--invert", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.rows.length).toBe(2);
    expect(sheet.rows.map((r) => r[0])).toEqual(["Beta", "Gamma"]);
  });

  test("--invert with --expr inverts expression filter", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { code } = await run("filter", file, "-e", "country=US", "--invert", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.rows.length).toBe(2);
    expect(sheet.rows.every((r) => r[1] !== "US")).toBe(true);
  });

  test("errors when --in given without -c", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const ref = await t.file("ref.csv", "email\nfoo@bar.com\n");

    const { code, stderr } = await run("filter", file, "--in", ref);

    expect(code).not.toBe(0);
    expect(stderr).toContain("--columns");
  });
});
