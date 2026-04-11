import { test, expect, describe, afterAll } from "bun:test";
import { compile } from "./expr";
import { tmp } from "../test/fixture";

const headers = ["name", "country", "email"];
const row = (name: string, country: string, email: string) => [name, country, email];

describe("compile", () => {
  test("exact match col=val", async () => {
    const pred = await compile("country=US", headers);
    expect(pred(row("Acme", "US", "a@b.com"))).toBe(true);
    expect(pred(row("Acme", "UK", "a@b.com"))).toBe(false);
  });

  test("not equal col!=val", async () => {
    const pred = await compile("country!=US", headers);
    expect(pred(row("Acme", "UK", "a@b.com"))).toBe(true);
    expect(pred(row("Acme", "US", "a@b.com"))).toBe(false);
  });

  test("empty check col=''", async () => {
    const pred = await compile("email=''", headers);
    expect(pred(row("Acme", "US", ""))).toBe(true);
    expect(pred(row("Acme", "US", "  "))).toBe(true);
    expect(pred(row("Acme", "US", "a@b.com"))).toBe(false);
  });

  test("non-empty check col!=''", async () => {
    const pred = await compile("email!=''", headers);
    expect(pred(row("Acme", "US", "a@b.com"))).toBe(true);
    expect(pred(row("Acme", "US", ""))).toBe(false);
  });

  test("contains col~sub (case-insensitive)", async () => {
    const pred = await compile("name~corp", headers);
    expect(pred(row("AcmeCorp", "US", ""))).toBe(true);
    expect(pred(row("BIGCORP", "US", ""))).toBe(true);
    expect(pred(row("Acme", "US", ""))).toBe(false);
  });

  test("reverse contains col~~val (val contains col)", async () => {
    const pred = await compile("name~~Alice Bob Charlie", headers);
    expect(pred(row("Bob", "US", ""))).toBe(true);
    expect(pred(row("alice", "US", ""))).toBe(true);
    expect(pred(row("Dave", "US", ""))).toBe(false);
    expect(pred(row("", "US", ""))).toBe(false);
  });

  test("in-set col:val1,val2", async () => {
    const pred = await compile("country:US,UK,DE", headers);
    expect(pred(row("Acme", "US", ""))).toBe(true);
    expect(pred(row("Acme", "DE", ""))).toBe(true);
    expect(pred(row("Acme", "FR", ""))).toBe(false);
  });

  test("AND conjunction", async () => {
    const pred = await compile("country=US AND email!=''", headers);
    expect(pred(row("Acme", "US", "a@b.com"))).toBe(true);
    expect(pred(row("Acme", "US", ""))).toBe(false);
    expect(pred(row("Acme", "UK", "a@b.com"))).toBe(false);
  });

  test("double-quoted values", async () => {
    const pred = await compile('country="US"', headers);
    expect(pred(row("Acme", "US", ""))).toBe(true);
  });

  test("greater than col>n", async () => {
    const h = ["name", "score"];
    const pred = await compile("score>50", h);
    expect(pred(["Acme", "75"])).toBe(true);
    expect(pred(["Acme", "50"])).toBe(false);
    expect(pred(["Acme", "25"])).toBe(false);
    expect(pred(["Acme", "abc"])).toBe(false);
  });

  test("greater than or equal col>=n", async () => {
    const h = ["name", "score"];
    const pred = await compile("score>=50", h);
    expect(pred(["Acme", "50"])).toBe(true);
    expect(pred(["Acme", "75"])).toBe(true);
    expect(pred(["Acme", "49"])).toBe(false);
  });

  test("less than col<n", async () => {
    const h = ["name", "score"];
    const pred = await compile("score<50", h);
    expect(pred(["Acme", "25"])).toBe(true);
    expect(pred(["Acme", "50"])).toBe(false);
    expect(pred(["Acme", "75"])).toBe(false);
  });

  test("less than or equal col<=n", async () => {
    const h = ["name", "score"];
    const pred = await compile("score<=50", h);
    expect(pred(["Acme", "50"])).toBe(true);
    expect(pred(["Acme", "25"])).toBe(true);
    expect(pred(["Acme", "51"])).toBe(false);
  });

  test("not contains col!~sub", async () => {
    const pred = await compile("name!~corp", headers);
    expect(pred(row("Acme", "US", ""))).toBe(true);
    expect(pred(row("AcmeCorp", "US", ""))).toBe(false);
    expect(pred(row("BIGCORP", "US", ""))).toBe(false);
  });

  test("not reverse contains col!~~val", async () => {
    const pred = await compile("name!~~Alice Bob Charlie", headers);
    expect(pred(row("Dave", "US", ""))).toBe(true);
    expect(pred(row("", "US", ""))).toBe(true);
    expect(pred(row("Bob", "US", ""))).toBe(false);
    expect(pred(row("alice", "US", ""))).toBe(false);
  });

  test("not in set col!:val1,val2", async () => {
    const pred = await compile("country!:US,UK,DE", headers);
    expect(pred(row("Acme", "FR", ""))).toBe(true);
    expect(pred(row("Acme", "JP", ""))).toBe(true);
    expect(pred(row("Acme", "US", ""))).toBe(false);
    expect(pred(row("Acme", "DE", ""))).toBe(false);
  });

  test("regex match col~/pattern/", async () => {
    const pred = await compile("name~/^Acme/", headers);
    expect(pred(row("Acme", "US", ""))).toBe(true);
    expect(pred(row("AcmeCorp", "US", ""))).toBe(true);
    expect(pred(row("Big Acme", "US", ""))).toBe(false);
    expect(pred(row("acme", "US", ""))).toBe(false);
  });

  test("regex match case-insensitive col~/pattern/i", async () => {
    const pred = await compile("name~/^acme/i", headers);
    expect(pred(row("Acme", "US", ""))).toBe(true);
    expect(pred(row("ACME", "US", ""))).toBe(true);
    expect(pred(row("acmecorp", "US", ""))).toBe(true);
    expect(pred(row("Big", "US", ""))).toBe(false);
  });

  test("negated regex col!~/pattern/", async () => {
    const pred = await compile("name!~/^Acme/", headers);
    expect(pred(row("Big", "US", ""))).toBe(true);
    expect(pred(row("acme", "US", ""))).toBe(true);
    expect(pred(row("Acme", "US", ""))).toBe(false);
    expect(pred(row("AcmeCorp", "US", ""))).toBe(false);
  });

  test("regex email validation", async () => {
    const pred = await compile("email~/^[^@]+@[^@]+\\.[^@]+$/", headers);
    expect(pred(row("A", "US", "a@b.com"))).toBe(true);
    expect(pred(row("A", "US", "user@domain.co.uk"))).toBe(true);
    expect(pred(row("A", "US", "bad"))).toBe(false);
    expect(pred(row("A", "US", "@no-local.com"))).toBe(false);
    expect(pred(row("A", "US", ""))).toBe(false);
  });

  test("numeric comparison with decimals", async () => {
    const h = ["name", "rate"];
    const pred = await compile("rate>=3.5", h);
    expect(pred(["Acme", "3.5"])).toBe(true);
    expect(pred(["Acme", "4.2"])).toBe(true);
    expect(pred(["Acme", "3.4"])).toBe(false);
  });

  test("OR disjunction", async () => {
    const pred = await compile("country=US OR country=UK", headers);
    expect(pred(row("Acme", "US", ""))).toBe(true);
    expect(pred(row("Acme", "UK", ""))).toBe(true);
    expect(pred(row("Acme", "FR", ""))).toBe(false);
  });

  test("AND + OR with parentheses", async () => {
    const h = ["name", "score", "revenue"];
    const pred = await compile("(score>50 AND revenue>20) OR (score>10 AND revenue>40)", h);
    expect(pred(["A", "60", "25"])).toBe(true);
    expect(pred(["B", "15", "50"])).toBe(true);
    expect(pred(["C", "5", "10"])).toBe(false);
    expect(pred(["D", "30", "30"])).toBe(false);
  });

  test("OR without parentheses", async () => {
    const pred = await compile("country=US OR country=UK OR country=DE", headers);
    expect(pred(row("Acme", "DE", ""))).toBe(true);
    expect(pred(row("Acme", "FR", ""))).toBe(false);
  });

  test("double parens ((a AND b))", async () => {
    const pred = await compile("((country=US AND email!=''))", headers);
    expect(pred(row("Acme", "US", "a@b.com"))).toBe(true);
    expect(pred(row("Acme", "US", ""))).toBe(false);
    expect(pred(row("Acme", "UK", "a@b.com"))).toBe(false);
  });

  test("OR inside AND: (a OR b) AND c", async () => {
    const pred = await compile("(country=US OR country=UK) AND email!=''", headers);
    expect(pred(row("Acme", "US", "a@b.com"))).toBe(true);
    expect(pred(row("Acme", "UK", "a@b.com"))).toBe(true);
    expect(pred(row("Acme", "US", ""))).toBe(false);
    expect(pred(row("Acme", "FR", "a@b.com"))).toBe(false);
  });

  test("deeply nested: ((a AND b) OR c) AND d", async () => {
    const h = ["name", "score", "revenue", "country"];
    const pred = await compile("((score>50 AND revenue>20) OR country=US) AND name~corp", h);
    expect(pred(["AcmeCorp", "60", "25", "UK"])).toBe(true);
    expect(pred(["BigCorp", "10", "5", "US"])).toBe(true);
    expect(pred(["Acme", "60", "25", "UK"])).toBe(false);
    expect(pred(["Acme", "10", "5", "US"])).toBe(false);
    expect(pred(["AcmeCorp", "10", "5", "UK"])).toBe(false);
  });

  test("nested double-paren OR branches", async () => {
    const pred = await compile("((country=US AND name~corp)) OR ((country=UK AND email!=''))", headers);
    expect(pred(row("AcmeCorp", "US", ""))).toBe(true);
    expect(pred(row("Acme", "UK", "a@b.com"))).toBe(true);
    expect(pred(row("Acme", "US", ""))).toBe(false);
    expect(pred(row("Acme", "UK", ""))).toBe(false);
  });

  test("three-level nesting with mixed AND/OR", async () => {
    const h = ["name", "country", "email", "score"];
    // ((person match) AND (geo match)) OR high-score override
    // person = name has text AND email non-empty
    // geo    = US or (UK and score > 50)
    const pred = await compile(
      "((name!='' AND email!='') AND (country=US OR (country=UK AND score>50))) OR score>90",
      h,
    );
    expect(pred(["Acme", "US", "a@b.com", "10"])).toBe(true);
    expect(pred(["Acme", "UK", "a@b.com", "60"])).toBe(true);
    expect(pred(["", "FR", "", "95"])).toBe(true);
    expect(pred(["Acme", "UK", "a@b.com", "30"])).toBe(false);
    expect(pred(["", "US", "", "10"])).toBe(false);
    expect(pred(["Acme", "FR", "a@b.com", "50"])).toBe(false);
  });
});

