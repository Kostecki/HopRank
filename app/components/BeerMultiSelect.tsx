import { useState, useEffect } from "react";
import { useRef } from "react";
import { useFetcher } from "react-router";
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

import type { BeerOption } from "~/types/misc";

type InputProps = {
  selectedBeers: BeerOption[];
  setSelectedBeers: (value: BeerOption[]) => void;
};

const getSelectedPills = (
  selectedBeers: BeerOption[],
  onRemove: (val: string) => void
) => {
  return selectedBeers.map((beer) => (
    <Pill
      key={beer.beerId}
      withRemoveButton
      onRemove={() => onRemove(beer.beerId)}
    >
      {beer.name}
    </Pill>
  ));
};

const getComboboxOptions = (
  options: BeerOption[],
  selectedBeers: BeerOption[]
) => {
  return options.map((option) => {
    const isSelected = selectedBeers.some((b) => b.beerId === option.beerId);

    return (
      <Combobox.Option
        key={option.beerId}
        value={option.beerId}
        active={isSelected}
      >
        <Group gap="sm">
          {isSelected && <CheckIcon size={12} />}
          <Box>
            <Text size="sm">{option.name}</Text>
            <Text size="xs" c="gray" mt="3">
              {option.breweryName}
            </Text>
          </Box>
        </Group>
      </Combobox.Option>
    );
  });
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
  const inputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher<BeerOption[]>();

  const handleValueSelect = (val: string) => {
    const selectedBeer = options.find((beer) => beer.beerId === val);
    const isBeerAlreadySelected = selectedBeers.some(
      (beer) => beer.beerId === val
    );

    if (isBeerAlreadySelected) {
      handleValueRemove(val);
    } else if (selectedBeer) {
      setSelectedBeers([...selectedBeers, selectedBeer]);
    }

    setSearchTerm("");
    combobox.closeDropdown();
    inputRef.current?.blur();
  };

  const handleValueRemove = (val: string) => {
    setSelectedBeers(selectedBeers.filter((beer) => beer.beerId !== val));
  };

  // Use the debounced search term
  const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 500);

  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      fetcher.load(`/api/beers?q=${debouncedSearchTerm}`);
    }
  }, [debouncedSearchTerm]);

  const options = fetcher.data || [];
  const isLoading = fetcher.state === "loading";

  const values = getSelectedPills(selectedBeers, handleValueRemove);
  const optionsList = getComboboxOptions(options, selectedBeers);

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
                ref={inputRef}
              />
            </Combobox.EventsTarget>
            {isLoading && (
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
            {!isLoading && searchTerm.length > 0 && optionsList.length > 0 && (
              <CloseButton
                size="sm"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  combobox.closeDropdown();
                  setSearchTerm("");
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
              {searchTerm.trim() === "" ? (
                <Combobox.Empty>
                  Start med at skrive for at søge efter øl
                </Combobox.Empty>
              ) : options.length === 0 ? (
                <Combobox.Empty>Ingen matchende øl fundet</Combobox.Empty>
              ) : (
                optionsList
              )}
            </ScrollArea.Autosize>
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
      {values.length > 0 && (
        <Box mb="sm">
          <Text size="sm" c="dimmed" mb={8}>
            Valgte øl:
          </Text>
          <Pill.Group>{values}</Pill.Group>
        </Box>
      )}
    </>
  );
}
