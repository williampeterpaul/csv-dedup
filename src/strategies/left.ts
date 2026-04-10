import type { Strategy } from "../join";

export const left: Strategy = {
  name: "Left",
  filter: (order, hits) =>
    order.filter((k) => hits.get(k)!.has(0)),
};
