import type { Cmd } from "../types";
import { merge } from "./merge";
import { stats } from "./stats";
import { filter } from "./filter";
import { split } from "./split";
import { format } from "./format";
import { cleave } from "./cleave";
import { pick } from "./pick";
import { append } from "./append";
import { join } from "./join";
import { sort } from "./sort";
import { repeat } from "./repeat";

export const commands: Record<string, Cmd> = {
  merge, stats, filter, split, format, cleave, pick, append, join, sort, repeat,
};
