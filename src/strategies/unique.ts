import type { Strategy } from "../join";

export const unique: Strategy = {
  name: "Unique",
  merge: false,
  filter: (order, hits) =>
    order.filter((k) => hits.get(k)!.size === 1),
};
