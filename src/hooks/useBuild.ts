import { useQuery } from "@tanstack/react-query";

import {
  BuildComponentEdgeSchema,
  BuildComponentStoreName,
  ExtendedBuildSchema,
  OrderedBuildComponentStoreNames,
  edgeIsBuildComponentType,
} from "lib/build";
import { Schema } from "lib/db";
import * as Query from "lib/query";

async function resolveEdgesOfType<T extends BuildComponentStoreName>(
  componentType: T,
  edges: Array<BuildComponentEdgeSchema>
) {
  const edgesOfType = edges.filter(edgeIsBuildComponentType(componentType));

  // De-dupe edge target IDs, the same component can be assigned to a build multiple times
  const uniqueEdgeTargetIds = Array.from(
    new Set(edgesOfType.map((edge) => edge.targetId))
  );

  const componentsOfType = await Query.getComponentsWhere(componentType, {
    id: uniqueEdgeTargetIds,
  });

  return edgesOfType.flatMap<Schema<T> & { edgeId: number }>((edge) => {
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

export function useBuild(buildId: number | null | undefined) {
  const {
    data: build,
    isLoading,
    isError,
  } = useQuery<ExtendedBuildSchema | null>({
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

      const edges = (await Query.getEdgesWhere({
        sourceId: buildId,
        sourceType: "build",
      })) as BuildComponentEdgeSchema[];

      const byType = {} as ExtendedBuildSchema["components"];

      for (const componentType of OrderedBuildComponentStoreNames) {
        // Switch needed to convince Typescript that componentType on the left & right sides is the same...
        switch (componentType) {
          case "cpu":
            byType[componentType] = await resolveEdgesOfType(
              componentType,
              edges
            );
            break;
          case "gpu":
            byType[componentType] = await resolveEdgesOfType(
              componentType,
              edges
            );
            break;
          case "ram":
            byType[componentType] = await resolveEdgesOfType(
              componentType,
              edges
            );
            break;
          case "m2Storage":
            byType[componentType] = await resolveEdgesOfType(
              componentType,
              edges
            );
            break;
          case "sataStorage":
            byType[componentType] = await resolveEdgesOfType(
              componentType,
              edges
            );
            break;
          case "psu":
            byType[componentType] = await resolveEdgesOfType(
              componentType,
              edges
            );
            break;
          case "mobo":
            byType[componentType] = await resolveEdgesOfType(
              componentType,
              edges
            );
            break;
          case "cooler":
            byType[componentType] = await resolveEdgesOfType(
              componentType,
              edges
            );
            break;
          default:
            const _exhaustiveCheck: never = componentType;
        }
      }

      return {
        ...build,
        components: byType,
      };
    },
  });

  return {
    build: build ?? null,
    isLoading,
    isError,
  };
}
