import { test, expect, describe, afterAll } from "bun:test";
import { tmp, run } from "../../test/fixture";
import { read } from "../csv";
import { join } from "node:path";

const csv = `id,name
1,alpha
2,beta
3,gamma
4,delta
`;

describe("split", () => {
  let cleanup: () => Promise<void>;
  afterAll(async () => { if (cleanup) await cleanup(); });

  test("splits into correct number of chunks", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);

    const { stdout, code } = await run("split", file, "-n", "2");

    expect(code).toBe(0);
    expect(stdout).toContain("2 file(s)");

    const sheet1 = await read(join(t.dir, "data_1.csv"));
    expect(sheet1.headers).toEqual(["id", "name"]);
    expect(sheet1.rows.length).toBe(2);
    expect(sheet1.rows[0]![1]).toBe("alpha");

    const sheet2 = await read(join(t.dir, "data_2.csv"));
    expect(sheet2.headers).toEqual(["id", "name"]);
    expect(sheet2.rows.length).toBe(2);
    expect(sheet2.rows[0]![1]).toBe("gamma");
  });

  test("--take limits to first N chunks", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const file = await t.file("data.csv", csv);

    const { stdout, code } = await run("split", file, "-n", "2", "--take", "1");

    expect(code).toBe(0);
    expect(stdout).toContain("1 file(s)");
    expect(stdout).toContain("Took first 1 of 2 chunks");

    const sheet1 = await read(join(t.dir, "data_1.csv"));
    expect(sheet1.rows.length).toBe(2);

    const f2 = Bun.file(join(t.dir, "data_2.csv"));
    expect(await f2.exists()).toBe(false);
  });
});
