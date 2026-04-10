import { parseArgs } from "node:util";
import { resolve, basename, extname, dirname, join } from "node:path";
import { usage, fail } from "./cli";

export function dest(file: string, output?: string): string {
  if (output) return resolve(output);
  const ext = extname(file);
  return join(dirname(file), `${basename(file, ext)}.out${ext}`);
}

export async function one(argv: string[], cmd: string): Promise<string> {
  const { positionals: pos, values: opts } = parseArgs({
    args: argv,
    allowPositionals: true,
    strict: false,
    options: { help: { type: "boolean", short: "h" } },
  });

  if (opts.help || pos.length === 0) {
    usage(cmd);
    process.exit(0);
  }

  const abs = resolve(pos[0]!);
  if (!(await Bun.file(abs).exists())) fail(`File not found: ${abs}`);
  return abs;
}

export function log(title: string, ...lines: (string | false | null | undefined | 0)[]) {
  console.log(title);
  for (const line of lines)
    if (line) console.log(`  ${line}`);
}
