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

  test("greater than col>n", () => {
    const h = ["name", "score"];
    const pred = compile("score>50", h);
    expect(pred(["Acme", "75"])).toBe(true);
    expect(pred(["Acme", "50"])).toBe(false);
    expect(pred(["Acme", "25"])).toBe(false);
    expect(pred(["Acme", "abc"])).toBe(false);
  });

  test("greater than or equal col>=n", () => {
    const h = ["name", "score"];
    const pred = compile("score>=50", h);
    expect(pred(["Acme", "50"])).toBe(true);
    expect(pred(["Acme", "75"])).toBe(true);
    expect(pred(["Acme", "49"])).toBe(false);
  });

  test("less than col<n", () => {
    const h = ["name", "score"];
    const pred = compile("score<50", h);
    expect(pred(["Acme", "25"])).toBe(true);
    expect(pred(["Acme", "50"])).toBe(false);
    expect(pred(["Acme", "75"])).toBe(false);
  });

  test("less than or equal col<=n", () => {
    const h = ["name", "score"];
    const pred = compile("score<=50", h);
    expect(pred(["Acme", "50"])).toBe(true);
    expect(pred(["Acme", "25"])).toBe(true);
    expect(pred(["Acme", "51"])).toBe(false);
  });

  test("numeric comparison with decimals", () => {
    const h = ["name", "rate"];
    const pred = compile("rate>=3.5", h);
    expect(pred(["Acme", "3.5"])).toBe(true);
    expect(pred(["Acme", "4.2"])).toBe(true);
    expect(pred(["Acme", "3.4"])).toBe(false);
  });

  test("OR disjunction", () => {
    const pred = compile("country=US OR country=UK", headers);
    expect(pred(row("Acme", "US", ""))).toBe(true);
    expect(pred(row("Acme", "UK", ""))).toBe(true);
    expect(pred(row("Acme", "FR", ""))).toBe(false);
  });

  test("AND + OR with parentheses", () => {
    const h = ["name", "score", "revenue"];
    const pred = compile("(score>50 AND revenue>20) OR (score>10 AND revenue>40)", h);
    expect(pred(["A", "60", "25"])).toBe(true);
    expect(pred(["B", "15", "50"])).toBe(true);
    expect(pred(["C", "5", "10"])).toBe(false);
    expect(pred(["D", "30", "30"])).toBe(false);
  });

  test("OR without parentheses", () => {
    const pred = compile("country=US OR country=UK OR country=DE", headers);
    expect(pred(row("Acme", "DE", ""))).toBe(true);
    expect(pred(row("Acme", "FR", ""))).toBe(false);
  });
});
