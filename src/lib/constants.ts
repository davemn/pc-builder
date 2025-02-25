export enum SortDirection {
  ASC = "asc",
  DESC = "desc",
}

/** @deprecated */
export const SortDirectionLabel = {
  [SortDirection.ASC]: "Low to High",
  [SortDirection.DESC]: "High to Low",
};

export const TextSortDirectionLabel = {
  [SortDirection.ASC]: "A to Z",
  [SortDirection.DESC]: "Z to A",
};

export const NumericSortDirectionLabel = {
  [SortDirection.ASC]: "Low to High",
  [SortDirection.DESC]: "High to Low",
};

export enum QueryKey {
  BUILD = "build",
  BUILD_GROUP = "build_group",
  RETAILER_LINK = "retailer_link",
  PRICE = "price",
}

// Intl locale regions
export enum Region {
  US = "us",
  CA = "ca",
  UK = "uk",
  AU = "au",
}

// TODO other popular retailers, including non-US retailers
export enum Retailer {
  AMAZON = "amazon",
  BESTBUY = "bestbuy",
  BHPHOTO = "bhphoto",
  NEWEGG = "newegg",
}
