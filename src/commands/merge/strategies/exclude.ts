import type { Strategy } from "../../../types";

export const exclude: Strategy = {
  name: "Exclude",
  filter: (order, hits) =>
    order.filter((k) => hits.get(k)!.size === 1 && hits.get(k)!.has(0)),
};
