import { useState, useRef } from "react";
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

type InputProps = {
  value: string[];
  onChange: (value: string[]) => void;
  priorityUserIds?: number[];
} & BoxProps;

// Your Untappd API access token (secure properly in production!)
const UNTAPPD_ACCESS_TOKEN = "3D83C793AB3C1339383853D6711703FB03247B51";

// Types for Untappd
interface UntappdFriend {
  uid: number;
  user_name: string;
  location: string;
  bio: string;
  is_supporter: number;
  first_name: string;
  last_name: string;
  relationship: string;
  user_avatar: string;
}

interface UntappdFriendItem {
  user: UntappdFriend;
}

interface UntappdFriendsResponse {
  response: {
    items: UntappdFriendItem[];
    pagination: {
      next_url: string | null;
    };
  };
}

// Extend ComboboxItem with avatar
interface FriendSelectItem extends ComboboxItem {
  avatar: string;
}

function sortAndPrioritizeFriends(
  friends: UntappdFriend[],
  priorityUserIds?: number[]
): UntappdFriend[] {
  console.log("Sorting and prioritizing friends", priorityUserIds);

  if (!priorityUserIds || priorityUserIds.length === 0) {
    // No priority users, just sort everyone
    return [...friends].sort((a, b) =>
      a.first_name.localeCompare(b.first_name, undefined, {
        sensitivity: "base",
      })
    );
  }

  const priorityFriends = friends.filter((friend) =>
    priorityUserIds.includes(friend.uid)
  );
  const otherFriends = friends.filter(
    (friend) => !priorityUserIds.includes(friend.uid)
  );

  priorityFriends.sort((a, b) =>
    a.first_name.localeCompare(b.first_name, undefined, { sensitivity: "base" })
  );
  otherFriends.sort((a, b) =>
    a.first_name.localeCompare(b.first_name, undefined, { sensitivity: "base" })
  );

  return [...priorityFriends, ...otherFriends];
}

// Fetch all friends recursively
async function fetchAllFriends(signal: AbortSignal): Promise<UntappdFriend[]> {
  const allFriends: UntappdFriend[] = [];
  let nextUrl:
    | string
    | null = `https://api.untappd.com/v4/user/friends?access_token=${UNTAPPD_ACCESS_TOKEN}`;

  while (nextUrl) {
    const response = await fetch(nextUrl, { signal });

    if (!response.ok) {
      throw new Error("Failed to fetch friends");
    }

    const data = (await response.json()) as UntappdFriendsResponse;
    allFriends.push(...data.response.items.map((item) => item.user));

    nextUrl = data.response.pagination?.next_url || null;
  }

  return allFriends;
}

// Custom render for each option
const renderOption: MultiSelectProps["renderOption"] = ({
  option,
  checked,
}) => {
  if (option.value === "__divider__") {
    return <Divider opacity={0.5} w="100%" />;
  }

  return (
    <Group gap="sm">
      <Avatar src={(option as FriendSelectItem).avatar} radius="xl" size="sm">
        {option.label.charAt(0)}
      </Avatar>
      <div>
        <Text size="sm" fw={checked ? 700 : 400}>
          {option.label}
        </Text>
        <Text size="xs" c="dimmed">
          @{option.value}
        </Text>
      </div>
    </Group>
  );
};

export default function FriendsSearch({
  value,
  onChange,
  priorityUserIds,
  ...props
}: InputProps) {
  const [loading, setLoading] = useState(false);
  const [allFriends, setAllFriends] = useState<UntappdFriend[] | null>(null);
  const [priorityFriends, setPriorityFriends] = useState<UntappdFriend[]>([]);
  const [otherFriends, setOtherFriends] = useState<UntappdFriend[]>([]);

  const abortController = useRef<AbortController | null>(null);

  const fetchOptions = async (query: string) => {
    setLoading(true);

    if (allFriends === null) {
      abortController.current?.abort();
      abortController.current = new AbortController();

      try {
        const friends = await fetchAllFriends(abortController.current.signal);
        const sorted = sortAndPrioritizeFriends(friends, priorityUserIds);
        setAllFriends(sorted);
        filterFriends(query, sorted);
      } catch (error) {
        if ((error as any).name !== "AbortError") {
          console.error(error);
        }
      } finally {
        setLoading(false);
      }
    } else {
      filterFriends(query, allFriends);
      setLoading(false);
    }
  };

  const filterFriends = (query: string, friends: UntappdFriend[]) => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = normalizedQuery
      ? friends.filter(
          (friend) =>
            `${friend.first_name} ${friend.last_name}`
              .toLowerCase()
              .includes(normalizedQuery) ||
            friend.user_name.toLowerCase().includes(normalizedQuery)
        )
      : friends;

    if (!priorityUserIds || priorityUserIds.length === 0) {
      setPriorityFriends([]);
      setOtherFriends(filtered);
    } else {
      setPriorityFriends(
        filtered.filter((friend) => priorityUserIds.includes(friend.uid))
      );
      setOtherFriends(
        filtered.filter((friend) => !priorityUserIds.includes(friend.uid))
      );
    }
  };

  const multiSelectData: FriendSelectItem[] = [];
  if (priorityFriends.length > 0) {
    multiSelectData.push(
      ...priorityFriends.map((friend) => ({
        value: friend.uid.toString(),
        label: `${friend.first_name} ${friend.last_name}`.trim(),
        avatar: friend.user_avatar,
      }))
    );
  }
  if (priorityFriends.length > 0 && otherFriends.length > 0) {
    multiSelectData.push({
      value: "__divider__",
      label: "",
      avatar: "",
    });
  }
  if (otherFriends.length > 0) {
    multiSelectData.push(
      ...otherFriends.map((friend) => ({
        value: friend.uid.toString(),
        label: `${friend.first_name} ${friend.last_name}`.trim(),
        avatar: friend.user_avatar,
      }))
    );
  }

  return (
    <Box {...props}>
      <MultiSelect
        placeholder={value.length ? "" : "Søg efter venner"}
        data={multiSelectData}
        value={value}
        onChange={onChange}
        searchable
        renderOption={renderOption}
        rightSection={loading && <Loader size={16} />}
        onSearchChange={(query) => fetchOptions(query)}
        onDropdownOpen={() => {
          if (!allFriends) fetchOptions("");
        }}
        clearable
      />
    </Box>
  );
}
