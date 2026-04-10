import type { Strategy } from "../../../types";
import { outer } from "./outer";
import { inner } from "./inner";
import { left } from "./left";
import { exclude } from "./exclude";
import { unique } from "./unique";
import { overlap } from "./overlap";

export const strategies: Record<string, Strategy> = {
  outer, inner, left, exclude, unique, overlap,
};
