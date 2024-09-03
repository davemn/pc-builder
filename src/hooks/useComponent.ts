import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BuildComponentStoreName } from "lib/build";
import { QueryKey } from "lib/constants";
import { Schema } from "lib/db";
import * as Query from "lib/query";

export function useComponent<T extends BuildComponentStoreName>(
  componentType: T,
  componentId: number | undefined
): {
  component: Schema<T> | null;
  isError: boolean;
  isFetching: boolean;
  isPending: boolean;
} {
  const {
    data: component,
    isError,
    isPending /* if there's no cached data and no query attempt was finished yet */,
    isFetching /* Is true whenever the queryFn is executing, which includes initial pending as well as background refetches */,
  } = useQuery({
    queryKey: [componentType, componentId],
    queryFn: async () => {
      if (componentId === undefined) {
        return null;
      }

      const [component] = await Query.getComponentsWhere(componentType, {
        id: componentId,
      });

      return component;
    },
  });

  return {
    component: component ?? null,
    isError,
    isFetching,
    isPending,
  };
}

export function useComponentMutations(): {
  createComponent: typeof Query.createComponent;
  updateComponent: typeof Query.updateComponent;
  addRetailerLinkToComponent: typeof Query.addRetailerLinkToComponent;
} {
  const queryClient = useQueryClient();

  const { mutateAsync: createComponent } = useMutation({
    mutationFn: Query.createComponent,
    onSuccess: (_, { componentType }) => {
      queryClient.invalidateQueries({ queryKey: [componentType] });
    },
  });

  const { mutateAsync: updateComponent } = useMutation({
    mutationFn: Query.updateComponent,
    onSuccess: (_, { componentType, id }) => {
      queryClient.invalidateQueries({ queryKey: [componentType, id] });
    },
  });

  const { mutateAsync: addRetailerLinkToComponent } = useMutation({
    mutationFn: Query.addRetailerLinkToComponent,
    onSuccess: (_, { componentType, componentId }) => {
      queryClient.invalidateQueries({
        queryKey: [componentType, componentId, QueryKey.RETAILER_LINK],
      });
    },
  });

  return {
    createComponent,
    updateComponent,
    addRetailerLinkToComponent,
  };
}
