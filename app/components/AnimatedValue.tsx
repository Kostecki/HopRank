import { Text, type TextProps } from "@mantine/core";
import "animate.css";

type InputProps = {
  value: unknown;
  children: React.ReactNode;
} & TextProps;

export default function AnimatedValue({ value, children }: InputProps) {
  const speed = "animate__fast";
  const animation = "animate__pulse";

  const key = value == null ? "" : String(value);

  return (
    <Text
      key={key} // remount on change -> animation plays
      className={`animate__animated ${animation} ${speed}`}
      ta="center"
    >
      {children}
    </Text>
  );
}
