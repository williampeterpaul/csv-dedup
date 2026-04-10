import type { Strategy } from "../join";
import { outer } from "./outer";
import { inner } from "./inner";
import { left } from "./left";
import { exclude } from "./exclude";
import { dedup } from "./dedup";
import { unique } from "./unique";
import { dupes } from "./dupes";

export const strategies: Record<string, Strategy> = {
  outer, inner, left, exclude, dedup, unique, dupes,
};
export type { Strategy };
