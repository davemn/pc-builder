import { useLiveQuery } from "hooks/useLiveQuery";
import {
  ExtendedBuildSchema,
  OrderedBuildComponentStoreNames,
} from "lib/build";
import { BuildSchema, EdgeSchema, db } from "lib/db";

export function useBuild(
  buildId: number | null | undefined
): ExtendedBuildSchema | null {
  return useLiveQuery<ExtendedBuildSchema | null, null>(
    async () => {
      if (buildId === null || buildId === undefined) {
        return null;
      }

      const build = await db.table<BuildSchema>("build").get(buildId);

      if (!build) {
        return null;
      }

      const edges = await db
        .table<EdgeSchema>("edges")
        .where({
          sourceId: buildId,
          sourceType: "build",
        })
        .toArray();

      const byType = {} as ExtendedBuildSchema["components"];

      for (const componentType of OrderedBuildComponentStoreNames) {
        const edgesOfType = edges.filter(
          (edge) => edge.targetType === componentType
        );

        // De-dupe edge target IDs, the same component can be assigned to a build multiple times
        const uniqueEdgeTargetIds = Array.from(
          new Set(edgesOfType.map((edge) => edge.targetId))
        );

        const componentsOfType = await db
          .table<any>(componentType)
          .where(":id")
          .anyOf(uniqueEdgeTargetIds)
          .toArray();

        byType[componentType] = edgesOfType.flatMap((edge) => {
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

      return {
        ...build,
        components: byType,
      };
    },
    [buildId],
    null
  );
}
