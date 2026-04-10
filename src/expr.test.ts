import { test, expect, describe } from "bun:test";
import { compile } from "./expr";

const headers = ["name", "country", "email"];
const row = (name: string, country: string, email: string) => [name, country, email];

describe("compile", () => {
  test("exact match col=val", () => {
    const pred = compile("country=US", headers);
    expect(pred(row("Acme", "US", "a@b.com"))).toBe(true);
    expect(pred(row("Acme", "UK", "a@b.com"))).toBe(false);
  });

  test("not equal col!=val", () => {
    const pred = compile("country!=US", headers);
    expect(pred(row("Acme", "UK", "a@b.com"))).toBe(true);
    expect(pred(row("Acme", "US", "a@b.com"))).toBe(false);
  });

  test("empty check col=''", () => {
    const pred = compile("email=''", headers);
    expect(pred(row("Acme", "US", ""))).toBe(true);
    expect(pred(row("Acme", "US", "  "))).toBe(true);
    expect(pred(row("Acme", "US", "a@b.com"))).toBe(false);
  });

  test("non-empty check col!=''", () => {
    const pred = compile("email!=''", headers);
    expect(pred(row("Acme", "US", "a@b.com"))).toBe(true);
    expect(pred(row("Acme", "US", ""))).toBe(false);
  });

  test("contains col~sub (case-insensitive)", () => {
    const pred = compile("name~corp", headers);
    expect(pred(row("AcmeCorp", "US", ""))).toBe(true);
    expect(pred(row("BIGCORP", "US", ""))).toBe(true);
    expect(pred(row("Acme", "US", ""))).toBe(false);
  });

  test("in-set col:val1,val2", () => {
    const pred = compile("country:US,UK,DE", headers);
    expect(pred(row("Acme", "US", ""))).toBe(true);
    expect(pred(row("Acme", "DE", ""))).toBe(true);
    expect(pred(row("Acme", "FR", ""))).toBe(false);
  });

  test("AND conjunction", () => {
    const pred = compile("country=US AND email!=''", headers);
    expect(pred(row("Acme", "US", "a@b.com"))).toBe(true);
    expect(pred(row("Acme", "US", ""))).toBe(false);
    expect(pred(row("Acme", "UK", "a@b.com"))).toBe(false);
  });

  test("double-quoted values", () => {
    const pred = compile('country="US"', headers);
    expect(pred(row("Acme", "US", ""))).toBe(true);
  });
});
