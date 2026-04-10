import type { Strategy } from "../join";
import { outer } from "./outer";
import { inner } from "./inner";

export const strategies: Record<string, Strategy> = { outer, inner };
export type { Strategy };
