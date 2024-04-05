import { useLiveQuery } from "dexie-react-hooks";

import { ComparisonTable } from "components/ComparisonTable";
import { CpuColumns } from "lib/columns";
import { Schema, StoreName, db } from "lib/db";
import { makeClassNamePrimitives } from "lib/styles";

import classNames from "./SelectBuildComponent.module.css";

const { Div } = makeClassNamePrimitives(classNames);

interface SelectBuildComponentProps {
  buildId: number;
  componentType: StoreName | null;
}

export const SelectBuildComponent = (props: SelectBuildComponentProps) => {
  const { buildId, componentType } = props;

  const selectedBuildComponent = useLiveQuery<Schema<StoreName>>(async () => {
    if (componentType === null) {
      return undefined;
    }

    const edge = await db
      .table("edges")
      .where({
        sourceId: buildId,
        sourceType: "build",
        targetType: componentType,
      })
      .first();

    if (!edge) {
      return undefined;
    }

    return db.table(componentType).where({ id: edge.targetId }).first();
  }, [buildId, componentType]);

  return (
    <>
      {componentType === null && (
        <Div.EmptyStateText>
          Select a component to add to the build
        </Div.EmptyStateText>
      )}
      {componentType === "cpu" && (
        <ComparisonTable
          dataStoreName="cpu"
          dataStoreLabel="CPUs"
          columns={CpuColumns}
          getIsBuildCompatible={(row) => {
            // return buildMobo ? row.socket === buildMobo.socket : true;
            return row.socket === "AM5";
          }}
          onRemove={async (cpuId) => {
            await db.transaction("rw", ["edges"], async (tx) => {
              await tx
                .table("edges")
                .where({
                  sourceId: buildId,
                  sourceType: "build",
                  targetType: "cpu",
                  targetId: cpuId,
                })
                .delete();
            });
          }}
          onSelect={async (cpuId) => {
            await db.transaction("rw", ["edges"], async (tx) => {
              await tx
                .table("edges")
                .where({
                  sourceId: buildId,
                  sourceType: "build",
                  targetType: "cpu",
                })
                .delete();

              await tx.table("edges").add({
                sourceId: buildId,
                sourceType: "build",
                targetId: cpuId,
                targetType: "cpu",
              });
            });
          }}
          selectedRowId={selectedBuildComponent?.id}
        />
      )}
    </>
  );
};
