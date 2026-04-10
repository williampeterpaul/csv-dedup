import type { Strategy } from "../join";

export const outer: Strategy = {
  name: "Outer join",
  filter: (order) => order,
};
