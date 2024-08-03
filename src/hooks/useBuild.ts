import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  BuildComponentEdgeSchema,
  BuildComponentStoreName,
  ExtendedBuildComponentSchema,
  ExtendedBuildSchema,
  edgeIsBuildComponentType,
} from "lib/build";
import { BuildSchema } from "lib/db";
import * as Query from "lib/query";

async function resolveEdgesOfType<T extends BuildComponentStoreName>(
  componentType: T,
  edges: Array<BuildComponentEdgeSchema>
): Promise<Array<ExtendedBuildComponentSchema<T>>> {
  const edgesOfType = edges.filter(edgeIsBuildComponentType(componentType));

  // De-dupe edge target IDs, the same component can be assigned to a build multiple times
  const uniqueEdgeTargetIds = Array.from(
    new Set(edgesOfType.map((edge) => edge.targetId))
  );

  const componentsOfType = await Query.getComponentsWhere(componentType, {
    id: uniqueEdgeTargetIds,
  });

  return edgesOfType.flatMap<ExtendedBuildComponentSchema<T>>((edge) => {
    const component = componentsOfType.find(
      (component) => component.id === edge.targetId
    );

    if (!component) {
      // skip any dangling edges pointing to components that have been deleted
      return [];
    }

    return [
      {
        edgeId: edge.id,
        ...component,
      },
    ];
  });
}

/**
 * Allows query cache invalidation for each assigned component type separately
 * from the rest of a build.
 */
export function useAssignedComponents<T extends BuildComponentStoreName>(
  buildId: number | null | undefined,
  componentType: T
): {
  components: Array<ExtendedBuildComponentSchema<T>>;
  isLoading: boolean;
  isError: boolean;
} {
  const {
    data: components,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["build", buildId ?? -1, componentType],
    queryFn: async () => {
      if (buildId === null || buildId === undefined) {
        return [];
      }

      const edges = (await Query.getEdgesWhere({
        sourceId: buildId,
        sourceType: "build",
      })) as BuildComponentEdgeSchema[];

      return resolveEdgesOfType(componentType, edges);
    },
  });

  return { components: components ?? [], isLoading, isError };
}

export function useBuildMutations(): {
  deleteBuild: (buildId: number) => Promise<void>;
} {
  const queryClient = useQueryClient();

  const { mutateAsync: deleteBuild } = useMutation({
    mutationFn: Query.deleteBuild,
    onSuccess: (_, buildId, context) => {
      queryClient.removeQueries({ queryKey: ["build", buildId] });
      // Need to refetch build groups since the deleted build was removed from one
      queryClient.invalidateQueries({ queryKey: ["buildGroups"] });
    },
  });

  return {
    deleteBuild,
  };
}

export function useBuild(buildId: number | null | undefined): {
  build: BuildSchema | null;
  deleteBuild: () => Promise<void>;
  isLoading: boolean;
  isError: boolean;
} {
  const {
    data: build,
    isLoading,
    isError,
  } = useQuery<BuildSchema | null>({
    queryKey: ["build", buildId ?? -1],
    queryFn: async () => {
      if (buildId === null || buildId === undefined) {
        return null;
      }

      const [build] = await Query.getBuildsWhere({
        id: buildId,
      });

      if (!build) {
        return null;
      }

      return build;
    },
  });

  const { deleteBuild } = useBuildMutations();

  return {
    build: build ?? null,
    deleteBuild: () => deleteBuild(buildId ?? -1),
    isLoading,
    isError,
  };
}

export function useExtendedBuild(buildId: number | null | undefined): {
  build: ExtendedBuildSchema | null;
  deleteBuild: () => Promise<void>;
  isLoading: boolean;
  isError: boolean;
} {
  const { build, deleteBuild } = useBuild(buildId);

  const {
    components: cpu,
    isLoading: cpuIsLoading,
    isError: cpuIsError,
  } = useAssignedComponents(buildId, "cpu");

  const {
    components: gpu,
    isLoading: gpuIsLoading,
    isError: gpuIsError,
  } = useAssignedComponents(buildId, "gpu");

  const {
    components: ram,
    isLoading: ramIsLoading,
    isError: ramIsError,
  } = useAssignedComponents(buildId, "ram");

  const {
    components: m2Storage,
    isLoading: m2StorageIsLoading,
    isError: m2StorageIsError,
  } = useAssignedComponents(buildId, "m2Storage");

  const {
    components: sataStorage,
    isLoading: sataStorageIsLoading,
    isError: sataStorageIsError,
  } = useAssignedComponents(buildId, "sataStorage");

  const {
    components: psu,
    isLoading: psuIsLoading,
    isError: psuIsError,
  } = useAssignedComponents(buildId, "psu");

  const {
    components: mobo,
    isLoading: moboIsLoading,
    isError: moboIsError,
  } = useAssignedComponents(buildId, "mobo");

  const {
    components: cooler,
    isLoading: coolerIsLoading,
    isError: coolerIsError,
  } = useAssignedComponents(buildId, "cooler");

  const extendedBuild: ExtendedBuildSchema | null = build
    ? {
        ...build,
        components: {
          cpu,
          gpu,
          ram,
          m2Storage,
          sataStorage,
          psu,
          mobo,
          cooler,
        },
      }
    : null;

  return {
    build: extendedBuild,
    deleteBuild,
    isLoading:
      cpuIsLoading ||
      gpuIsLoading ||
      ramIsLoading ||
      m2StorageIsLoading ||
      sataStorageIsLoading ||
      psuIsLoading ||
      moboIsLoading ||
      coolerIsLoading,
    isError:
      cpuIsError ||
      gpuIsError ||
      ramIsError ||
      m2StorageIsError ||
      sataStorageIsError ||
      psuIsError ||
      moboIsError ||
      coolerIsError,
  };
}
