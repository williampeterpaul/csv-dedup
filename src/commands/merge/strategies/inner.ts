import type { Strategy } from "../../../types";

export const inner: Strategy = {
  name: "Inner",
  filter: (order, hits, count) =>
    order.filter((k) => hits.get(k)!.size === count),
};
