import { useRef, useState } from "react";
import {
  MultiSelect,
  Loader,
  Avatar,
  Group,
  Text,
  Box,
  Divider,
} from "@mantine/core";
import type { BoxProps, ComboboxItem, MultiSelectProps } from "@mantine/core";

import type { UntappdFriend, UntappdFriendsResponse } from "~/types/untappd";

interface InputProps extends BoxProps {
  value: string[];
  onChange: (value: string[]) => void;
  untappdAccessToken: string;
  priorityUserIds: number[];
}

interface FriendSelectItem extends ComboboxItem {
  avatar: string;
}

const sortFriends = (
  friends: UntappdFriend[],
  priorityIds: number[]
): UntappdFriend[] => {
  const sortFn = (a: UntappdFriend, b: UntappdFriend) =>
    a.first_name.localeCompare(b.first_name, undefined, {
      sensitivity: "base",
    });

  const priority = friends
    .filter((f) => priorityIds.includes(f.uid))
    .sort(sortFn);
  const others = friends
    .filter((f) => !priorityIds.includes(f.uid))
    .sort(sortFn);
  return [...priority, ...others];
};

const filterFriends = (
  friends: UntappdFriend[],
  query: string
): UntappdFriend[] => {
  const lowerQuery = query.trim().toLowerCase();
  return !lowerQuery
    ? friends
    : friends.filter(
        (f) =>
          `${f.first_name} ${f.last_name}`.toLowerCase().includes(lowerQuery) ||
          f.user_name.toLowerCase().includes(lowerQuery)
      );
};

const fetchAllFriends = async (
  token: string,
  signal: AbortSignal
): Promise<UntappdFriend[]> => {
  const result: UntappdFriend[] = [];
  let next:
    | string
    | null = `https://api.untappd.com/v4/user/friends?access_token=${token}`;

  while (next) {
    const res = await fetch(next, { signal });
    if (!res.ok) throw new Error("Failed to fetch Untappd friends");
    const json = (await res.json()) as UntappdFriendsResponse;
    result.push(...json.response.items.map((i) => i.user));
    next = json.response.pagination?.next_url ?? null;
  }

  return result;
};

const renderOption: MultiSelectProps["renderOption"] = ({
  option,
  checked,
}) => {
  if (option.value === "__divider__") return <Divider opacity={0.5} w="100%" />;

  const item = option as FriendSelectItem;
  return (
    <Group gap="sm">
      <Avatar src={item.avatar} radius="xl" size="sm">
        {item.label.charAt(0)}
      </Avatar>
      <div>
        <Text size="sm" fw={checked ? 700 : 400}>
          {item.label}
        </Text>
        <Text size="xs" c="dimmed">
          @{item.value}
        </Text>
      </div>
    </Group>
  );
};

export default function FriendsSearch({
  value,
  onChange,
  untappdAccessToken,
  priorityUserIds,
  ...props
}: InputProps) {
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<UntappdFriend[]>([]);
  const [filtered, setFiltered] = useState<UntappdFriend[]>([]);

  const abortController = useRef<AbortController | null>(null);

  const loadFriends = async () => {
    setLoading(true);
    abortController.current?.abort();
    abortController.current = new AbortController();

    try {
      const all = await fetchAllFriends(
        untappdAccessToken,
        abortController.current.signal
      );
      const sorted = sortFriends(all, priorityUserIds);
      setFriends(sorted);
      setFiltered(sorted);
    } catch (e) {
      if ((e as any).name !== "AbortError") console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (q: string) => {
    if (friends.length === 0) {
      loadFriends();
    } else {
      setFiltered(filterFriends(friends, q));
    }
  };

  const groupedOptions: FriendSelectItem[] = [];
  const priority = filtered.filter((f) => priorityUserIds.includes(f.uid));
  const others = filtered.filter((f) => !priorityUserIds.includes(f.uid));

  if (priority.length > 0) {
    groupedOptions.push(
      ...priority.map((f) => ({
        value: f.uid.toString(),
        label: `${f.first_name} ${f.last_name}`.trim(),
        avatar: f.user_avatar,
      }))
    );
  }

  if (priority.length > 0 && others.length > 0) {
    groupedOptions.push({ value: "__divider__", label: "", avatar: "" });
  }

  if (others.length > 0) {
    groupedOptions.push(
      ...others.map((f) => ({
        value: f.uid.toString(),
        label: `${f.first_name} ${f.last_name}`.trim(),
        avatar: f.user_avatar,
      }))
    );
  }

  return (
    <Box {...props}>
      <MultiSelect
        placeholder={value.length ? "" : "Søg efter venner"}
        value={value}
        onChange={onChange}
        data={groupedOptions}
        searchable
        renderOption={renderOption}
        rightSection={loading && <Loader size={16} />}
        onSearchChange={handleSearch}
        onDropdownOpen={() => {
          if (friends.length === 0) loadFriends();
        }}
        clearable
      />
    </Box>
  );
}
