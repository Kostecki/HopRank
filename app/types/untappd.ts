type AliasAlt = string[];
type SpellingAlt = string[];
type BreweryAlias = string[];

export interface UntappdStrategyOptions {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
}

export interface UntappdStrategyProfile {
  untappdId: number;
  email: string;
  userName: string;
  firstName: string;
  lastName: string;
  avatar: string;
}

export type UntappdStrategyVerifyParams = {
  accessToken: string;
  refreshToken: string | undefined;
  extraParams: Record<string, unknown>;
  profile: UntappdStrategyProfile;
  request: Request;
};

export type AlgoliaBeerHit = {
  bid: number;
  beer_abv: number;
  beer_name: string;
  beer_index: string;
  brewery_label: string;
  brewery_name: string;
  brewery_id: number;
  type_name: string;
  type_id: number;
  homebrew: number;
  in_production: number;
  popularity: number;
  alias_alt: AliasAlt;
  spelling_alt: SpellingAlt;
  brewery_alias: BreweryAlias;
  beer_label: string;
  beer_label_hd: string;
  beer_index_short: string;
  beer_name_sort: string;
  brewery_name_sort: string;
  rating_score: number;
  rating_count: number;
  brewery_beer_name: string;
  index_date: number;
  objectID: number;
};

export type AlgoliaBeerResponse = {
  hits: AlgoliaBeerHit[];
};

export type ScrapedBeer = {
  id: number;
  name: string;
  brewery: {
    name: string;
    link?: string;
  };
  style: string;
  label?: string;
  abv: number;
  description: string;
  checkins: {
    total: number;
    unique: number;
  };
  rating: {
    value: number;
    count: number;
  };
};

export type UntappdFriend = {
  uid: number;
  user_name: string;
  location: string;
  bio: string;
  is_supporter: number;
  first_name: string;
  last_name: string;
  relationship: string;
  user_avatar: string;
};

export type UntappdFriendsResponse = {
  response: {
    items: { user: UntappdFriend }[];
    pagination: {
      next_url: string | null;
    };
  };
};
