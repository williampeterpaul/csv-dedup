import { test, expect, describe, afterAll } from "bun:test";
import { join } from "node:path";
import { tmp, run } from "../../test/fixture";
import { read } from "../csv";

describe("cleave", () => {
  let cleanup: () => Promise<void>;
  afterAll(async () => { if (cleanup) await cleanup(); });

  test("splits column on delimiter", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", `email,name\njohn@example.com,John\n`);
    const out = join(t.dir, "out.csv");

    const { stdout, code } = await run("cleave", file, "-c", "email", "--on", "@", "--as", "user,domain", "-o", out);

    expect(code).toBe(0);
    expect(stdout).toContain("Cleave");
    const sheet = await read(out);
    expect(sheet.headers).toEqual(["user", "domain", "name"]);
    expect(sheet.rows[0]).toEqual(["john", "example.com", "John"]);
  });

  test("--keep preserves original column", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", `email,name\njohn@example.com,John\n`);
    const out = join(t.dir, "out.csv");

    const { code } = await run("cleave", file, "-c", "email", "--on", "@", "--as", "user,domain", "--keep", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.headers).toEqual(["email", "user", "domain", "name"]);
    expect(sheet.rows[0]).toEqual(["john@example.com", "john", "example.com", "John"]);
  });

  test("default column names when --as omitted", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", `email,name\njohn@example.com,John\n`);
    const out = join(t.dir, "out.csv");

    const { code } = await run("cleave", file, "-c", "email", "--on", "@", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.headers).toEqual(["email_1", "email_2", "name"]);
  });

  test("--last splits on last occurrence", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", `path,id\nsrc/utils/helpers.ts,1\n`);
    const out = join(t.dir, "out.csv");

    const { code } = await run("cleave", file, "-c", "path", "--on", "/", "--last", "--as", "dir,file", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.rows[0]).toEqual(["src/utils", "helpers.ts", "1"]);
  });

  test("delimiter not found puts full value in left", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", `val,id\nhello,1\nfoo@bar,2\n`);
    const out = join(t.dir, "out.csv");

    const { code } = await run("cleave", file, "-c", "val", "--on", "@", "--as", "l,r", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.rows[0]).toEqual(["hello", "", "1"]);
    expect(sheet.rows[1]).toEqual(["foo", "bar", "2"]);
  });
});
