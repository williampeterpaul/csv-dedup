#!/usr/bin/env bun
import { parse } from "./cli";
import { commands } from "./commands";

const { cmd, argv } = parse();
await commands[cmd]!.run(argv);
