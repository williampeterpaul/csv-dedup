import type { Strategy } from "../join";

export const dedup: Strategy = {
  name: "Dedup",
  merge: false,
  filter: (order) => order,
};
