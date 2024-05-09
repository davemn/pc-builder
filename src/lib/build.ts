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

function buildRequiredPower(
  build: ExtendedBuildSchema,
  excludeComponent?: BuildComponentStoreName
) {
  let baseWatts = 0,
    peakWatts = 0;

  if (excludeComponent !== "cpu") {
    baseWatts += build.components["cpu"][0]?.tdp ?? 0;
  }
  if (excludeComponent !== "gpu") {
    baseWatts += build.components["gpu"][0]?.wattage ?? 0;
  }
  // TODO cpu & ram. Power specs for those aren't usually listed though...

  // TODO calculate expected peak wattage
  peakWatts = baseWatts;

  return { baseWatts, peakWatts };
}

export const BuildComponentMeta: BuildComponentRecord = {
  cpu: {
    singularName: "CPU",
    pluralName: "CPUs",
    columns: CpuColumns,
    getIsBuildCompatible: (cpu, build) => {
      // (1) Check if CPU socket matches motherboard socket
      const [mobo] = build.components.mobo;
      if (mobo && cpu.socket && !columnStringEquals(mobo.socket, cpu.socket)) {
        return false;
      }

      // (2) Check if CPU TDP is within cooler's cooling capacity
      const cpuCooler = build.components.cooler.find(
        (cooler) => cooler.type === "cpu"
      );
      // TODO warning if cooler is above but too close to CPU's TDP, for overclocking headroom
      // Might need more fields on CpuSchema (boostTdp?)
      if (
        cpuCooler &&
        cpu.tdp > 0 &&
        cpuCooler.coolingWatts > 0 && // TODO how to surface a partially specified component as having unknown compatibility?
        cpuCooler.coolingWatts < cpu.tdp
      ) {
        return false;
      }

      // (3) Check if PSU wattage is sufficient
      const { baseWatts } = buildRequiredPower(build, "cpu");
      const [assignedPsu] = build.components.psu;

      if (
        assignedPsu &&
        cpu.tdp > 0 &&
        assignedPsu.sustainedWattage < baseWatts + cpu.tdp
      ) {
        return false;
      }

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
    getIsBuildCompatible: (psu, build) => {
      const { baseWatts, peakWatts } = buildRequiredPower(build);

      if (psu.sustainedWattage > 0 && psu.sustainedWattage < baseWatts) {
        return false;
      }
      if (psu.peakWattage > 0 && psu.peakWattage < peakWatts) {
        return false;
      }

      return true;
    },
  },
  mobo: {
    singularName: "Motherboard",
    pluralName: "Motherboards",
    columns: MoboColumns,
    getIsBuildCompatible: (mobo, build) => {
      const [cpu] = build.components.cpu;
      if (
        cpu &&
        cpu.socket &&
        mobo.socket &&
        !columnStringEquals(mobo.socket, cpu.socket)
      ) {
        return false;
      }

      return true;
    },
  },
  cooler: {
    singularName: "Cooler",
    pluralName: "Coolers",
    columns: CoolerColumns,
    getIsBuildCompatible: (cooler, build) => {
      switch (cooler.type) {
        case "cpu": {
          const cpu = build.components.cpu[0];
          if (
            cpu &&
            cpu.tdp > 0 &&
            cooler.coolingWatts > 0 &&
            cooler.coolingWatts < cpu.tdp
          ) {
            return false;
          }
          break;
        }
        default:
      }

      return true;
    },
  },
};
