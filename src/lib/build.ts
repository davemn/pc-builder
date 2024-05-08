import {
  ColumnDefinition,
  CoolerColumns,
  CpuColumns,
  GpuColumns,
  MoboColumns,
  PsuColumns,
  RamColumns,
  StorageColumns,
} from "lib/columns";
import {
  BuildGroupSchema,
  BuildSchema,
  EdgeSchema,
  Schema,
  StoreName,
} from "lib/db";

export type BuildComponentStoreName = Exclude<
  StoreName,
  "edges" | "build" | "buildGroup"
>;

/** Unused. */
export type BuildComponentEdgeSchema = EdgeSchema<
  "build",
  BuildComponentStoreName
>;

/** Unused. */
export function edgeIsBuildComponent(
  edge: EdgeSchema
): edge is BuildComponentEdgeSchema {
  return (
    edge.sourceType === "build" &&
    !["edges", "build", "buildGroup"].includes(edge.targetType)
  );
}

export type ExtendedBuildSchema = BuildSchema & {
  components: {
    [T in BuildComponentStoreName]: Array<Schema<T> & { edgeId: number }>;
  };
};

export type ExtendedBuildGroupSchema = BuildGroupSchema & {
  builds: Array<BuildSchema>;
};

// Be careful when adding new component types, the Typescript compiler doesn't enforce
// that every store name is included in this array
export const OrderedBuildComponentStoreNames: Array<BuildComponentStoreName> = [
  "cpu",
  "gpu",
  "mobo",
  "ram",
  "storage",
  "psu",
  "cooler",
];

export interface BuildComponentDefinition<T extends BuildComponentStoreName> {
  singularName: string;
  pluralName: string;
  columns: Array<ColumnDefinition<T>>;
  getIsBuildCompatible: (
    component: Schema<T>,
    build: ExtendedBuildSchema
  ) => boolean;
}

// From https://stackoverflow.com/a/51691257
type Distribute<T> = T extends BuildComponentStoreName
  ? BuildComponentDefinition<T>
  : never;

export type AnyBuildComponentDefinition = Distribute<BuildComponentStoreName>;

type BuildComponentRecord = {
  [key in BuildComponentStoreName]: BuildComponentDefinition<key>;
};

function columnStringEquals(colA: string, colB: string) {
  return (
    colA.toLowerCase().replace(/[^a-z0-9]/g, "") ===
    colB.toLowerCase().replace(/[^a-z0-9]/g, "")
  );
}

export const BuildComponentMeta: BuildComponentRecord = {
  cpu: {
    singularName: "CPU",
    pluralName: "CPUs",
    columns: CpuColumns,
    getIsBuildCompatible: (component, build) => {
      const [assignedMobo] = build.components.mobo;
      if (
        assignedMobo &&
        !columnStringEquals(assignedMobo.socket, component.socket)
      ) {
        return false;
      }
      const cpuCooler = build.components.cooler.find(
        (cooler) => cooler.type === "cpu"
      );
      // TODO warning if cooler is above but too close to CPU's TDP, for overclocking headroom
      // Might need more fields on CpuSchema (boostTdp?)
      if (
        cpuCooler &&
        cpuCooler.coolingWatts > 0 && // TODO how to surface a partially specified component as having unknown compatibility?
        cpuCooler.coolingWatts < component.tdp
      ) {
        return false;
      }
      // TODO check power requirements
      return true;
    },
  },
  gpu: {
    singularName: "GPU",
    pluralName: "GPUs",
    columns: GpuColumns,
    getIsBuildCompatible: (component) => {
      return true;
    },
  },
  ram: {
    singularName: "RAM",
    pluralName: "RAM",
    columns: RamColumns,
    getIsBuildCompatible: (component) => {
      return true;
    },
  },
  storage: {
    singularName: "SSD",
    pluralName: "SSDs",
    columns: StorageColumns,
    getIsBuildCompatible: (component) => {
      return true;
    },
  },
  psu: {
    singularName: "Power Supply",
    pluralName: "Power Supplies",
    columns: PsuColumns,
    getIsBuildCompatible: (component) => {
      return true;
    },
  },
  mobo: {
    singularName: "Motherboard",
    pluralName: "Motherboards",
    columns: MoboColumns,
    getIsBuildCompatible: (component) => {
      return true;
    },
  },
  cooler: {
    singularName: "Cooler",
    pluralName: "Coolers",
    columns: CoolerColumns,
    getIsBuildCompatible: (component) => {
      return true;
    },
  },
};
