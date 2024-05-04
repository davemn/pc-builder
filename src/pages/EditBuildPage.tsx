import { useContext, useEffect, useState } from "react";

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
import { EdgeSchema, db } from "lib/db";
import { EditBuildPageProps } from "lib/page";
import { makeClassNamePrimitives } from "lib/styles";

import classNames from "./EditBuildPage.module.css";

const { Div, Span } = makeClassNamePrimitives(classNames);

interface EditBuildPageInnerProps {
  navigate: EditBuildPageProps["navigate"];
}

interface BuildComponentSlotProps {
  build: ExtendedBuildSchema;
  componentType: BuildComponentStoreName;
  multiple?: boolean;
  selectedComponentType: BuildComponentStoreName | null;
  selectedEdgeId: number | null;
  onClick: (maybeEdgeId?: number) => void;
}

const BuildComponentSlot = (props: BuildComponentSlotProps) => {
  const {
    build,
    componentType,
    multiple = false,
    selectedComponentType,
    selectedEdgeId,
    onClick,
  } = props;

  const assignedSlots = build.components[componentType];

  return (
    <Div.LabelledControl>
      <label>{BuildComponentMeta[componentType].singularName}</label>
      {assignedSlots.map(({ edgeId, ...component }) => (
        <Button
          key={component.id}
          className={
            selectedComponentType === componentType && selectedEdgeId === edgeId
              ? classNames.activeControl
              : undefined
          }
          onClick={() => onClick(edgeId)}
          type="button"
          variant={ButtonVariant.ACTIVE}
        >
          {component.name}
        </Button>
      ))}
      {(assignedSlots.length === 0 || multiple) && (
        <Button
          key="add"
          className={
            selectedComponentType === componentType && selectedEdgeId === null
              ? classNames.activeControl
              : undefined
          }
          onClick={() => onClick()}
          type="button"
        >
          {`- Add ${BuildComponentMeta[componentType].singularName} -`}
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

  useEffect(() => {
    // De-select component slot if build is changed from subnav
    // TODO Preserve the selected slot instead, need to track the slot index instead of edgeId
    if (build) {
      setSelectedComponentType(null);
      setSelectedEdgeId(null);
    }
  }, [build]);

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
                onClick={() =>
                  navigate("editBuild", {
                    buildGroupId: buildGroup.id,
                    buildId: otherBuild.id,
                  })
                }
                variant={
                  otherBuild.id === build.id
                    ? ButtonVariant.ACTIVE
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
