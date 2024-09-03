import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  BuildComponentMeta,
  BuildComponentStoreName,
  Compatibility,
  ExtendedBuildSchema,
  overallCompatibility,
} from "lib/build";
import * as Query from "lib/query";

function asyncFilter<T>(
  arr: Array<T>,
  asyncTestFn: (value: T, index: number, array: Array<T>) => Promise<boolean>
): Promise<Array<T>> {
  return Promise.all(arr.map(asyncTestFn)).then((testResults) =>
    arr.filter((_, i) => testResults[i])
  );
}

async function asyncReduce<T, U>(
  arr: Array<T>,
  asyncReducer: (
    acc: U,
    value: T,
    index: number,
    array: Array<T>
  ) => Promise<U>,
  initialValue: U
): Promise<U> {
  let acc = initialValue;

  for (let i = 0; i < arr.length; i++) {
    acc = await asyncReducer(acc, arr[i], i, arr);
  }

  return acc;
}

export function useComponentIds<T extends BuildComponentStoreName>(
  componentType: T,
  build: ExtendedBuildSchema | null,
  orderBy?: Query.QueryOrderBy
): {
  allComponentIds: Array<number>;
  buildCompatibleComponentIds: Array<number>;
  buildIncompatibleComponentIds: Array<number>;
  isError: boolean;
  isFetching: boolean;
  isPending: boolean;
} {
  const queryClient = useQueryClient();

  const {
    data,
    isError,
    isPending /* if there's no cached data and no query attempt was finished yet */,
    isFetching /* Is true whenever the queryFn is executing, which includes initial pending as well as background refetches */,
  } = useQuery({
    // Examples:
    // ["cpu", [{ columnName : "price", direction: "asc" }, { columnName: "name", direction: "desc" }]]
    queryKey: [componentType, ...(orderBy ? [orderBy] : [])],
    queryFn: async () => {
      const componentIds = await Query.getComponentIdsWhere(
        componentType,
        {},
        orderBy
      );

      const componentIdIsCompatible = async (id: number) => {
        const [component] = await Query.getComponentsWhere(componentType, {
          id,
        });

        // Preemptively cache the component for use in the useComponent() hook
        queryClient.setQueryData([componentType, id], component);

        return (
          overallCompatibility(
            build
              ? BuildComponentMeta[componentType].getCompatibilityChecks(
                  component,
                  build
                )
              : [{ compatibility: Compatibility.UNKNOWN }] // a missing build means we can't determine compatibility
          ) !== Compatibility.INCOMPATIBLE
        );
      };

      const compatibilityByComponentId = await asyncReduce(
        componentIds,
        async (acc, id) => {
          acc[id] = await componentIdIsCompatible(id);
          return acc;
        },
        {} as Record<number, boolean>
      );

      const queryReturnValue = {
        allComponentIds: componentIds,
        buildCompatibleComponentIds: [] as number[],
        buildIncompatibleComponentIds: [] as number[],
      };

      return componentIds.reduce((acc, id) => {
        if (compatibilityByComponentId[id]) {
          acc.buildCompatibleComponentIds.push(id);
        } else {
          acc.buildIncompatibleComponentIds.push(id);
        }
        return acc;
      }, queryReturnValue);
    },
  });

  return {
    allComponentIds: data?.allComponentIds ?? [],
    buildCompatibleComponentIds: data?.buildCompatibleComponentIds ?? [],
    buildIncompatibleComponentIds: data?.buildIncompatibleComponentIds ?? [],
    isError,
    isFetching,
    isPending,
  };
}
