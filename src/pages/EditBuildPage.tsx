import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";

import { ComparisonTable } from "components/ComparisonTable";
import { CpuColumns } from "lib/columns";
import { BuildSchema, CpuSchema, MoboSchema, db } from "lib/db";
import { EditBuildPageProps, NavigateProp } from "lib/page";
import { cx, makeClassNamePrimitives } from "lib/styles";

import classNames from "./EditBuildPage.module.css";

const { Div, Span } = makeClassNamePrimitives(classNames);

type Props = EditBuildPageProps & {
  navigate: NavigateProp;
};

export const EditBuildPage = (props: Props) => {
  const { buildId, navigate } = props;

  /* Sets the content pane */
  const [activeTable, setActiveTable] = useState<string | null>(null);

  const build = useLiveQuery<BuildSchema>(
    () => db.table("build").where({ id: buildId }).first(),
    [buildId]
  );

  const buildCpu = useLiveQuery<CpuSchema>(async () => {
    const cpuEdge = await db
      .table("edges")
      .where({ sourceId: buildId, sourceType: "build", targetType: "cpu" })
      .first();

    if (!cpuEdge) {
      return undefined;
    }

    return db.table("cpu").where({ id: cpuEdge.targetId }).first();
  }, [buildId]);

  const buildMobo: MoboSchema | undefined = undefined;

  return (
    <Div.Container>
      <nav className={classNames.nav}>
        <button className={classNames.backButton}>Back</button>
        <h1>Edit build</h1>
        <span>Build Price</span>
        <span>$900</span>
      </nav>
      <Div.Sidebar>
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
        <div key="cpu" className={classNames.labelledControl}>
          <label>CPU</label>
          <button
            className={cx(
              classNames,
              "button",
              activeTable === "cpu" && "activeControl"
            )}
            onClick={() => setActiveTable("cpu")}
            type="button"
          >
            {buildCpu?.name || "<No CPU set>"}
          </button>
        </div>
      </Div.Sidebar>
      <Div.Content>
        {activeTable === null && (
          <div className={classNames.emptyStateText}>
            Select a component to add to the build
          </div>
        )}
        {activeTable === "cpu" && (
          <ComparisonTable
            dataStoreName="cpu"
            dataStoreLabel="CPUs"
            columns={CpuColumns}
            getIsBuildCompatible={(row) => {
              // return buildMobo ? row.socket === buildMobo.socket : true;
              return row.socket === "AM5";
            }}
            onRemove={async (cpuId) => {
              await db.transaction("rw", ["edges"], async (tx) => {
                await tx
                  .table("edges")
                  .where({
                    sourceId: buildId,
                    sourceType: "build",
                    targetType: "cpu",
                    targetId: cpuId,
                  })
                  .delete();
              });
            }}
            onSelect={async (cpuId) => {
              await db.transaction("rw", ["edges"], async (tx) => {
                await tx
                  .table("edges")
                  .where({
                    sourceId: buildId,
                    sourceType: "build",
                    targetType: "cpu",
                  })
                  .delete();

                await tx.table("edges").add({
                  sourceId: buildId,
                  sourceType: "build",
                  targetId: cpuId,
                  targetType: "cpu",
                });
              });
            }}
            selectedRowId={buildCpu?.id}
          />
        )}
      </Div.Content>
    </Div.Container>
  );
};
