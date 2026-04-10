import type { Strategy } from "../../../types";

export const outer: Strategy = {
  name: "Outer",
  filter: (order) => order,
};
