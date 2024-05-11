import { useContext } from "react";

import {
  ComparisonTable,
  ComparisonTableProps,
} from "components/ComparisonTable";
import { BuildComponentMeta, BuildComponentStoreName } from "lib/build";
import { EdgeSchema, db } from "lib/db";
import { makeClassNamePrimitives } from "lib/styles";

import classNames from "./SelectBuildComponent.module.css";
import { BuildContext } from "context/build";

const { Div, Span } = makeClassNamePrimitives(classNames);

interface SelectBuildComponentProps {
  componentType: BuildComponentStoreName;
  edgeId: number | null;
  onRemove: () => void;
  onSelect: (edgeId: number) => void;
  showOutOfBoundsWarning: boolean;
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
  const { componentType, edgeId, onRemove, onSelect, showOutOfBoundsWarning } =
    props;

  const { build } = useContext(BuildContext);

  const selectedBuildComponent = build?.components[componentType].find(
    (component) => component.edgeId === edgeId
  );

  const { singularName } = BuildComponentMeta[componentType];

  return (
    <>
      {showOutOfBoundsWarning && (
        <Div.WarningBanner>
          <Span.WarningBannerText>{`This ${singularName} does not have a dedicated connector available in the build. This often means the motherboard / power supply's specs have the wrong count for the required connector (e.g. the number of PCIE x16 slots is set to zero).`}</Span.WarningBannerText>
        </Div.WarningBanner>
      )}
      <ComparisonTable
        {...getTableProps(componentType)}
        onEditSelected={async (prevComponent, component) => {
          // update build price
          await db.transaction("rw", ["build"], async (tx) => {
            if (!build) {
              throw new Error("Save failed: Build not found.");
            }
            let price = build.price;
            price -= prevComponent.price;
            price += component.price;
            await tx.table("build").update(build.id, { price });
          });
        }}
        onRemove={async (component) => {
          await db.transaction("rw", ["edges", "build"], async (tx) => {
            if (!build) {
              throw new Error("Save failed: Build not found.");
            }
            await tx
              .table("edges")
              .where({
                id: edgeId,
              })
              .delete();

            // update build price
            const price = build.price - component.price;
            await tx.table("build").update(build.id, { price });
          });

          onRemove();
        }}
        onSelect={async (prevComponent, component) => {
          const selectedEdgeId = await db.transaction(
            "rw",
            ["edges", "build"],
            async (tx) => {
              if (!build) {
                throw new Error("Save failed: Build not found.");
              }

              let newEdgeId: number;

              if (edgeId === null) {
                newEdgeId = await tx
                  .table<Omit<EdgeSchema, "id">, number>("edges")
                  .add({
                    sourceId: build.id,
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
              let price = build.price;
              price -= prevComponent?.price ?? 0;
              price += component.price;
              await tx.table("build").update(build.id, { price });

              return newEdgeId;
            }
          );

          onSelect(selectedEdgeId);
        }}
        selectedRowId={selectedBuildComponent?.id}
      />
    </>
  );
};
