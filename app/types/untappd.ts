type AliasAlt = string[];
type SpellingAlt = string[];
type BreweryAlias = string[];

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
