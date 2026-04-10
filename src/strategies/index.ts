import type { Strategy } from "../join";
import { outer } from "./outer";
import { inner } from "./inner";
import { left } from "./left";
import { exclude } from "./exclude";
import { unique } from "./unique";
import { overlap } from "./overlap";

export const strategies: Record<string, Strategy> = {
  outer, inner, left, exclude, unique, overlap,
};
export type { Strategy };
