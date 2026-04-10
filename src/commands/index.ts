import type { Cmd } from "../types";
import { merge } from "./merge";
import { stats } from "./stats";
import { filter } from "./filter";
import { split } from "./split";
import { format } from "./format";

export const commands: Record<string, Cmd> = {
  merge, stats, filter, split, format,
};
