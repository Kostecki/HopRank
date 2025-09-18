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

export type UntappdVenue = {
  recent_date: string;
  venue_id: number;
  venue_name: string;
  is_custom_venue: number;
  distance: number;
  primary_category: string;
  categories: {
    count: number;
    items: {
      category_key: string;
      category_name_en: string;
      category_name: string;
      category_id: string;
      is_primary: boolean;
    }[];
  };
  visit_count: number;
  venue_icon: {
    sm: string;
    md: string;
    lg: string;
  };
  location: {
    venue_address: string;
    venue_city: string;
    venue_state: string;
    venue_country: string;
    lat: number;
    lng: number;
  };
  contact: {
    twitter: string;
    venue_url: string;
  };
  foursquare: {
    foursquare_id: string;
    foursquare_url: string;
  };
  is_verified: boolean;
};

type VenueItem = {
  value: string;
  label: string;
};

type VenueGroup = {
  label: string;
  items: VenueItem[];
};

export type VenuesResponse = [VenueGroup, VenueGroup];

export type Checkin = {
  bid: string;
  rating: string;
  geolat: string;
  geolng: string;
  foursquare_id: string;
  shout: string;
  timezone: string;
  gmt_offset: string;
};
