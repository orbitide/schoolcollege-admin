// Categorical chart colours, in the fixed order series take them, each
// stepped separately for the light and the dark surface (validated for
// colour-blind separation as a set; don't reorder or cycle them). Pass one
// as a ChartConfig entry's `theme`.
export const seriesColors = [
  { light: "#2a78d6", dark: "#3987e5" }, // blue
  { light: "#eb6834", dark: "#d95926" }, // orange
  { light: "#1baf7a", dark: "#199e70" }, // aqua
] as const
