import type { Strategy } from "../join";

export const dupes: Strategy = {
  name: "Dupes",
  merge: false,
  filter: (order, hits) =>
    order.filter((k) => hits.get(k)!.size > 1),
};
