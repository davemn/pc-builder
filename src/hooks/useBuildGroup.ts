import { useLiveQuery } from "dexie-react-hooks";

import { ExtendedBuildGroupSchema } from "lib/build";
import { BuildGroupSchema, BuildSchema, EdgeSchema, db } from "lib/db";

/** Note: A buildGroup is the same as a device. */
export function useBuildGroup(
  buildGroupId: number | null | undefined
): ExtendedBuildGroupSchema | null {
  return useLiveQuery<ExtendedBuildGroupSchema | null, null>(
    async () => {
      if (buildGroupId === null || buildGroupId === undefined) {
        return null;
      }

      const buildGroup = await db
        .table<BuildGroupSchema>("buildGroup")
        .get(buildGroupId);

      if (!buildGroup) {
        return null;
      }

      const edges = await db
        .table<EdgeSchema>("edges")
        .where({
          sourceId: buildGroupId,
          sourceType: "buildGroup",
          targetType: "build",
        })
        .toArray();

      const builds = await db
        .table<BuildSchema>("build")
        .where(":id")
        .anyOf(edges.map((edge) => edge.targetId))
        .toArray();

      return {
        ...buildGroup,
        builds,
      };
    },
    [buildGroupId],
    null
  );
}
