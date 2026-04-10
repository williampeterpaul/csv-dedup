import { test, expect, describe } from "bun:test";
import { strategies } from "./strategies";

// 3 files, 4 keys:
//   A: in files 0, 1, 2 (all)
//   B: in files 0, 1
//   C: in file 0 only
//   D: in file 2 only
const order = ["A", "B", "C", "D"];
const hits = new Map<string, Set<number>>([
  ["A", new Set([0, 1, 2])],
  ["B", new Set([0, 1])],
  ["C", new Set([0])],
  ["D", new Set([2])],
]);
const count = 3;

describe("strategies", () => {
  test("outer returns all keys", () => {
    expect(strategies.outer!.filter(order, hits, count)).toEqual(["A", "B", "C", "D"]);
  });

  test("inner returns only keys in all files", () => {
    expect(strategies.inner!.filter(order, hits, count)).toEqual(["A"]);
  });

  test("left returns only keys in file 0", () => {
    expect(strategies.left!.filter(order, hits, count)).toEqual(["A", "B", "C"]);
  });

  test("exclude returns keys exclusively in file 0", () => {
    expect(strategies.exclude!.filter(order, hits, count)).toEqual(["C"]);
  });

  test("unique returns keys in exactly one file", () => {
    expect(strategies.unique!.filter(order, hits, count)).toEqual(["C", "D"]);
  });

  test("overlap returns keys in 2+ files", () => {
    expect(strategies.overlap!.filter(order, hits, count)).toEqual(["A", "B"]);
  });
});
