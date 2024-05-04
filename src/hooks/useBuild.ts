import { useLiveQuery } from "dexie-react-hooks";

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

        const componentsOfType = await db
          .table(componentType)
          .where(":id")
          .anyOf(edgesOfType.map((edge) => edge.targetId))
          .toArray();

        byType[componentType] = componentsOfType.flatMap((component) => {
          const edge = edgesOfType.find(
            (edge) => edge.targetId === component.id
          );

          if (!edge) {
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
