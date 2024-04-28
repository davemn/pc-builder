import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";

import {
  ComparisonTable,
  ComparisonTableProps,
} from "components/ComparisonTable";
import { BuildComponentMeta, BuildComponentStoreName } from "lib/build";
import { BuildSchema, EdgeSchema, Schema, db } from "lib/db";
import { makeClassNamePrimitives } from "lib/styles";

import classNames from "./SelectBuildComponent.module.css";

const { Div } = makeClassNamePrimitives(classNames);

interface SelectBuildComponentProps {
  buildId: number;
  componentType: BuildComponentStoreName;
  edgeId: number | null;
  onRemove: () => void;
  onSelect: (edgeId: number) => void;
}

// From https://stackoverflow.com/a/51691257
type Distribute<T> = T extends BuildComponentStoreName
  ? ComparisonTableProps<T>
  : never;

type AnyComparisonTableProps = Distribute<BuildComponentStoreName>;

function getTableProps<T extends BuildComponentStoreName>(
  componentType: T
): Omit<ComparisonTableProps<T>, "onEditSelected" | "onRemove" | "onSelect"> {
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

  // Convert edgeId -> component
  const selectedBuildComponent = useLiveQuery<
    Schema<BuildComponentStoreName> | undefined
  >(async () => {
    if (edgeId === null) {
      return;
    }

    const edge = await db.table<EdgeSchema>("edges").get(edgeId);

    if (!edge) {
      return;
    }

    const targetId = edge.targetId;
    const component = await db
      .table<Schema<BuildComponentStoreName>>(componentType)
      .get(targetId);

    return component;
  }, [edgeId]);

  return (
    <ComparisonTable
      {...getTableProps(componentType)}
      onEditSelected={async (prevComponent, component) => {
        // update build price
        await db.transaction("rw", ["build"], async (tx) => {
          const build = await tx.table<BuildSchema>("build").get(buildId);
          if (build) {
            build.price -= prevComponent.price;
            build.price += component.price;
            await tx.table("build").update(buildId, { price: build.price });
          }
        });
      }}
      onRemove={async (component) => {
        await db.transaction("rw", ["edges", "build"], async (tx) => {
          await tx
            .table("edges")
            .where({
              id: edgeId,
            })
            .delete();

          // update build price
          const build = await tx.table<BuildSchema>("build").get(buildId);
          if (build) {
            build.price -= component.price;
            await tx.table("build").update(buildId, { price: build.price });
          }
        });

        onRemove();
      }}
      onSelect={async (prevComponent, component) => {
        const selectedEdgeId = await db.transaction(
          "rw",
          ["edges", "build"],
          async (tx) => {
            let newEdgeId: number;

            if (edgeId === null) {
              newEdgeId = await tx
                .table<Omit<EdgeSchema, "id">, number>("edges")
                .add({
                  sourceId: buildId,
                  sourceType: "build",
                  targetId: component.id,
                  targetType: componentType,
                });
            } else {
              newEdgeId = edgeId;
              await tx.table("edges").update(edgeId, {
                targetId: component.id,
              });
            }

            // update build price
            const build = await tx.table<BuildSchema>("build").get(buildId);
            if (build) {
              build.price -= prevComponent?.price ?? 0;
              build.price += component.price;
              await tx.table("build").update(buildId, { price: build.price });
            }

            return newEdgeId;
          }
        );

        onSelect(selectedEdgeId);
      }}
      selectedRowId={selectedBuildComponent?.id}
    />
  );
};
