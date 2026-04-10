import { parseArgs } from "node:util";
import { resolve, basename, extname, dirname, join } from "node:path";
import help from "./help.json";

export interface JoinArgs {
  files: string[];
  keys: string[];
  cols: string[] | null;
  dest: string;
}

type Command = { cmd: "outer" | "inner"; args: JoinArgs };

function usage(cmd?: string) {
  if (!cmd) {
    const cmds = Object.entries(help.commands)
      .map(([name, c]) => `  ${name.padEnd(8)} ${c.about}`)
      .join("\n");
    console.log(`\n${help.name} — ${help.about}\n\nUsage:\n  ${help.name} <command> [options]\n\nCommands:\n${cmds}\n\nRun ${help.name} <command> --help for command-specific options.\n`);
    return;
  }

  const c = help.commands[cmd as keyof typeof help.commands];
  if (!c) return;

  const opts = c.options.map((o) => `  ${o.flag.padEnd(22)} ${o.about}`).join("\n");
  const exs = c.examples.map((e) => `  ${e}`).join("\n");
  console.log(`\n${help.name} ${cmd} — ${c.about}\n\nUsage:\n  ${c.usage}\n\nOptions:\n${opts}\n\nExamples:\n${exs}\n`);
}

export async function parse(): Promise<Command> {
  const argv = Bun.argv.slice(2);
  const cmd = argv[0];

  if (!cmd || cmd === "--help" || cmd === "-h") {
    usage();
    process.exit(0);
  }

  if (cmd === "outer") return { cmd: "outer", args: await parseJoin(cmd, argv.slice(1)) };
  if (cmd === "inner") return { cmd: "inner", args: await parseJoin(cmd, argv.slice(1)) };

  fail(`Unknown command: ${cmd}`);
}

async function parseJoin(cmd: string, argv: string[]): Promise<JoinArgs> {
  const { values: opts, positionals: pos } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      keys: { type: "string", short: "k" },
      columns: { type: "string", short: "c" },
      output: { type: "string", short: "o" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (opts.help || pos.length === 0) {
    usage(cmd);
    process.exit(0);
  }

  if (!opts.keys) fail("--keys is required");

  const files: string[] = [];
  for (const p of pos) {
    const abs = resolve(p);
    if (!(await Bun.file(abs).exists())) fail(`File not found: ${abs}`);
    files.push(abs);
  }

  const keys = opts.keys!.split(",").map((s) => s.trim()).filter(Boolean);
  if (keys.length === 0) fail("--keys must specify at least one column");

  const cols = opts.columns
    ? opts.columns.split(",").map((s) => s.trim()).filter(Boolean)
    : null;

  let dest: string;
  if (opts.output) {
    dest = resolve(opts.output);
  } else {
    const first = files[0]!;
    const ext = extname(first);
    dest = join(dirname(first), `${basename(first, ext)}.out${ext}`);
  }

  return { files, keys, cols, dest };
}

export function fail(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}
