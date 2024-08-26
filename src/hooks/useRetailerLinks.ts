import { useQuery } from "@tanstack/react-query";

import { BuildComponentStoreName } from "lib/build";
import { QueryKey } from "lib/constants";
import { RetailerProductLinkSchema } from "lib/db";
import * as Query from "lib/query";

export function useRetailerLinks<T extends BuildComponentStoreName>(
  componentType: T,
  componentId: number
): {
  retailerLinks: Array<RetailerProductLinkSchema>;
  isError: boolean;
  isFetching: boolean;
  isPending: boolean;
} {
  const {
    data: links,
    isError,
    isPending /* if there's no cached data and no query attempt was finished yet */,
    isFetching /* Is true whenever the queryFn is executing, which includes initial pending as well as background refetches */,
  } = useQuery({
    queryKey: [componentType, componentId, QueryKey.RETAILER_LINK],
    queryFn: async () => {
      const links = await Query.getComponentRetailerLinks({
        componentType,
        componentId,
      });

      return links;
    },
  });

  return {
    retailerLinks: links ?? [],
    isError,
    isFetching,
    isPending,
  };
}
