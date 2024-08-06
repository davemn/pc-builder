import { useQuery } from "@tanstack/react-query";

import { BuildComponentStoreName } from "lib/build";
import { Schema } from "lib/db";
import * as Query from "lib/query";

export function useComponents<T extends BuildComponentStoreName>(
  componentType: T,
  orderBy?: Query.QueryOrderBy
): {
  components: Array<Schema<T>>;
  isError: boolean;
  isFetching: boolean;
  isPending: boolean;
} {
  const {
    data: components,
    isError,
    isPending /* if there's no cached data and no query attempt was finished yet */,
    isFetching /* Is true whenever the queryFn is executing, which includes initial pending as well as background refetches */,
  } = useQuery({
    queryKey: [componentType, ...(orderBy ? [orderBy] : [])],
    queryFn: async () => {
      const componentsOfType = await Query.getComponentsWhere(
        componentType,
        {},
        orderBy
      );

      return componentsOfType;
    },
  });

  return {
    components: components ?? [],
    isError,
    isFetching,
    isPending,
  };
}
