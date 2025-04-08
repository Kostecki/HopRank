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

export const theme = createTheme({
  colors: {
    teal,
  },
});
