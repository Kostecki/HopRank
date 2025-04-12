import { Box, Flex, Slider, Text } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { sliderConf } from "~/utils/utils";

type InputProps = {
  form: UseFormReturnType<any>; // TODO: Type
  name: string;
  label?: string;
};

export default function RatingSlider({ form, name, label }: InputProps) {
  const { min, max, stepSize } = sliderConf;

  const marks = Array.from({ length: max / stepSize }, (_, i) => ({
    value: (i + 1) * stepSize,
  }));

  const value = form.values[name] as number;

  return (
    <Box>
      <Flex justify="space-between" align="center" mb="xs">
        <Text size="sm">{label}</Text>
        <Text size="sm">{value.toFixed(2).replace(".", ",")}</Text>
        {/* local toFixed */}
      </Flex>

      <Slider
        min={min}
        max={max}
        step={stepSize}
        marks={marks}
        label={(value) =>
          value.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        }
        color="teal"
        {...form.getInputProps(name)}
      />
    </Box>
  );
}
