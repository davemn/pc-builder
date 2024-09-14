import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BuildComponentStoreName } from "lib/build";
import { QueryKey } from "lib/constants";
import { RetailerProductLinkSchema } from "lib/db";
import * as Query from "lib/query";

export function useRetailerLinks<T extends BuildComponentStoreName>(
  componentType: T,
  componentId: number | null | undefined
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
    enabled: typeof componentId === "number",
    queryKey: [componentType, componentId, QueryKey.RETAILER_LINK],
    queryFn: async () => {
      if (typeof componentId !== "number") {
        return [];
      }

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

// Adds additional fields to the mutation that aren't required by the backend
// query itself, but are useful for invalidating the cache.
const updateRetailerLinkMutationFn = (body: {
  componentType: BuildComponentStoreName;
  componentId: number;
  id: number;
  changes: Partial<Omit<RetailerProductLinkSchema, "id">>;
}): Promise<void> => {
  return Query.updateRetailerLink(body);
};

export function useRetailerLinkMutations(): {
  updateRetailerLink: typeof updateRetailerLinkMutationFn;
} {
  const queryClient = useQueryClient();

  const { mutateAsync: updateRetailerLink } = useMutation({
    mutationFn: updateRetailerLinkMutationFn,
    onSuccess: (_, { componentType, componentId }) => {
      queryClient.invalidateQueries({
        queryKey: [componentType, componentId, QueryKey.RETAILER_LINK],
      });
    },
  });

  return {
    updateRetailerLink,
  };
}
