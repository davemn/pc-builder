import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";

import { Button, ButtonSize, ButtonVariant } from "components/Button";
import { Layout } from "components/Layout";
import { SelectBuildComponent } from "components/SelectBuildComponent";
import {
  BuildComponentMeta,
  BuildComponentStoreName,
  OrderedBuildComponentStoreNames,
} from "lib/build";
import { BuildGroupSchema, BuildSchema, EdgeSchema, Schema, db } from "lib/db";
import { EditBuildPageProps } from "lib/page";
import { makeClassNamePrimitives } from "lib/styles";

import classNames from "./EditBuildPage.module.css";

const { Div, Span } = makeClassNamePrimitives(classNames);

interface BuildComponentSlotProps {
  buildId: number;
  componentType: BuildComponentStoreName;
  multiple?: boolean;
  selectedComponentType: BuildComponentStoreName | null;
  selectedEdgeId: number | null;
  onClick: (maybeEdgeId?: number) => void;
}

const BuildComponentSlot = (props: BuildComponentSlotProps) => {
  const {
    buildId,
    componentType,
    multiple = false,
    selectedComponentType,
    selectedEdgeId,
    onClick,
  } = props;

  const assignedSlots = useLiveQuery<
    Array<{
      edgeId: number;
      component: Schema<BuildComponentStoreName>;
    }>
  >(async () => {
    const edges = await db
      .table("edges")
      .where({
        sourceId: buildId,
        sourceType: "build",
        targetType: componentType,
      })
      .toArray();

    if (!edges || edges.length === 0) {
      return [];
    }

    const components = await db
      .table(componentType)
      .where(":id")
      .anyOf(edges.map((edge) => edge.targetId))
      .toArray();

    return edges.map((edge) => ({
      edgeId: edge.id,
      component: components.find((component) => component.id === edge.targetId),
    }));
  }, [buildId, componentType]);

  return (
    <Div.LabelledControl>
      <label>{BuildComponentMeta[componentType].singularName}</label>
      {(assignedSlots ?? []).map(({ edgeId, component }) => (
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
      {((assignedSlots ?? []).length === 0 || multiple) && (
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

export const EditBuildPage = (props: EditBuildPageProps) => {
  const { buildGroupId, buildId, navigate } = props;

  /* Sets the content pane */
  const [selectedComponentType, setSelectedComponentType] =
    useState<BuildComponentStoreName | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<number | null>(null);

  const buildGroup = useLiveQuery<BuildGroupSchema>(
    () => db.table("buildGroup").get(buildGroupId),
    [buildGroupId]
  );

  const build = useLiveQuery<BuildSchema>(
    () => db.table("build").get(buildId),
    [buildId]
  );

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
                    sourceId: buildId,
                    sourceType: "build",
                  })
                  .delete();
                // Reset price
                await db.table("build").update(buildId, { price: 0 });
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
                  .update(buildGroupId, { name: e.target.value });
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
      sidebar={
        <>
          {/* Build Name */}
          <Div.LabelledControl key="name">
            <label>Name</label>
            <input
              type="text"
              name="name"
              onChange={async (e) => {
                await db
                  .table("build")
                  .update(buildId, { name: e.target.value });
              }}
              value={build?.name ?? ""}
            />
          </Div.LabelledControl>
          {/* Build Components */}
          {OrderedBuildComponentStoreNames.map((componentType) => (
            <BuildComponentSlot
              key={componentType}
              buildId={buildId}
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
            buildId={buildId}
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
