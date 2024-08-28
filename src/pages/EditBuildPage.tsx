import { useContext, useState } from "react";

import { Button, ButtonSize, ButtonVariant } from "components/Button";
import { Input, InputVariant } from "components/Input";
import { Layout } from "components/Layout";
import { SelectBuildComponent } from "components/SelectBuildComponent";
import { BuildContext, BuildProvider } from "context/build";
import { BuildGroupContext, BuildGroupProvider } from "context/buildGroup";
import { useBuildMutations } from "hooks/useBuild";
import { useBuildGroupMutations } from "hooks/useBuildGroup";
import {
  BuildComponentMeta,
  BuildComponentStoreName,
  Compatibility,
  ExtendedBuildSchema,
  OrderedBuildComponentStoreNames,
  overallCompatibility,
} from "lib/build";
import { Schema } from "lib/db";
import { EditBuildPageProps } from "lib/page";
import { cx, makeClassNamePrimitives } from "lib/styles";

import classNames from "./EditBuildPage.module.css";

const { Div, Span } = makeClassNamePrimitives(classNames);

interface EditBuildPageInnerProps {
  navigate: EditBuildPageProps["navigate"];
}

interface BuildComponentSlotProps<T extends BuildComponentStoreName> {
  build: ExtendedBuildSchema;
  componentType: T;
  selectedComponentType: BuildComponentStoreName | null;
  selectedEdgeId: number | null;
  onClick: (
    maybeEdgeId: number | null,
    selectedSlotIsOutOfBounds: boolean
  ) => void;
}

const BuildComponentSlot = <T extends BuildComponentStoreName>(
  props: BuildComponentSlotProps<T>
) => {
  const {
    build,
    componentType,
    selectedComponentType,
    selectedEdgeId,
    onClick,
  } = props;

  const { singularName, getCompatibilityChecks, getMaxCount } =
    BuildComponentMeta[componentType];
  const assignedSlots = build.components[componentType];
  const hasIncompatibleSlots =
    overallCompatibility(
      assignedSlots.flatMap((component) =>
        getCompatibilityChecks(component, build)
      )
    ) === Compatibility.INCOMPATIBLE;
  const maxSlots = getMaxCount(build);

  const getButtonVariant = (
    component: Schema<T> & { edgeId: number },
    slotIndex: number
  ) => {
    const isSelected =
      selectedComponentType === componentType &&
      selectedEdgeId === (component?.edgeId ?? null);

    const isCompatible =
      (maxSlots === -1 || slotIndex < maxSlots) &&
      overallCompatibility(getCompatibilityChecks(component, build)) !==
        Compatibility.INCOMPATIBLE;

    if (!isCompatible) {
      return isSelected
        ? ButtonVariant.NEGATIVE_ACTIVE
        : ButtonVariant.NEGATIVE;
    }

    return isSelected ? ButtonVariant.ACCENT_ACTIVE : ButtonVariant.ACCENT;
  };

  const getAddButtonVariant = () => {
    const isSelected =
      selectedComponentType === componentType && selectedEdgeId === null;

    return isSelected ? ButtonVariant.DEFAULT_ACTIVE : ButtonVariant.DEFAULT;
  };

  return (
    <Div.LabelledControl>
      <label
        className={cx(classNames, hasIncompatibleSlots && "negativeLabel")}
      >
        {singularName}
      </label>
      {assignedSlots.map((component, index) => (
        <Button
          key={component.edgeId}
          onClick={() => onClick(component.edgeId, index >= maxSlots)}
          type="button"
          variant={getButtonVariant(component, index)}
        >
          {component.name}
        </Button>
      ))}
      {(maxSlots === -1 || assignedSlots.length < maxSlots) && (
        <Button
          key="add"
          onClick={() => onClick(null, false)}
          type="button"
          variant={getAddButtonVariant()}
        >
          {`- Add ${singularName} -`}
        </Button>
      )}
      {assignedSlots.length === 0 && maxSlots === 0 && (
        <Div.EmptySlot>- No available slots -</Div.EmptySlot>
      )}
    </Div.LabelledControl>
  );
};

