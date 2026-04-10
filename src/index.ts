#!/usr/bin/env bun
import { parse } from "./cli";
import { run } from "./join";
import { strategies } from "./strategies";

const { cmd, args } = await parse();
await run(args, strategies[cmd]!);
