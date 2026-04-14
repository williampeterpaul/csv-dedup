import { test, expect, describe, afterAll } from "bun:test";
import { join } from "node:path";
import { tmp, run } from "../../../test/fixture";
import { read } from "../../csv";

const csvA = `domain,name,desc
example.com,Acme,Widget maker
test.org,Beta,Testing org
`;

const csvB = `domain,name,desc,country
example.com,Acme,Old desc,US
newco.io,Gamma,New company,UK
`;

const csvC = `domain,name,region
example.com,Acme,West
another.io,Delta,East
`;

describe("merge outer", () => {
  let cleanup: () => Promise<void>;
  afterAll(async () => { if (cleanup) await cleanup(); });

  test("unions all rows with first-wins values", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const a = await t.file("a.csv", csvA);
    const b = await t.file("b.csv", csvB);
    const out = join(t.dir, "out.csv");

    const { stdout, code } = await run("merge", a, b, "-k", "domain,name", "-o", out);

    expect(code).toBe(0);
    expect(stdout).toContain("Outer");
    expect(stdout).toContain("3 rows");

    const sheet = await read(out);
    expect(sheet.headers).toContain("country");
    expect(sheet.rows.length).toBe(3);
  });

  test("first-wins: source values preserved over later files", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const a = await t.file("a.csv", csvA);
    const b = await t.file("b.csv", csvB);
    const out = join(t.dir, "out.csv");

    await run("merge", a, b, "-k", "domain,name", "-o", out);

    const sheet = await read(out);
    const di = sheet.headers.indexOf("desc");
    const ni = sheet.headers.indexOf("name");
    const acme = sheet.rows.find((r) => r[ni] === "Acme");
    expect(acme![di]).toBe("Widget maker");
  });

  test("fills blanks from later files", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const a = await t.file("a.csv", csvA);
    const b = await t.file("b.csv", csvB);
    const out = join(t.dir, "out.csv");

    await run("merge", a, b, "-k", "domain,name", "-o", out);

    const sheet = await read(out);
    const ci = sheet.headers.indexOf("country");
    const ni = sheet.headers.indexOf("name");
    const acme = sheet.rows.find((r) => r[ni] === "Acme");
    expect(acme![ci]).toBe("US");
  });
});

describe("merge inner", () => {
  let cleanup: () => Promise<void>;
  afterAll(async () => { if (cleanup) await cleanup(); });

  test("keeps only shared keys", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const a = await t.file("a.csv", csvA);
    const b = await t.file("b.csv", csvB);
    const out = join(t.dir, "out.csv");

    const { stdout, code } = await run("merge", a, b, "-k", "domain,name", "-m", "inner", "-o", out);

    expect(code).toBe(0);
    expect(stdout).toContain("Inner");
    expect(stdout).toContain("1 rows");

    const sheet = await read(out);
    expect(sheet.rows.length).toBe(1);
    expect(sheet.rows[0]![sheet.headers.indexOf("domain")]).toBe("example.com");
  });

  test("3-file inner: only keys in all three files", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const a = await t.file("a.csv", csvA);
    const b = await t.file("b.csv", csvB);
    const c = await t.file("c.csv", csvC);
    const out = join(t.dir, "out.csv");

    const { code } = await run("merge", a, b, c, "-k", "domain,name", "-m", "inner", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.rows.length).toBe(1);
    expect(sheet.rows[0]![sheet.headers.indexOf("name")]).toBe("Acme");
  });
});

describe("merge left", () => {
  let cleanup: () => Promise<void>;
  afterAll(async () => { if (cleanup) await cleanup(); });

  test("keeps source rows enriched with data from other files", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const a = await t.file("a.csv", csvA);
    const b = await t.file("b.csv", csvB);
    const out = join(t.dir, "out.csv");

    const { stdout, code } = await run("merge", a, b, "-k", "domain,name", "-m", "left", "-o", out);

    expect(code).toBe(0);
    expect(stdout).toContain("Left");
    expect(stdout).toContain("2 rows");

    const sheet = await read(out);
    expect(sheet.rows.length).toBe(2);
    const domains = sheet.rows.map((r) => r[sheet.headers.indexOf("domain")]);
    expect(domains).toContain("example.com");
    expect(domains).toContain("test.org");
    expect(domains).not.toContain("newco.io");
  });
});

describe("merge exclude", () => {
  let cleanup: () => Promise<void>;
  afterAll(async () => { if (cleanup) await cleanup(); });

  test("keeps only source rows not in other files", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const a = await t.file("a.csv", csvA);
    const b = await t.file("b.csv", csvB);
    const out = join(t.dir, "out.csv");

    const { stdout, code } = await run("merge", a, b, "-k", "domain,name", "-m", "exclude", "-o", out);

    expect(code).toBe(0);
    expect(stdout).toContain("Exclude");
    expect(stdout).toContain("1 rows");

    const sheet = await read(out);
    expect(sheet.rows.length).toBe(1);
    expect(sheet.rows[0]![sheet.headers.indexOf("domain")]).toBe("test.org");
  });
});