describe("@file", () => {
  let cleanup: () => Promise<void>;
  afterAll(async () => { if (cleanup) await cleanup(); });

  test("col:@file.csv loads first column as set", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const ref = await t.file("countries.csv", "code\nUS\nUK\nDE\n");

    const pred = await compile(`country:@${ref}`, headers);
    expect(pred(row("Acme", "US", ""))).toBe(true);
    expect(pred(row("Acme", "DE", ""))).toBe(true);
    expect(pred(row("Acme", "FR", ""))).toBe(false);
  });

  test("col:@file.txt loads lines as set", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const ref = await t.file("countries.txt", "US\nUK\nDE\n");

    const pred = await compile(`country:@${ref}`, headers);
    expect(pred(row("Acme", "US", ""))).toBe(true);
    expect(pred(row("Acme", "DE", ""))).toBe(true);
    expect(pred(row("Acme", "FR", ""))).toBe(false);
  });

  test("col~~@file.csv loads raw text as haystack", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const ref = await t.file("data.csv", "email\nacme@test.com\ngamma@test.com\n");

    const pred = await compile(`email~~@${ref}`, headers);
    expect(pred(row("Acme", "US", "acme@test.com"))).toBe(true);
    expect(pred(row("Acme", "US", "acme"))).toBe(true);
    expect(pred(row("Acme", "US", "email"))).toBe(true);
    expect(pred(row("Beta", "UK", "beta@test.com"))).toBe(false);
    expect(pred(row("Delta", "FR", ""))).toBe(false);
  });

  test("col~~@file.txt loads file as haystack", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const ref = await t.file("emails.txt", "acme@test.com\ngamma@test.com\n");

    const pred = await compile(`email~~@${ref}`, headers);
    expect(pred(row("Acme", "US", "acme@test.com"))).toBe(true);
    expect(pred(row("Gamma", "US", "gamma@test.com"))).toBe(true);
    expect(pred(row("Beta", "UK", "beta@test.com"))).toBe(false);
    expect(pred(row("Delta", "FR", ""))).toBe(false);
  });

  test("col!:@file.csv negates set from csv", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const ref = await t.file("countries.csv", "code\nUS\nUK\nDE\n");

    const pred = await compile(`country!:@${ref}`, headers);
    expect(pred(row("Acme", "FR", ""))).toBe(true);
    expect(pred(row("Acme", "JP", ""))).toBe(true);
    expect(pred(row("Acme", "US", ""))).toBe(false);
    expect(pred(row("Acme", "DE", ""))).toBe(false);
  });

  test("col!:@file.txt negates set from txt", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const ref = await t.file("countries.txt", "US\nUK\nDE\n");

    const pred = await compile(`country!:@${ref}`, headers);
    expect(pred(row("Acme", "FR", ""))).toBe(true);
    expect(pred(row("Acme", "US", ""))).toBe(false);
  });

  test("col!~~@file.csv negates haystack from csv", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const ref = await t.file("data.csv", "email\nacme@test.com\ngamma@test.com\n");

    const pred = await compile(`email!~~@${ref}`, headers);
    expect(pred(row("Beta", "UK", "beta@test.com"))).toBe(true);
    expect(pred(row("Delta", "FR", ""))).toBe(true);
    expect(pred(row("Acme", "US", "acme@test.com"))).toBe(false);
    expect(pred(row("Acme", "US", "acme"))).toBe(false);
  });

  test("col!~~@file.txt negates haystack from txt", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const ref = await t.file("emails.txt", "acme@test.com\ngamma@test.com\n");

    const pred = await compile(`email!~~@${ref}`, headers);
    expect(pred(row("Beta", "UK", "beta@test.com"))).toBe(true);
    expect(pred(row("Delta", "FR", ""))).toBe(true);
    expect(pred(row("Acme", "US", "acme@test.com"))).toBe(false);
    expect(pred(row("Gamma", "US", "gamma@test.com"))).toBe(false);
  });

  test("@file not found exits with error", async () => {
    expect(compile("country:@/tmp/does-not-exist.csv", headers)).rejects.toThrow();
  });

  test("col:@file.csv handles quoted values and trailing commas", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const ref = await t.file("domains.csv", 'domain,\n"0-mail.com",\n"example.com",\n');

    const h = ["name", "domain"];
    const pred = await compile(`domain:@${ref}`, h);
    expect(pred(["Acme", "0-mail.com"])).toBe(true);
    expect(pred(["Beta", "example.com"])).toBe(true);
    expect(pred(["Gamma", "other.com"])).toBe(false);
  });

  test("@file works with AND/OR expressions", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const ref = await t.file("countries.txt", "US\nUK\n");

    const pred = await compile(`country:@${ref} AND email!=''`, headers);
    expect(pred(row("Acme", "US", "a@b.com"))).toBe(true);
    expect(pred(row("Acme", "US", ""))).toBe(false);
    expect(pred(row("Acme", "FR", "a@b.com"))).toBe(false);
  });
});
