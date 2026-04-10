import { test, expect, describe, spyOn, afterEach } from "bun:test";
import { dest, log } from "./util";

describe("dest", () => {
  test("generates .out.csv from input path", () => {
    expect(dest("/tmp/foo.csv")).toBe("/tmp/foo.out.csv");
  });

  test("handles nested paths", () => {
    expect(dest("/a/b/c/data.csv")).toBe("/a/b/c/data.out.csv");
  });

  test("returns explicit output when provided", () => {
    expect(dest("/tmp/foo.csv", "/tmp/bar.csv")).toBe("/tmp/bar.csv");
  });
});

describe("log", () => {
  let spy: ReturnType<typeof spyOn>;

  afterEach(() => {
    spy?.mockRestore();
  });

  test("prints title and indented lines", () => {
    const lines: string[] = [];
    spy = spyOn(console, "log").mockImplementation((msg: string) => lines.push(msg));

    log("Title here", "Line 1", "Line 2");

    expect(lines).toEqual(["Title here", "  Line 1", "  Line 2"]);
  });

  test("skips falsy lines", () => {
    const lines: string[] = [];
    spy = spyOn(console, "log").mockImplementation((msg: string) => lines.push(msg));

    log("Title", false && "skip", "keep", null, undefined, 0);

    expect(lines).toEqual(["Title", "  keep"]);
  });
});
