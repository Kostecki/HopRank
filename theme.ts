import { createTheme, type MantineColorsTuple } from "@mantine/core";

const teal: MantineColorsTuple = [
  "#e3fdfb",
  "#d6f4f1",
  "#b3e4e0",
  "#8dd5cf",
  "#6dc7c0",
  "#58bfb7",
  "#4abbb2",
  "#38a59c",
  "#28938b",
  "#058078",
];

const slateIndigo: MantineColorsTuple = [
  "#e8eaf0",
  "#d1d4df",
  "#babfcf",
  "#a3a9bf",
  "#8c93ae",
  "#757d9e",
  "#484F65",
  "#3a3f55",
  "#2d3045",
  "#202135",
];

const gold: MantineColorsTuple = [
  "#ffd700",
  "#ffd700",
  "#ffd700",
  "#ffd700",
  "#ffd700",
  "#ffd700",
  "#ffd700",
  "#ffd700",
  "#ffd700",
  "#ffd700",
];

const silver: MantineColorsTuple = [
  "#c0c0c0",
  "#c0c0c0",
  "#c0c0c0",
  "#c0c0c0",
  "#c0c0c0",
  "#c0c0c0",
  "#c0c0c0",
  "#c0c0c0",
  "#c0c0c0",
  "#c0c0c0",
];

const bronze: MantineColorsTuple = [
  "#8c6239",
  "#8c6239",
  "#8c6239",
  "#8c6239",
  "#8c6239",
  "#8c6239",
  "#8c6239",
  "#8c6239",
  "#8c6239",
  "#8c6239",
];

export const theme = createTheme({
  colors: {
    teal,
    slateIndigo,
    bronze,
    silver,
    gold,
  },
});
