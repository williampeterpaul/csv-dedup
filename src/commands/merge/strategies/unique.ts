import type { Strategy } from "../../../types";

export const unique: Strategy = {
  name: "Unique",
  filter: (order, hits) =>
    order.filter((k) => hits.get(k)!.size === 1),
};
