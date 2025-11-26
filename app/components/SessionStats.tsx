import { Box, Card, SimpleGrid, Text } from "@mantine/core";

export default function SessionStats({ ...props }) {
  return (
    <Box {...props}>
      <Card shadow="xs" radius="md" mt="xl">
        <SimpleGrid cols={3}>
          <Card>
            <Text ta="center">Highest Rater (avg.)</Text>
          </Card>
          <Card>
            <Text ta="center">Average ABV.</Text>
          </Card>
          <Card>
            <Text ta="center">Most Popular Style (count? avg?)</Text>
          </Card>
          <Card>
            <Text ta="center">Lowest Rater (avg.)</Text>
          </Card>
          <Card>
            <Text ta="center">Average Rating (across session)</Text>
          </Card>
          <Card>
            <Text ta="center">Number of different styles</Text>
          </Card>
        </SimpleGrid>
      </Card>
    </Box>
  );
}
