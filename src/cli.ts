import help from "./help.json";

export function usage(cmd?: string) {
  if (!cmd) {
    const cmds = Object.entries(help.commands)
      .map(([name, c]) => `  ${name.padEnd(10)} ${c.about}`)
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

export function parse(): { cmd: string; argv: string[] } {
  const argv = Bun.argv.slice(2);
  const cmd = argv[0];

  if (!cmd || cmd === "--help" || cmd === "-h") {
    usage();
    process.exit(0);
  }

  if (!(cmd in help.commands)) fail(`Unknown command: ${cmd}`);

  return { cmd, argv: argv.slice(1) };
}

export function fail(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}
