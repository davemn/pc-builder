import { useContext, useState } from "react";

import { Button, ButtonSize, ButtonVariant } from "components/Button";
import { Layout } from "components/Layout";
import { SelectBuildComponent } from "components/SelectBuildComponent";
import { BuildContext, BuildProvider } from "context/build";
import { BuildGroupContext, BuildGroupProvider } from "context/buildGroup";
import {
  BuildComponentMeta,
  BuildComponentStoreName,
  ExtendedBuildSchema,
  OrderedBuildComponentStoreNames,
} from "lib/build";
import { EdgeSchema, Schema, db } from "lib/db";
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
  multiple?: boolean;
  selectedComponentType: BuildComponentStoreName | null;
  selectedEdgeId: number | null;
  onClick: (maybeEdgeId?: number) => void;
}

const BuildComponentSlot = <T extends BuildComponentStoreName>(
  props: BuildComponentSlotProps<T>
) => {
  const {
    build,
    componentType,
    multiple = false,
    selectedComponentType,
    selectedEdgeId,
    onClick,
  } = props;

  const { singularName, getIsBuildCompatible } =
    BuildComponentMeta[componentType];
  const assignedSlots = build.components[componentType];
  const hasIncompatibleSlots = assignedSlots.some(
    (component) => !getIsBuildCompatible(component, build)
  );

  const getButtonVariant = (
    component: (Schema<T> & { edgeId: number }) | null
  ) => {
    const isSelected =
      selectedComponentType === componentType &&
      selectedEdgeId === (component?.edgeId ?? null);

    if (component === null) {
      return isSelected ? ButtonVariant.DEFAULT_ACTIVE : ButtonVariant.DEFAULT;
    }

    const isCompatible = getIsBuildCompatible(component, build);

    if (!isCompatible) {
      return isSelected
        ? ButtonVariant.NEGATIVE_ACTIVE
        : ButtonVariant.NEGATIVE;
    }

    return isSelected ? ButtonVariant.ACCENT_ACTIVE : ButtonVariant.ACCENT;
  };

  return (
    <Div.LabelledControl>
      <label
        className={cx(classNames, hasIncompatibleSlots && "negativeLabel")}
      >
        {singularName}
      </label>
      {assignedSlots.map((component) => (
        <Button
          key={component.id}
          onClick={() => onClick(component.edgeId)}
          type="button"
          variant={getButtonVariant(component)}
        >
          {component.name}
        </Button>
      ))}
      {(assignedSlots.length === 0 || multiple) && (
        <Button
          key="add"
          onClick={() => onClick()}
          type="button"
          variant={getButtonVariant(null)}
        >
          {`- Add ${singularName} -`}
        </Button>
      )}
    </Div.LabelledControl>
  );
};

const EditBuildPageInner = (props: EditBuildPageInnerProps) => {
  const { navigate } = props;

  const { buildGroup } = useContext(BuildGroupContext);
  const { build } = useContext(BuildContext);

  /* Sets the content pane */
  const [selectedComponentType, setSelectedComponentType] =
    useState<BuildComponentStoreName | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<number | null>(null);

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
          <Button
            key="reset"
            onClick={async () => {
              await db.transaction("rw", ["edges", "build"], async (tx) => {
                // Remove all assigned edges from the build
                await tx
                  .table<EdgeSchema>("edges")
                  .where({
                    sourceId: build.id,
                    sourceType: "build",
                  })
                  .delete();
                // Reset price
                await db.table("build").update(build.id, { price: 0 });
              });
            }}
          >
            Reset
          </Button>
          <Div.LabelledControlInline>
            <label>Machine Name</label>
            <input
              type="text"
              name="name"
              onChange={async (e) => {
                await db
                  .table("buildGroup")
                  .update(buildGroup.id, { name: e.target.value });
              }}
              value={buildGroup?.name ?? ""}
            />
          </Div.LabelledControlInline>
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
          <Div.LabelledControl key="name">
            <label>Build Name</label>
            <input
              type="text"
              name="name"
              onChange={async (e) => {
                await db
                  .table("build")
                  .update(build.id, { name: e.target.value });
              }}
              value={build?.name ?? ""}
            />
          </Div.LabelledControl>
          {/* Build Components */}
          {OrderedBuildComponentStoreNames.map((componentType) => (
            <BuildComponentSlot
              key={componentType}
              build={build}
              componentType={componentType}
              selectedComponentType={selectedComponentType}
              selectedEdgeId={selectedEdgeId}
              onClick={(maybeEdgeId) => {
                setSelectedComponentType(componentType);
                setSelectedEdgeId(maybeEdgeId ?? null);
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
            }}
            onSelect={(edgeId) => {
              setSelectedEdgeId(edgeId);
            }}
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
