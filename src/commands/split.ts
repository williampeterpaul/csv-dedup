import { parseArgs } from "node:util";
import { basename, extname, dirname, join } from "node:path";
import type { Cmd } from "../types";
import { usage, fail } from "../cli";
import { one, log } from "../util";
import { read, write } from "../csv";

export const split: Cmd = {
  name: "split",
  async run(argv) {
    const { values: opts, positionals: pos } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        rows: { type: "string", short: "n" },
        take: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
    });

    if (opts.help || pos.length === 0) {
      usage("split");
      process.exit(0);
    }

    if (!opts.rows) fail("--rows is required");
    const n = parseInt(opts.rows!, 10);
    if (isNaN(n) || n < 1) fail("--rows must be a positive integer");

    const file = await one(pos, "split");
    const { headers, rows } = await read(file);

    const ext = extname(file);
    const base = basename(file, ext);
    const dir = dirname(file);
    const chunks = Math.ceil(rows.length / n);
    const take = opts.take ? parseInt(opts.take, 10) : chunks;
    if (isNaN(take) || take < 1) fail("--take must be a positive integer");
    const limit = Math.min(take, chunks);
    const pad = String(chunks).length;

    const files: string[] = [];
    for (let i = 0; i < limit; i++) {
      const chunk = rows.slice(i * n, (i + 1) * n);
      const name = join(dir, `${base}_${String(i + 1).padStart(pad, "0")}${ext}`);
      await write(name, headers, chunk);
      files.push(name);
    }

    const written = files.reduce((s, _f, i) => s + rows.slice(i * n, (i + 1) * n).length, 0);
    log(
      `Split ${written} of ${rows.length} rows into ${limit} file(s) of up to ${n} rows`,
      limit < chunks && `Took first ${limit} of ${chunks} chunks`,
      ...files,
    );
  },
};
