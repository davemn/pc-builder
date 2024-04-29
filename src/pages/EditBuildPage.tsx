import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";

import { Button, ButtonSize, ButtonVariant } from "components/Button";
import { Layout } from "components/Layout";
import { SelectBuildComponent } from "components/SelectBuildComponent";
import { BuildComponentMeta, BuildComponentStoreName } from "lib/build";
import { BuildSchema, EdgeSchema, Schema, db } from "lib/db";
import { EditBuildPageProps, NavigateProp } from "lib/page";
import { makeClassNamePrimitives } from "lib/styles";

import classNames from "./EditBuildPage.module.css";

const { Div, Span } = makeClassNamePrimitives(classNames);

type Props = EditBuildPageProps & {
  navigate: NavigateProp;
};

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

export const EditBuildPage = (props: Props) => {
  const { buildId, navigate } = props;

  /* Sets the content pane */
  const [selectedComponentType, setSelectedComponentType] =
    useState<BuildComponentStoreName | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<number | null>(null);

  const build = useLiveQuery<BuildSchema>(
    () => db.table("build").where({ id: buildId }).first(),
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
          <h1>Edit build</h1>
          <h2>Build Price</h2>
          {build && (
            <Span.BuildPrice>{`$${Math.round(build.price)}`}</Span.BuildPrice>
          )}
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
              onChange={(e) => {
                db.table("build").update(buildId, { name: e.target.value });
              }}
              value={build?.name ?? ""}
            />
          </Div.LabelledControl>
          {/* Build Components */}
          <BuildComponentSlot
            key="cpu"
            buildId={buildId}
            componentType="cpu"
            selectedComponentType={selectedComponentType}
            selectedEdgeId={selectedEdgeId}
            onClick={(maybeEdgeId) => {
              setSelectedComponentType("cpu");
              setSelectedEdgeId(maybeEdgeId ?? null);
            }}
          />
          <BuildComponentSlot
            key="gpu"
            buildId={buildId}
            componentType="gpu"
            selectedComponentType={selectedComponentType}
            selectedEdgeId={selectedEdgeId}
            onClick={(maybeEdgeId) => {
              setSelectedComponentType("gpu");
              setSelectedEdgeId(maybeEdgeId ?? null);
            }}
          />
          <BuildComponentSlot
            key="mobo"
            buildId={buildId}
            componentType="mobo"
            selectedComponentType={selectedComponentType}
            selectedEdgeId={selectedEdgeId}
            onClick={(maybeEdgeId) => {
              setSelectedComponentType("mobo");
              setSelectedEdgeId(maybeEdgeId ?? null);
            }}
          />
          <BuildComponentSlot
            key="ram"
            buildId={buildId}
            componentType="ram"
            selectedComponentType={selectedComponentType}
            selectedEdgeId={selectedEdgeId}
            onClick={(maybeEdgeId) => {
              setSelectedComponentType("ram");
              setSelectedEdgeId(maybeEdgeId ?? null);
            }}
          />
          <BuildComponentSlot
            key="storage"
            buildId={buildId}
            componentType="storage"
            multiple={true}
            selectedComponentType={selectedComponentType}
            selectedEdgeId={selectedEdgeId}
            onClick={(maybeEdgeId) => {
              setSelectedComponentType("storage");
              setSelectedEdgeId(maybeEdgeId ?? null);
            }}
          />
          <BuildComponentSlot
            key="psu"
            buildId={buildId}
            componentType="psu"
            selectedComponentType={selectedComponentType}
            selectedEdgeId={selectedEdgeId}
            onClick={(maybeEdgeId) => {
              setSelectedComponentType("psu");
              setSelectedEdgeId(maybeEdgeId ?? null);
            }}
          />
          <BuildComponentSlot
            key="cooler"
            buildId={buildId}
            componentType="cooler"
            selectedComponentType={selectedComponentType}
            selectedEdgeId={selectedEdgeId}
            onClick={(maybeEdgeId) => {
              setSelectedComponentType("cooler");
              setSelectedEdgeId(maybeEdgeId ?? null);
            }}
          />
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
