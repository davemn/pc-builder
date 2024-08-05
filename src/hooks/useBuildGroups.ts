import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ExtendedBuildGroupSchema } from "lib/build";
import { QueryKey } from "lib/constants";
import * as Query from "lib/query";

export function useBuildGroups() {
  const queryClient = useQueryClient();

  const { mutateAsync: addBuildGroup } = useMutation({
    mutationFn: Query.addBuildGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.BUILD_GROUP] });
    },
  });

  const {
    data: buildGroups,
    isLoading,
    isError,
  } = useQuery<Array<ExtendedBuildGroupSchema>>({
    queryKey: [QueryKey.BUILD_GROUP],
    queryFn: async () => {
      const buildGroups = await Query.getAllBuildGroups();

      const buildGroupsWithBuilds = [];

      for (const buildGroup of buildGroups) {
        const edges = await Query.getEdgesWhere({
          sourceId: buildGroup.id,
          sourceType: "buildGroup",
          targetType: "build",
        });

        if (!edges || edges.length === 0) {
          buildGroupsWithBuilds.push({ ...buildGroup, builds: [] });
          continue;
        }

        const builds = await Query.getBuildsWhere({
          id: edges.map((edge) => edge.targetId),
        });

        buildGroupsWithBuilds.push({ ...buildGroup, builds });
      }

      return buildGroupsWithBuilds;
    },
  });

  return {
    addBuildGroup,
    buildGroups,
    isLoading,
    isError,
  };
}