describe("merge unique", () => {
  let cleanup: () => Promise<void>;
  afterAll(async () => { if (cleanup) await cleanup(); });

  test("keeps keys appearing in exactly one file", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const a = await t.file("a.csv", csvA);
    const b = await t.file("b.csv", csvB);
    const out = join(t.dir, "out.csv");

    const { stdout, code } = await run("merge", a, b, "-k", "domain,name", "-m", "unique", "-o", out);

    expect(code).toBe(0);
    expect(stdout).toContain("Unique");
    expect(stdout).toContain("2 rows");

    const sheet = await read(out);
    expect(sheet.rows.length).toBe(2);
    const domains = sheet.rows.map((r) => r[sheet.headers.indexOf("domain")]);
    expect(domains).toContain("test.org");
    expect(domains).toContain("newco.io");
  });
});

describe("merge overlap", () => {
  let cleanup: () => Promise<void>;
  afterAll(async () => { if (cleanup) await cleanup(); });

  test("keeps keys appearing in multiple files", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const a = await t.file("a.csv", csvA);
    const b = await t.file("b.csv", csvB);
    const out = join(t.dir, "out.csv");

    const { stdout, code } = await run("merge", a, b, "-k", "domain,name", "-m", "overlap", "-o", out);

    expect(code).toBe(0);
    expect(stdout).toContain("Overlap");
    expect(stdout).toContain("1 rows");

    const sheet = await read(out);
    expect(sheet.rows.length).toBe(1);
    expect(sheet.rows[0]![sheet.headers.indexOf("domain")]).toBe("example.com");
  });
});

describe("merge overlap --min", () => {
  let cleanup: () => Promise<void>;
  afterAll(async () => { if (cleanup) await cleanup(); });

  test("--min 3 keeps keys in at least 3 files", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const a = await t.file("a.csv", csvA);
    const b = await t.file("b.csv", csvB);
    const c = await t.file("c.csv", csvC);
    const out = join(t.dir, "out.csv");

    const { code } = await run("merge", a, b, c, "-k", "domain,name", "-m", "overlap", "--min", "3", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    // Only example.com/Acme appears in all 3 files
    expect(sheet.rows.length).toBe(1);
    expect(sheet.rows[0]![sheet.headers.indexOf("domain")]).toBe("example.com");
  });

  test("--min 2 is the default overlap behavior", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const a = await t.file("a.csv", csvA);
    const b = await t.file("b.csv", csvB);
    const c = await t.file("c.csv", csvC);
    const out = join(t.dir, "out.csv");

    const { code } = await run("merge", a, b, c, "-k", "domain,name", "-m", "overlap", "--min", "2", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    // example.com/Acme is in all 3, test.org/Beta not shared, newco.io/Gamma not shared, another.io/Delta not shared
    // Only Acme is in 2+ files
    expect(sheet.rows.length).toBe(1);
  });
});

describe("merge --columns", () => {
  let cleanup: () => Promise<void>;
  afterAll(async () => { if (cleanup) await cleanup(); });

  test("restricts output to specified columns", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const a = await t.file("a.csv", csvA);
    const b = await t.file("b.csv", csvB);
    const out = join(t.dir, "out.csv");

    const { code } = await run("merge", a, b, "-k", "domain,name", "-c", "domain,name", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.headers).toEqual(["domain", "name"]);
  });
});

describe("merge single file", () => {
  let cleanup: () => Promise<void>;
  afterAll(async () => { if (cleanup) await cleanup(); });

  test("passes through single file as dedup", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const duped = `domain,name
example.com,Acme
test.org,Beta
example.com,Acme
`;
    const a = await t.file("a.csv", duped);
    const out = join(t.dir, "out.csv");

    const { code } = await run("merge", a, "-k", "domain,name", "-o", out);

    expect(code).toBe(0);
    const sheet = await read(out);
    expect(sheet.rows.length).toBe(2);
  });
});

describe("merge 3 files", () => {
  let cleanup: () => Promise<void>;
  afterAll(async () => { if (cleanup) await cleanup(); });

  test("outer unions all rows across 3 files", async () => {
    const t = await tmp();
    cleanup = t.cleanup;
    const a = await t.file("a.csv", csvA);
    const b = await t.file("b.csv", csvB);
    const c = await t.file("c.csv", csvC);
    const out = join(t.dir, "out.csv");

    const { stdout, code } = await run("merge", a, b, c, "-k", "domain,name", "-o", out);

    expect(code).toBe(0);
    expect(stdout).toContain("4 rows");
    expect(stdout).toContain("3 file(s)");

    const sheet = await read(out);
    expect(sheet.rows.length).toBe(4);
    expect(sheet.headers).toContain("region");
  });
});
