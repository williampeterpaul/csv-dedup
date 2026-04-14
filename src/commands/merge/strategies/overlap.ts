import type { Strategy } from "../../../types";

export const overlap: Strategy = {
  name: "Overlap",
  filter: (order, hits, _count, min = 2) =>
    order.filter((k) => hits.get(k)!.size >= min),
};
