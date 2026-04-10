import { test, expect, describe, afterAll } from "bun:test";
import { cols, read, write } from "./csv";
import { tmp } from "../test/fixture";

describe("cols", () => {
  test("resolves named columns to indices", () => {
    const result = cols("b,c", ["a", "b", "c"]);
    expect(result.names).toEqual(["b", "c"]);
    expect(result.idxs).toEqual([1, 2]);
  });

  test("defaults to all headers when undefined", () => {
    const result = cols(undefined, ["x", "y"]);
    expect(result.names).toEqual(["x", "y"]);
    expect(result.idxs).toEqual([0, 1]);
  });

  test("trims whitespace in column names", () => {
    const result = cols(" a , b ", ["a", "b"]);
    expect(result.names).toEqual(["a", "b"]);
    expect(result.idxs).toEqual([0, 1]);
  });
});

describe("read/write round-trip", () => {
  let cleanup: () => Promise<void>;

  afterAll(async () => {
    if (cleanup) await cleanup();
  });

  test("writes and reads back identical data", async () => {
    const t = await tmp();
    cleanup = t.cleanup;

    const path = await t.file("test.csv", "");
    const headers = ["id", "name", "value"];
    const rows = [
      ["1", "alpha", "100"],
      ["2", "beta", "200"],
    ];

    await write(path, headers, rows);
    const sheet = await read(path);

    expect(sheet.headers).toEqual(headers);
    expect(sheet.rows).toEqual(rows);
  });
});
