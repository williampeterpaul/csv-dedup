import { test, expect, describe, afterAll } from "bun:test";
import { join } from "node:path";
import { tmp, run } from "../../test/fixture";
import { read } from "../csv";

describe("norm", () => {
  let cleanup: () => Promise<void>;
  afterAll(async () => { if (cleanup) await cleanup(); });

  test("default: trims, lowercases, collapses spaces", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", `name,id\n  HELLO   WORLD  ,1\n`);
    const out = join(t.dir, "out.csv");

    const { stdout, code } = await run("norm", file, "-c", "name", "-o", out);

    expect(code).toBe(0);
    expect(stdout).toContain("Norm");
    const sheet = await read(out);
    expect(sheet.rows[0]![0]).toBe("hello world");
  });

  test("--domain strips http/www/trailing slash", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", `url,id\nhttps://www.example.com/,1\n`);
    const out = join(t.dir, "out.csv");

    const { code } = await run("norm", file, "-c", "url", "--domain", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.rows[0]![0]).toBe("example.com");
  });

  test("--ascii transliterates accents", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", `name,id\nCafé Résumé,1\n`);
    const out = join(t.dir, "out.csv");

    const { code } = await run("norm", file, "-c", "name", "--ascii", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.rows[0]![0]).toBe("cafe resume");
  });
});
