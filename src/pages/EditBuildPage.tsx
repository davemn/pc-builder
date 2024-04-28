import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";

import { Button, ButtonVariant } from "components/Button";
import { SelectBuildComponent } from "components/SelectBuildComponent";
import { BuildComponentMeta, BuildComponentStoreName } from "lib/build";
import { BuildSchema, EdgeSchema, Schema, db } from "lib/db";
import { EditBuildPageProps, NavigateProp } from "lib/page";
import { cx, makeClassNamePrimitives } from "lib/styles";

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
    <Div.Container>
      <nav className={classNames.nav}>
        <Button
          className={classNames.backButton}
          onClick={() => navigate("builds", {})}
        >
          Back
        </Button>
        <Button
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
        <span>Build Price</span>
        {build && (
          <Span.BuildPrice>{`$${Math.round(build.price)}`}</Span.BuildPrice>
        )}
      </nav>
      <Div.Sidebar>
        {/* Build Name */}
        <div key="name" className={classNames.labelledControl}>
          <label>Name</label>
          <input
            type="text"
            name="name"
            onChange={(e) => {
              db.table("build").update(buildId, { name: e.target.value });
            }}
            value={build?.name ?? ""}
          />
        </div>
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
      </Div.Sidebar>
      <Div.Content>
        {selectedComponentType === null ? (
          <Div.EmptyStateText>
            Select a component to add to the build
          </Div.EmptyStateText>
        ) : (
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
        )}
      </Div.Content>
    </Div.Container>
  );
};