const EditBuildPageInner = (props: EditBuildPageInnerProps) => {
  const { navigate } = props;

  const { buildGroup } = useContext(BuildGroupContext);
  const { build } = useContext(BuildContext);

  const { updateBuildGroup } = useBuildGroupMutations();
  const { updateBuild } = useBuildMutations();

  /* Sets the content pane */
  const [selectedComponentType, setSelectedComponentType] =
    useState<BuildComponentStoreName | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<number | null>(null);
  const [selectedHasOutOfBoundsWarning, setSelectedHasOutOfBoundsWarning] =
    useState<boolean>(false);

  if (!build || !buildGroup) {
    return null;
  }

  return (
    <Layout
      nav={
        <>
          <Button
            key="back"
            className={classNames.backButton}
            onClick={() => navigate("builds", {})}
            size={ButtonSize.LARGE}
          >
            Back
          </Button>
          <Input
            labelText="Machine Name"
            type="text"
            name="name"
            onChange={async (e) => {
              await updateBuildGroup({
                id: buildGroup.id,
                changes: { name: e.target.value },
              });
            }}
            value={buildGroup?.name ?? ""}
            variant={InputVariant.INLINE}
          />
          <Div.LabelledControlInline>
            <h2>Build Price</h2>
            {build && (
              <Span.BuildPrice>{`$${Math.round(build.price)}`}</Span.BuildPrice>
            )}
          </Div.LabelledControlInline>
        </>
      }
      subnav={
        <>
          <h2 className={classNames.subnavHeading}>Builds</h2>
          <Div.ScrollContainer>
            {buildGroup.builds.map((otherBuild) => (
              <Button
                key={otherBuild.id}
                onClick={() => {
                  // De-select component slot if build is changed from subnav
                  // TODO Preserve the selected slot instead, need to track the slot index instead of edgeId
                  setSelectedComponentType(null);
                  setSelectedEdgeId(null);

                  navigate("editBuild", {
                    buildGroupId: buildGroup.id,
                    buildId: otherBuild.id,
                  });
                }}
                variant={
                  otherBuild.id === build.id
                    ? ButtonVariant.ACCENT
                    : ButtonVariant.DEFAULT
                }
              >
                {otherBuild.name}
              </Button>
            ))}
          </Div.ScrollContainer>
        </>
      }
      sidebar={
        <>
          {/* Build Name */}
          <Input
            key="name"
            labelText="Build Name"
            type="text"
            name="name"
            onChange={async (e) => {
              await updateBuild({
                id: build.id,
                changes: { name: e.target.value },
              });
            }}
            value={build?.name ?? ""}
          />
          {/* Build Components */}
          {OrderedBuildComponentStoreNames.map((componentType) => (
            <BuildComponentSlot
              key={componentType}
              build={build}
              componentType={componentType}
              selectedComponentType={selectedComponentType}
              selectedEdgeId={selectedEdgeId}
              onClick={(maybeEdgeId, selectedSlotIsOutOfBounds) => {
                setSelectedComponentType(componentType);
                setSelectedEdgeId(maybeEdgeId);
                setSelectedHasOutOfBoundsWarning(selectedSlotIsOutOfBounds);
              }}
            />
          ))}
        </>
      }
      content={
        selectedComponentType && (
          <SelectBuildComponent
            edgeId={selectedEdgeId}
            componentType={selectedComponentType}
            onRemove={() => {
              setSelectedEdgeId(null);
              setSelectedHasOutOfBoundsWarning(false);
            }}
            onSelect={(edgeId) => {
              setSelectedEdgeId(edgeId);
            }}
            showOutOfBoundsWarning={selectedHasOutOfBoundsWarning}
          />
        )
      }
      emptyStateText="Select a component to add to the build"
    />
  );
};

export const EditBuildPage = (props: EditBuildPageProps) => {
  const { buildGroupId, buildId, navigate } = props;

  return (
    <BuildGroupProvider buildGroupId={buildGroupId}>
      <BuildProvider buildId={buildId}>
        <EditBuildPageInner navigate={navigate} />
      </BuildProvider>
    </BuildGroupProvider>
  );
};
