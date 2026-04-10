import type { Strategy } from "../join";

export const exclude: Strategy = {
  name: "Exclude",
  merge: false,
  filter: (order, hits) =>
    order.filter((k) => hits.get(k)!.size === 1 && hits.get(k)!.has(0)),
};
