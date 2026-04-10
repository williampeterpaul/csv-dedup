import type { Strategy } from "../join";

export const outer: Strategy = {
  name: "Outer",
  filter: (order) => order,
};
