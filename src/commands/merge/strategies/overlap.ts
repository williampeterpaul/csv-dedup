import type { Strategy } from "../../../types";

export const overlap: Strategy = {
  name: "Overlap",
  filter: (order, hits) =>
    order.filter((k) => hits.get(k)!.size > 1),
};
