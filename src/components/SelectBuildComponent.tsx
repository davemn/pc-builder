import { useContext } from "react";

import {
  ComparisonTable,
  ComparisonTableProps,
} from "components/ComparisonTable/ComparisonTable";
import { BuildContext } from "context/build";
import { useBuildMutations } from "hooks/useBuild";
import { BuildComponentMeta, BuildComponentStoreName } from "lib/build";
import { makeClassNamePrimitives } from "lib/styles";

import classNames from "./SelectBuildComponent.module.css";

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

export const SelectBuildComponent = (props: SelectBuildComponentProps) => {
  const { componentType, edgeId, onRemove, onSelect, showOutOfBoundsWarning } =
    props;

  const { build } = useContext(BuildContext);

  const { assignComponentToBuild, removeComponentFromBuild, updateBuild } =
    useBuildMutations();

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
        dataStoreName={componentType}
        onEditSelected={async (prevComponent, component) => {
          // update build price
          if (!build) {
            throw new Error("Save failed: Build not found.");
          }
          let price = build.price;
          price -= prevComponent.price;
          price += component.price;
          await updateBuild({
            id: build.id,
            changes: {
              price,
            },
          });
        }}
        onRemove={async (component) => {
          if (!build) {
            throw new Error("Save failed: Build not found.");
          }

          await removeComponentFromBuild({
            buildId: build.id,
            edgeId: edgeId ?? -1,
            componentType,
          });

          onRemove();
        }}
        onSelect={async (prevComponent, component) => {
          if (!build) {
            throw new Error("Save failed: Build not found.");
          }

          const selectedEdgeId = await assignComponentToBuild({
            buildId: build.id,
            edgeId,
            componentId: component.id,
            componentType,
          });

          onSelect(selectedEdgeId);
        }}
        selectedRowId={selectedBuildComponent?.id}
      />
    </>
  );
};
