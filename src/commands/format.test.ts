import { test, expect, describe, afterAll } from "bun:test";
import { join } from "node:path";
import { tmp, run } from "../../test/fixture";
import { read } from "../csv";

const csv = `name,value
hello world,abcdef
foo bar,xyz
`;

describe("format", () => {
  let cleanup: () => Promise<void>;
  afterAll(async () => { if (cleanup) await cleanup(); });

  test("--upper uppercases target columns", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { stdout, code } = await run("format", file, "-c", "name", "--upper", "-o", out);

    expect(code).toBe(0);
    expect(stdout).toContain("Format");
    const sheet = await read(out);
    expect(sheet.rows[0]![0]).toBe("HELLO WORLD");
    expect(sheet.rows[1]![0]).toBe("FOO BAR");
  });

  test("--title title-cases", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { code } = await run("format", file, "-c", "name", "--title", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.rows[0]![0]).toBe("Hello World");
  });

  test("--truncate caps at N chars", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);
    const out = join(t.dir, "out.csv");

    const { code } = await run("format", file, "-c", "value", "--truncate", "3", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.rows[0]![1]).toBe("abc");
    expect(sheet.rows[1]![1]).toBe("xyz");
  });
});
