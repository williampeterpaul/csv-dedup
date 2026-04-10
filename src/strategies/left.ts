import type { Strategy } from "../join";

export const left: Strategy = {
  name: "Left join",
  merge: true,
  filter: (order, hits) =>
    order.filter((k) => hits.get(k)!.has(0)),
};
