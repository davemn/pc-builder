import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";

import { Button, ButtonSize, ButtonVariant } from "components/Button";
import { Layout } from "components/Layout";
import {
  BuildComponentMeta,
  BuildComponentStoreName,
  OrderedBuildComponentStoreNames,
} from "lib/build";
import {
  BuildGroupSchema,
  BuildSchema,
  EdgeSchema,
  Schema,
  StoreName,
  db,
} from "lib/db";
import { BuildsPageProps, NavigateProp } from "lib/page";
import { makeClassNamePrimitives } from "lib/styles";

import classNames from "./BuildsPage.module.css";

const { Div, Span } = makeClassNamePrimitives(classNames);

type RecordByStoreName = {
  [T in BuildComponentStoreName]: Array<Schema<T>>;
};

type Props = BuildsPageProps & {
  navigate: NavigateProp;
};

interface BuildGroupProps {
  builds: BuildSchema[];
  id: number;
  name: string;
  navigate: NavigateProp;
}

interface BuildSummaryProps {
  build: BuildSchema;
  compareToBuild: (BuildSchema & { components: RecordByStoreName }) | null;
  isSelected: boolean;
  onClick: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

interface BuildSummaryPlaceholderProps {
  onClick: () => void;
}

interface BuildSummaryComponentProps {
  buildId: number;
  compareToPrice: number | null;
  componentType: BuildComponentStoreName;
}

interface IndicatorPriceProps {
  price: number | null;
  compareToPrice: number | null;
}

async function createOrCopyBuild(
  groupId: number,
  buildIdToCopy?: number
): Promise<number> {
  // create new / copy build and assign to group
  return await db.transaction("rw", ["edges", "build"], async (tx) => {
    let buildId: number;
    if (buildIdToCopy === undefined) {
      buildId = await tx.table<Omit<BuildSchema, "id">, number>("build").add({
        name: "New Build",
        price: 0,
      });
    } else {
      const buildToCopy = await tx
        .table<BuildSchema>("build")
        .get(buildIdToCopy);
      if (!buildToCopy) {
        throw new Error("Build to copy not found");
      }

      // copy & rename build
      buildId = await tx.table<Omit<BuildSchema, "id">, number>("build").add({
        name: `${buildToCopy.name} (Copy)`,
        price: buildToCopy.price,
      });

      const edges = await tx
        .table<EdgeSchema>("edges")
        .where({
          sourceId: buildIdToCopy,
          sourceType: "build",
        })
        .toArray();

      // also copy all edges
      for (const edge of edges) {
        await tx.table<Omit<EdgeSchema, "id">>("edges").add({
          sourceId: buildId,
          sourceType: "build",
          targetId: edge.targetId,
          targetType: edge.targetType,
        });
      }
    }

    // associate new build with group
    await tx.table<Omit<EdgeSchema, "id">>("edges").add({
      sourceId: groupId,
      sourceType: "buildGroup",
      targetId: buildId,
      targetType: "build",
    });

    return buildId;
  });
}

function getSlotPrice(
  components: Array<Schema<BuildComponentStoreName>> | undefined
): number | null {
  if (!components || components.length === 0) {
    return null;
  }
  return components.reduce((acc, component) => acc + component.price, 0);
}

function formatPrice(price: number): string {
  return `$${Math.round(price)}`;
}

const IndicatorPrice = (props: IndicatorPriceProps) => {
  const { price, compareToPrice } = props;

  if (price === null) {
    return null;
  }

  if (compareToPrice === null || price === compareToPrice) {
    return <Span.ValueNeutral>{formatPrice(price)}</Span.ValueNeutral>;
  }

  if (price > compareToPrice) {
    return <Span.ValueNegative>{formatPrice(price)}</Span.ValueNegative>;
  }

  return <Span.ValuePositive>{formatPrice(price)}</Span.ValuePositive>;
};

const BuildSummaryComponent = (props: BuildSummaryComponentProps) => {
  const { buildId, compareToPrice, componentType } = props;

  const assignedSlots = useLiveQuery<
    Array<Schema<BuildComponentStoreName>>
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

    return components;
  }, [buildId, componentType]);

  const componentMeta = BuildComponentMeta[componentType];

  return (
    <Div.BuildSummaryComponent>
      <Div.ComponentName>
        <span>{componentMeta.singularName}</span>
        <IndicatorPrice
          price={getSlotPrice(assignedSlots)}
          compareToPrice={compareToPrice}
        />
      </Div.ComponentName>
      {assignedSlots?.map((component) => (
        <h2 key={component.id}>{component.name}</h2>
      ))}
      {(assignedSlots ?? []).length === 0 && (
        <h2 className={classNames.emptySlot}>- None Selected -</h2>
      )}
    </Div.BuildSummaryComponent>
  );
};

const BuildSummary = (props: BuildSummaryProps) => {
  const {
    build,
    compareToBuild,
    isSelected,
    onClick,
    onCopy,
    onEdit,
    onRemove,
  } = props;

  return (
    <Div.BuildSummary
      onClick={onClick}
      style={
        isSelected
          ? {
              borderColor: "var(--accent0)",
            }
          : {}
      }
    >
      <h1>{build.name}</h1>
      {/* indicator color for total price */}
      <h2>
        <IndicatorPrice
          price={build.price}
          compareToPrice={compareToBuild?.price ?? null}
        />
      </h2>
      {OrderedBuildComponentStoreNames.map((componentType) => (
        <BuildSummaryComponent
          key={componentType}
          buildId={build.id}
          componentType={componentType}
          compareToPrice={getSlotPrice(
            compareToBuild?.components?.[componentType]
          )}
        />
      ))}
      <Div.Actions>
        <Button onClick={() => onCopy()}>Copy</Button>
        <Button onClick={() => onEdit()}>Edit</Button>
        <Button onClick={() => onRemove()} variant={ButtonVariant.ACTIVE}>
          Remove
        </Button>
      </Div.Actions>
    </Div.BuildSummary>
  );
};

