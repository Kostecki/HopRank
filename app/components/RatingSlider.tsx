import { Box, Flex, Slider, Text } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { sliderConf } from "~/utils/utils";

type InputProps = {
  form: UseFormReturnType<any>;
  name: string;
  label?: string;
};

export default function RatingSlider({ form, name, label }: InputProps) {
  const { min, max, stepSize } = sliderConf;

  const marks = Array.from({ length: max / stepSize }, (_, i) => ({
    value: (i + 1) * stepSize,
  }));

  const value = form.values[name];

  return (
    <Box>
      <Flex justify="space-between" align="center" mb="xs">
        <Text size="sm">{label}</Text>
        <Text size="sm">{value.toFixed(2)}</Text>
      </Flex>

      <Slider
        min={min}
        max={max}
        step={stepSize}
        marks={marks}
        label={(value) => value.toFixed(2)}
        color="teal"
        {...form.getInputProps(name)}
      />
    </Box>
  );
}
