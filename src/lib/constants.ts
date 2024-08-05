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
}
