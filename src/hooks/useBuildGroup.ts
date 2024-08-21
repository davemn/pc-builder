import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ExtendedBuildGroupSchema } from "lib/build";
import { QueryKey } from "lib/constants";
import * as Query from "lib/query";

export function useBuildGroupMutations(): {
  addBuildGroup: typeof Query.addBuildGroup;
  updateBuildGroup: typeof Query.updateBuildGroup;
} {
  const queryClient = useQueryClient();

  const { mutateAsync: addBuildGroup } = useMutation({
    mutationFn: Query.addBuildGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.BUILD_GROUP] });
    },
  });

  const { mutateAsync: updateBuildGroup } = useMutation({
    mutationFn: Query.updateBuildGroup,
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.BUILD_GROUP, id] });
    },
  });

  return {
    addBuildGroup,
    updateBuildGroup,
  };
}

/** Note: A buildGroup is the same as a device. */
export function useExtendedBuildGroup(buildGroupId: number | null | undefined) {
  const {
    data: buildGroup,
    isLoading,
    isError,
  } = useQuery<ExtendedBuildGroupSchema | null>({
    queryKey: [QueryKey.BUILD_GROUP, buildGroupId ?? -1],
    queryFn: async () => {
      if (buildGroupId === null || buildGroupId === undefined) {
        return null;
      }

      const [buildGroup] = await Query.getBuildGroupsWhere({
        id: buildGroupId,
      });

      const edges = await Query.getEdgesWhere({
        sourceId: buildGroup.id,
        sourceType: "buildGroup",
        targetType: "build",
      });

      if (!edges || edges.length === 0) {
        return {
          ...buildGroup,
          builds: [],
        };
      }

      const builds = await Query.getBuildsWhere({
        id: edges.map((edge) => edge.targetId),
      });

      return {
        ...buildGroup,
        builds,
      };
    },
  });

  return {
    buildGroup: buildGroup ?? null,
    isLoading,
    isError,
  };
}
