import { useLiveQuery } from "dexie-react-hooks";

import { ComparisonTable } from "components/ComparisonTable";
import { BuildColumns } from "lib/columns";
import { BuildSchema, db } from "lib/db";
import { BuildsPageProps, NavigateProp } from "lib/page";

import classNames from "./BuildsPage.module.css";

type Props = BuildsPageProps & {
  navigate: NavigateProp;
};

export const BuildsPage = (props: Props) => {
  const { navigate } = props;

  const builds = useLiveQuery(
    () => db.table("build").toCollection().sortBy("name"),
    []
  );

  return (
    <div className={classNames.container}>
      <ComparisonTable
        dataStoreName="build"
        dataStoreLabel="Builds"
        columns={BuildColumns}
        getIsBuildCompatible={() => true}
        onEditSelected={(previousRow: BuildSchema, row: BuildSchema) => {
          throw new Error("Function not implemented.");
        }}
        onRemove={(row: BuildSchema) => {
          throw new Error("Function not implemented.");
        }}
        onSelect={(prevSelectedBuild, selectedBuild) => {
          navigate("editBuild", { buildId: selectedBuild.id });
        }}
        style={{
          minWidth: 800,
        }}
      />
    </div>
  );
};
