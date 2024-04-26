import { useLiveQuery } from "dexie-react-hooks";

import {
  ComparisonTable,
  ComparisonTableProps,
} from "components/ComparisonTable";
import { BuildComponentMeta, BuildComponentStoreName } from "lib/build";
import { EdgeSchema, db } from "lib/db";
import { makeClassNamePrimitives } from "lib/styles";

import classNames from "./SelectBuildComponent.module.css";

const { Div } = makeClassNamePrimitives(classNames);

interface SelectBuildComponentProps {
  buildId: number;
  componentType: BuildComponentStoreName;
  edgeId: number | null;
  onRemove: () => void;
  onSelect?: (componentId: number) => void;
}

// From https://stackoverflow.com/a/51691257
type Distribute<T> = T extends BuildComponentStoreName
  ? ComparisonTableProps<T>
  : never;

type AnyComparisonTableProps = Distribute<BuildComponentStoreName>;

function getTableProps<T extends BuildComponentStoreName>(
  componentType: T
): Omit<ComparisonTableProps<T>, "onRemove" | "onSelect"> {
  const componentMeta = BuildComponentMeta[componentType];

  return {
    dataStoreName: componentType,
    dataStoreLabel: componentMeta.pluralName,
    columns: componentMeta.columns,
    getIsBuildCompatible: componentMeta.getIsBuildCompatible,
  };
}

export const SelectBuildComponent = (props: SelectBuildComponentProps) => {
  const { componentType, buildId, edgeId, onRemove, onSelect } = props;

  // Convert edgeId -> componentId
  const selectedBuildComponentId = useLiveQuery<
    number | undefined
  >(async () => {
    if (edgeId === null) {
      return;
    }

    const edge = await db.table<EdgeSchema>("edges").get(edgeId);

    if (!edge) {
      return;
    }

    return edge.targetId;
  }, [edgeId]);

  return (
    <ComparisonTable
      {...getTableProps(componentType)}
      onRemove={async () => {
        await db.transaction("rw", ["edges"], async (tx) => {
          await tx
            .table("edges")
            .where({
              id: edgeId,
            })
            .delete();
        });
        onRemove();
      }}
      onSelect={async (componentId) => {
        await db.transaction("rw", ["edges"], async (tx) => {
          if (edgeId === null) {
            await tx.table("edges").add({
              sourceId: buildId,
              sourceType: "build",
              targetId: componentId,
              targetType: componentType,
            });
          } else {
            await tx.table("edges").update(edgeId, {
              targetId: componentId,
            });
          }
        });
        onSelect?.(componentId);
      }}
      selectedRowId={selectedBuildComponentId}
    />
  );
};
