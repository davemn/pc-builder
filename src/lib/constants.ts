export enum SortDirection {
  ASC = "asc",
  DESC = "desc",
}

export const SortDirectionLabel = {
  [SortDirection.ASC]: "Low to High",
  [SortDirection.DESC]: "High to Low",
};

export enum QueryKey {
  BUILD = "build",
  BUILD_GROUP = "build_group",
  RETAILER_LINK = "retailer_link",
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