const BuildSummaryPlaceholder = (props: BuildSummaryPlaceholderProps) => {
  const { onClick } = props;

  return (
    <Div.BuildSummaryPlaceholder onClick={onClick}>
      <Button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        variant={ButtonVariant.ACTIVE}
      >
        Add Build
      </Button>
    </Div.BuildSummaryPlaceholder>
  );
};

const BuildGroup = (props: BuildGroupProps) => {
  const { builds, id: groupId, name, navigate } = props;

  const [selectedBuild, setSelectedBuild] = useState<BuildSchema | null>(null);

  const selectedBuildComponentsByType = useLiveQuery<
    RecordByStoreName | null,
    null
  >(
    async () => {
      if (!selectedBuild) {
        return null;
      }

      const edges = await db
        .table<EdgeSchema>("edges")
        .where({
          sourceId: selectedBuild.id,
          sourceType: "build",
        })
        .toArray();

      const edgesByType = edges.reduce(
        (acc, edge) => {
          if (!acc[edge.targetType]) {
            acc[edge.targetType] = [];
          }

          acc[edge.targetType].push(edge);

          return acc;
        },
        {} as Record<StoreName, Array<EdgeSchema>>
      );

      const buildComponentsByType: RecordByStoreName = {} as RecordByStoreName;

      for (const componentType of Object.keys(
        edgesByType
      ) as Array<BuildComponentStoreName>) {
        const componentEdges = edgesByType[componentType];

        const components = await db
          .table(componentType)
          .where(":id")
          .anyOf(componentEdges.map((edge) => edge.targetId))
          .toArray();

        buildComponentsByType[componentType] = components;
      }

      return buildComponentsByType;
    },
    [selectedBuild?.id],
    null
  );

  return (
    <>
      <h2 className={classNames.buildGroupHeading}>Machine</h2>
      <h1 className={classNames.buildGroupTitle}>{name}</h1>
      <Div.ScrollContainer>
        {builds.map((build) => (
          <BuildSummary
            key={build.id}
            build={build}
            compareToBuild={
              selectedBuild && selectedBuildComponentsByType
                ? {
                    ...selectedBuild,
                    components: selectedBuildComponentsByType,
                  }
                : null
            }
            isSelected={selectedBuild?.id === build.id}
            onClick={() => {
              if (selectedBuild?.id === build.id) {
                setSelectedBuild(null);
              } else {
                setSelectedBuild({ ...build });
              }
            }}
            onCopy={async () => {
              await createOrCopyBuild(groupId, build.id);
            }}
            onEdit={() => {
              navigate("editBuild", { buildId: build.id });
            }}
            onRemove={async () => {
              // remove build from group & delete
              await db.transaction("rw", ["edges", "build"], async (tx) => {
                await tx
                  .table<EdgeSchema>("edges")
                  .where({
                    sourceId: groupId,
                    sourceType: "buildGroup",
                    targetId: build.id,
                    targetType: "build",
                  })
                  .delete();

                await tx
                  .table<BuildSchema>("build")
                  .where({ id: build.id })
                  .delete();
              });
            }}
          />
        ))}
        <BuildSummaryPlaceholder
          onClick={async () => {
            const newBuildId = await createOrCopyBuild(groupId);
            navigate("editBuild", { buildId: newBuildId });
          }}
        />
      </Div.ScrollContainer>
    </>
  );
};

export const BuildsPage = (props: Props) => {
  const { navigate } = props;

  const buildGroups = useLiveQuery<
    Array<BuildGroupSchema & { builds: Array<BuildSchema> }>
  >(async () => {
    const buildGroups = await db
      .table<BuildGroupSchema>("buildGroup")
      .toArray();

    const buildGroupsWithBuilds = [];

    for (const buildGroup of buildGroups) {
      const edges = await db
        .table("edges")
        .where({
          sourceId: buildGroup.id,
          sourceType: "buildGroup",
          targetType: "build",
        })
        .toArray();

      if (!edges || edges.length === 0) {
        buildGroupsWithBuilds.push({ ...buildGroup, builds: [] });
        continue;
      }

      const builds = await db
        .table("build")
        .where(":id")
        .anyOf(edges.map((edge) => edge.targetId))
        .toArray();

      buildGroupsWithBuilds.push({ ...buildGroup, builds });
    }

    return buildGroupsWithBuilds;
  }, []);

  return (
    <Layout
      nav={
        <>
          <h1>All Machines</h1>
          <Button
            onClick={async () => {
              const newGroupId = await db.transaction(
                "rw",
                ["edges", "buildGroup"],
                async (tx) => {
                  const groupId = await tx
                    .table<Omit<BuildGroupSchema, "id">, number>("buildGroup")
                    .add({
                      name: "New Machine",
                    });

                  return groupId;
                }
              );
            }}
            size={ButtonSize.NORMAL}
            variant={ButtonVariant.ACTIVE}
          >
            Add Machine
          </Button>
        </>
      }
      content={
        <Div.ContentContainer>
          {buildGroups?.map((buildGroup) => (
            <BuildGroup
              key={buildGroup.id}
              builds={buildGroup.builds}
              id={buildGroup.id}
              name={buildGroup.name}
              navigate={navigate}
            />
          ))}
        </Div.ContentContainer>
      }
      emptyStateText="Add a machine above to get started."
    />
  );
};
