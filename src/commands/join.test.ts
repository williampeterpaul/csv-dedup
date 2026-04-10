import { test, expect, describe, afterAll } from "bun:test";
import { join } from "node:path";
import { tmp, run } from "../../test/fixture";
import { read } from "../csv";

const csv = `first,last,city,state
John,Doe,Austin,TX
Jane,Smith,Denver,CO
`;

describe("join", () => {
  let cleanup: () => Promise<void>;
  afterAll(async () => { if (cleanup) await cleanup(); });

  test("concatenates columns with glue", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { stdout, code } = await run("join", file, "--from", "first,last", "--glue", " ", "--as", "full_name", "-o", out);

    expect(code).toBe(0);
    expect(stdout).toContain("Join");
    const sheet = await read(out);
    expect(sheet.headers).toContain("full_name");
    expect(sheet.rows[0]![4]).toBe("John Doe");
    expect(sheet.rows[1]![4]).toBe("Jane Smith");
  });

  test("--drop removes source columns", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { code } = await run("join", file, "--from", "first,last", "--glue", " ", "--as", "name", "--drop", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.headers).toEqual(["city", "state", "name"]);
    expect(sheet.rows[0]).toEqual(["Austin", "TX", "John Doe"]);
  });

  test("default glue is empty string", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { code } = await run("join", file, "--from", "city,state", "--as", "loc", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.rows[0]![4]).toBe("AustinTX");
  });
});
