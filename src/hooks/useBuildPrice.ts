import { useQuery } from "@tanstack/react-query";

import { BuildComponentStoreName } from "lib/build";
import { QueryKey } from "lib/constants";
import * as Query from "lib/query";

export function useBuildPrice(
  buildId: number | null | undefined,
  componentType?: BuildComponentStoreName
): {
  price: number | null;
  isError: boolean;
  isFetching: boolean;
  isPending: boolean;
} {
  const {
    data: price,
    isError,
    isFetching,
    isPending,
  } = useQuery<number | null>({
    // dependent query, only run when we're given an actual ID
    enabled: typeof buildId === "number",
    queryKey: [
      QueryKey.BUILD,
      buildId,
      QueryKey.PRICE,
      ...(componentType ? [componentType] : []),
    ],
    queryFn: async () => {
      if (typeof buildId !== "number") {
        return null;
      }

      const price = await Query.getBuildPrice({
        buildId,
        componentType,
      });

      return price;
    },
  });

  return {
    price: price ?? null,
    isError,
    isFetching,
    isPending,
  };
}
