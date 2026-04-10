import { test, expect, describe, afterAll } from "bun:test";
import { tmp, run } from "../../test/fixture";

const csv = `name,country,email
Acme,US,acme@test.com
Beta,UK,
Gamma,US,gamma@test.com
`;

describe("stats", () => {
  let cleanup: () => Promise<void>;
  afterAll(async () => { if (cleanup) await cleanup(); });

  test("prints row count and column info", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);

    const { stdout, code } = await run("stats", file);

    expect(code).toBe(0);
    expect(stdout).toContain("3 rows");
    expect(stdout).toContain("3 columns");
    expect(stdout).toContain("name");
    expect(stdout).toContain("country");
    expect(stdout).toContain("email");
    expect(stdout).toContain("100.0%");
    expect(stdout).toContain("66.7%");
  });

  test("--expr filters rows before computing stats", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);

    const { stdout, code } = await run("stats", file, "-e", "country=US");

    expect(code).toBe(0);
    expect(stdout).toContain("2 rows");
    expect(stdout).toContain("Filtered: 2 of 3 rows");
    expect(stdout).toContain("100.0%");
  });
});
