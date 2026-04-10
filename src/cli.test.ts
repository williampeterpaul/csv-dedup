import { test, expect, describe } from "bun:test";
import { run } from "../test/fixture";

describe("error paths", () => {
  test("unknown command exits non-zero", async () => {
    const { code, stderr } = await run("bogus");
    expect(code).toBe(1);
    expect(stderr).toContain("Unknown command");
  });

  test("merge without --keys exits non-zero", async () => {
    const { code, stderr } = await run("merge", "nonexistent.csv");
    expect(code).toBe(1);
    expect(stderr).toContain("--keys");
  });

  test("merge with missing file exits non-zero", async () => {
    const { code, stderr } = await run("merge", "/tmp/does-not-exist-12345.csv", "-k", "id");
    expect(code).toBe(1);
    expect(stderr).toContain("File not found");
  });

  test("filter without --expr exits non-zero", async () => {
    const { code, stderr } = await run("filter", "/tmp/does-not-exist-12345.csv", "-o", "/dev/null");
    expect(code).toBe(1);
  });

  test("--help exits zero", async () => {
    const { code, stdout } = await run("--help");
    expect(code).toBe(0);
    expect(stdout).toContain("csv-dedup");
    expect(stdout).toContain("Commands");
  });

  test("merge --help exits zero", async () => {
    const { code, stdout } = await run("merge", "--help");
    expect(code).toBe(0);
    expect(stdout).toContain("--keys");
    expect(stdout).toContain("--mode");
  });
});
