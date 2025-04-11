import { useState, useEffect } from "react";
import {
  CheckIcon,
  Combobox,
  Group,
  Pill,
  PillsInput,
  useCombobox,
  Loader,
  Text,
  ScrollArea,
  Box,
  CloseButton,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";

type InputProps = {
  selectedBeers: { value: string; label: string; brewery: string }[];
  setSelectedBeers: (
    value: { value: string; label: string; brewery: string }[]
  ) => void;
};

export default function BeerMultiSelect({
  selectedBeers,
  setSelectedBeers,
}: InputProps) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [options, setOptions] = useState<
    { value: string; label: string; brewery: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  // Use the debounced search term
  const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 300);

  const fetchBeers = async (search: string) => {
    if (!search.trim()) {
      setOptions([]);
      return;
    }

    setLoading(true);

    try {
      const results = await fetch(`/api/beers?q=${search}`);
      const data = await results.json();

      setOptions(
        data.map((beer: any) => ({
          value: beer.id,
          label: beer.name,
          brewery: beer.brewery,
        }))
      );
    } catch (error) {
      console.error("Error fetching beers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debouncedSearchTerm) {
      fetchBeers(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  const handleValueSelect = (val: string) => {
    const selectedBeer = options.find((beer) => beer.value === val);

    const isBeerAlreadySelected = selectedBeers.some(
      (beer) => beer.value === val
    );

    if (isBeerAlreadySelected) {
      handleValueRemove(val);
    } else if (selectedBeer) {
      setSelectedBeers([...selectedBeers, selectedBeer]);
    }
  };

  const handleValueRemove = (val: string) => {
    setSelectedBeers(selectedBeers.filter((beer) => beer.value !== val));
  };

  const values = selectedBeers.map((beer) => (
    <Pill
      key={beer.value}
      withRemoveButton
      onRemove={() => handleValueRemove(beer.value)}
    >
      {beer.label}
    </Pill>
  ));

  const optionsList = options.map((option) => (
    <Combobox.Option
      key={option.value}
      value={option.value}
      active={selectedBeers.some((beer) => beer.value === option.value)}
    >
      <Group gap="sm">
        {selectedBeers.some((beer) => beer.value === option.value) && (
          <CheckIcon size={12} />
        )}
        <Box>
          <Text size="sm">{option.label}</Text>
          <Text size="xs" c="gray" mt="3">
            {option.brewery}
          </Text>
        </Box>
      </Group>
    </Combobox.Option>
  ));

  return (
    <>
      <Combobox
        store={combobox}
        onOptionSubmit={handleValueSelect}
        withinPortal={false}
      >
        <Combobox.DropdownTarget>
          <PillsInput onClick={() => combobox.openDropdown()}>
            <Combobox.EventsTarget>
              <PillsInput.Field
                onFocus={() => combobox.openDropdown()}
                onBlur={() => combobox.closeDropdown()}
                value={searchTerm}
                placeholder="Søg efter øl"
                onChange={(event) => {
                  combobox.updateSelectedOptionIndex();
                  setSearchTerm(event.currentTarget.value);
                }}
                w="100%"
              />
            </Combobox.EventsTarget>
            {loading && (
              <Loader
                size={16}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
            )}
            {!loading && searchTerm.length > 0 && optionsList.length > 0 && (
              <CloseButton
                size="sm"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  combobox.closeDropdown();
                  setSearchTerm("");
                  setOptions([]);
                }}
                pos="absolute"
                right={10}
              />
            )}
          </PillsInput>
        </Combobox.DropdownTarget>

        <Combobox.Dropdown>
          <Combobox.Options>
            <ScrollArea.Autosize mah={400} type="scroll">
              {optionsList.length > 0 ? (
                optionsList
              ) : (
                <Combobox.Empty>Ingen matchende øl fundet...</Combobox.Empty>
              )}
            </ScrollArea.Autosize>
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
      {values.length > 0 && (
        <>
          <Text size="sm" mt="md" c="dimmed">
            Valgte øl:
          </Text>
          <Pill.Group>{values}</Pill.Group>
        </>
      )}
    </>
  );
}
