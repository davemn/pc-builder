import { useState } from "react";

import { Button, ButtonSize, ButtonVariant } from "components/Button";
import { Layout } from "components/Layout";
import {
  useAssignedComponents,
  useBuildMutations,
  useExtendedBuild,
} from "hooks/useBuild";
import { useBuildGroups } from "hooks/useBuildGroups";
import {
  BuildComponentMeta,
  BuildComponentStoreName,
  OrderedBuildComponentStoreNames,
} from "lib/build";
import { BuildSchema, EdgeSchema, Schema, db } from "lib/db";
import { BuildsPageProps } from "lib/page";
import { makeClassNamePrimitives } from "lib/styles";

import classNames from "./BuildsPage.module.css";

const { Div, Span } = makeClassNamePrimitives(classNames);

type RecordByStoreName = {
  [T in BuildComponentStoreName]: Array<Schema<T>>;
};

interface BuildGroupProps {
  builds: BuildSchema[];
  id: number;
  name: string;
  navigate: BuildsPageProps["navigate"];
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
      buildId = await tx.table<Omit<BuildSchema, "id">>("build").add({
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
      buildId = await tx.table<Omit<BuildSchema, "id">>("build").add({
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

  const { components: assignedSlots } = useAssignedComponents(
    buildId,
    componentType
  );

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
      {assignedSlots?.map((component, index) => (
        <h2 key={`${component.id}-${index}`}>
          {component.brand} {component.name}
        </h2>
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

  const [selectedBuildId, setSelectedBuildId] = useState<number | null>(null);

  const { build: selectedBuild } = useExtendedBuild(selectedBuildId);

  const { deleteBuild } = useBuildMutations();

  return (
    <>
      <h2 className={classNames.buildGroupHeading}>Machine</h2>
      <h1 className={classNames.buildGroupTitle}>{name}</h1>
      <Div.ScrollContainer>
        {builds.map((build) => (
          <BuildSummary
            key={build.id}
            build={build}
            compareToBuild={selectedBuild}
            isSelected={selectedBuild?.id === build.id}
            onClick={() => {
              if (selectedBuild?.id === build.id) {
                setSelectedBuildId(null);
              } else {
                setSelectedBuildId(build.id);
              }
            }}
            onCopy={async () => {
              await createOrCopyBuild(groupId, build.id);
            }}
            onEdit={() => {
              navigate("editBuild", {
                buildGroupId: groupId,
                buildId: build.id,
              });
            }}
            onRemove={async () => {
              // remove build from group & delete
              await deleteBuild(build.id);
            }}
          />
        ))}
        <BuildSummaryPlaceholder
          onClick={async () => {
            const newBuildId = await createOrCopyBuild(groupId);
            navigate("editBuild", {
              buildGroupId: groupId,
              buildId: newBuildId,
            });
          }}
        />
      </Div.ScrollContainer>
    </>
  );
};

export const BuildsPage = (props: BuildsPageProps) => {
  const { navigate } = props;
  const { addBuildGroup, buildGroups } = useBuildGroups();

  return (
    <Layout
      nav={
        <>
          <h1>All Machines</h1>
          <Button
            onClick={async () => {
              const newGroupId = await addBuildGroup("New Machine");
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
