import {
  ColumnDefinition,
  CoolerColumns,
  CpuColumns,
  GpuColumns,
  MoboColumns,
  PsuColumns,
  RamColumns,
  M2StorageColumns,
  SataStorageColumns,
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

export enum Compatibility {
  COMPATIBLE,
  INCOMPATIBLE,
  UNKNOWN,
}

// Be careful when adding new component types, the Typescript compiler doesn't enforce
// that every store name is included in this array
export const OrderedBuildComponentStoreNames: Array<BuildComponentStoreName> = [
  "cpu",
  "gpu",
  "mobo",
  "ram",
  "m2Storage",
  "sataStorage",
  "psu",
  "cooler",
];

export interface BuildComponentDefinition<T extends BuildComponentStoreName> {
  singularName: string;
  pluralName: string;
  columns: Array<ColumnDefinition<T>>;
  getCompatibilityChecks: (
    component: Schema<T>,
    build: ExtendedBuildSchema
  ) => Array<{
    componentType: BuildComponentStoreName;
    compatibility: Compatibility;
  }>;
  getMaxCount: (build: ExtendedBuildSchema) => number;
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

function columnArrayIncludes(colA: string[], colB: string) {
  return colA.some((col) => columnStringEquals(col, colB));
}

export function overallCompatibility(
  compatChecks: Array<{ compatibility: Compatibility }>
) {
  if (
    compatChecks.some(
      (check) => check.compatibility === Compatibility.INCOMPATIBLE
    )
  ) {
    return Compatibility.INCOMPATIBLE;
  }
  if (
    compatChecks.some((check) => check.compatibility === Compatibility.UNKNOWN)
  ) {
    return Compatibility.UNKNOWN;
  }
  return Compatibility.COMPATIBLE;
}

export const BuildComponentMeta: BuildComponentRecord = {
  cpu: {
    singularName: "CPU",
    pluralName: "CPUs",
    columns: CpuColumns,
    getCompatibilityChecks: (cpu, build) => {
      const compatChecks = [];

      // (1) Check if CPU socket matches motherboard socket
      const [mobo] = build.components.mobo;
      if (!mobo || !mobo.socket || !cpu.socket) {
        compatChecks.push({
          componentType: "mobo" as const,
          compatibility: Compatibility.UNKNOWN,
        });
      } else if (!columnStringEquals(mobo.socket, cpu.socket)) {
        compatChecks.push({
          componentType: "mobo" as const,
          compatibility: Compatibility.INCOMPATIBLE,
        });
      } else {
        compatChecks.push({
          componentType: "mobo" as const,
          compatibility: Compatibility.COMPATIBLE,
        });
      }

      return compatChecks;
    },
    getMaxCount: () => 1, // TODO multi-cpu builds
  },
  gpu: {
    // TODO nest singularName, pluralName into "strings", add strings.tooManyWarning, etc.
    singularName: "GPU",
    pluralName: "GPUs",
    columns: GpuColumns,
    getCompatibilityChecks: (gpu, build) => {
      const compatChecks = [];

      // (1) Check if motherboard has at least one PCIe x16 slot
      const [mobo] = build.components.mobo;
      if (!mobo) {
        compatChecks.push({
          componentType: "mobo" as const,
          compatibility: Compatibility.UNKNOWN,
        });
      } else if (BuildComponentMeta.gpu.getMaxCount(build) === 0) {
        compatChecks.push({
          componentType: "mobo" as const,
          compatibility: Compatibility.INCOMPATIBLE,
        });
      } else {
        compatChecks.push({
          componentType: "mobo" as const,
          compatibility: Compatibility.COMPATIBLE,
        });
      }

      // TODO check if GPU length fits in case (needs Case schema)

      return compatChecks;
    },
    getMaxCount: (build) => {
      const [mobo] = build.components.mobo;

      if (!mobo) {
        return -1;
      }

      const totalX16Slots =
        mobo.pcie5x16Slots + mobo.pcie4x16Slots + mobo.pcie3x16Slots;

      return totalX16Slots;
    },
  },
  ram: {
    singularName: "RAM",
    pluralName: "RAM",
    columns: RamColumns,
    getCompatibilityChecks: (ram, build) => {
      const compatChecks = [];

      const [mobo] = build.components.mobo;
      if (!mobo || !mobo.ramSlots || !mobo.ramType) {
        compatChecks.push({
          componentType: "mobo" as const,
          compatibility: Compatibility.UNKNOWN,
        });
      } else if (BuildComponentMeta.ram.getMaxCount(build) === 0) {
        compatChecks.push({
          componentType: "mobo" as const,
          compatibility: Compatibility.INCOMPATIBLE,
        });
      } else if (!columnStringEquals(mobo.ramType, ram.type)) {
        // DDR versions aren't backwards- or forwards-compatible
        compatChecks.push({
          componentType: "mobo" as const,
          compatibility: Compatibility.INCOMPATIBLE,
        });
      }

      return compatChecks;
    },
    getMaxCount: (build) => {
      const [mobo] = build.components.mobo;

      if (!mobo) {
        return -1;
      }

      return mobo.ramSlots;
    },
  },
  m2Storage: {
    singularName: "M.2 SSD",
    pluralName: "M.2 SSDs",
    columns: M2StorageColumns,
    getCompatibilityChecks: (m2Drive, build) => {
      const compatChecks = [];
      const [mobo] = build.components.mobo;

      if (!mobo) {
        compatChecks.push({
          componentType: "mobo" as const,
          compatibility: Compatibility.UNKNOWN,
        });
      } else if (BuildComponentMeta.m2Storage.getMaxCount(build) === 0) {
        compatChecks.push({
          componentType: "mobo" as const,
          compatibility: Compatibility.INCOMPATIBLE,
        });
      } else {
        compatChecks.push({
          componentType: "mobo" as const,
          compatibility: Compatibility.COMPATIBLE,
        });
      }

      return compatChecks;
    },
    getMaxCount: (build) => {
      const [mobo] = build.components.mobo;

      if (!mobo) {
        return -1;
      }

      return mobo.m2Slots;
    },
  },
  sataStorage: {
    singularName: "SATA SSD",
    pluralName: "SATA SSDs",
    columns: SataStorageColumns,
    getCompatibilityChecks: (sataDrive, build) => {
      const compatChecks = [];
      const [mobo] = build.components.mobo;

      if (!mobo) {
        compatChecks.push({
          componentType: "mobo" as const,
          compatibility: Compatibility.UNKNOWN,
        });
      } else if (BuildComponentMeta.sataStorage.getMaxCount(build) === 0) {
        compatChecks.push({
          componentType: "mobo" as const,
          compatibility: Compatibility.INCOMPATIBLE,
        });
      } else {
        compatChecks.push({
          componentType: "mobo" as const,
          compatibility: Compatibility.COMPATIBLE,
        });
      }

      return compatChecks;
    },
    getMaxCount: (build) => {
      const [mobo] = build.components.mobo;

      if (!mobo) {
        return -1;
      }

      return mobo.sata6GbpsPorts;
    },
  },
  psu: {
    singularName: "Power Supply",
    pluralName: "Power Supplies",
    columns: PsuColumns,
    getCompatibilityChecks: (psu, build) => {
      // TODO Check if PSU has enough & correct connectors for GPU(s), SATA SSDs, mobo, coolers, etc.
      return [];
    },
    getMaxCount: () => 1,
  },
  mobo: {
    singularName: "Motherboard",
    pluralName: "Motherboards",
    columns: MoboColumns,
    getCompatibilityChecks: (mobo, build) => {
      // TODO check case compatibility once CaseSchema has been added
      return [];
    },
    getMaxCount: () => 1,
  },
  cooler: {
    singularName: "Cooler",
    pluralName: "Coolers",
    columns: CoolerColumns,
    getCompatibilityChecks: (cooler, build) => {
      const compatChecks = [];

      switch (cooler.type) {
        case "cpu": {
          const cpu = build.components.cpu[0];

          // Check if CPU socket matches cooler compatibility list
          let socketCompatibility: Compatibility;

          if (!cpu || !cpu.socket || cooler.compatibility.length === 0) {
            socketCompatibility = Compatibility.UNKNOWN;
          } else if (!columnArrayIncludes(cooler.compatibility, cpu.socket)) {
            socketCompatibility = Compatibility.INCOMPATIBLE;
          } else {
            socketCompatibility = Compatibility.COMPATIBLE;
          }

          // Check if CPU TDP is within cooler's cooling capacity
          let coolerCompatibility: Compatibility;
          if (!cpu || !cpu.tdp || !cooler.coolingWatts) {
            coolerCompatibility = Compatibility.UNKNOWN;
          } else if (cooler.coolingWatts < cpu.tdp) {
            coolerCompatibility = Compatibility.INCOMPATIBLE;
          } else {
            coolerCompatibility = Compatibility.COMPATIBLE;
          }

          const socketAndCoolerCompatibility = overallCompatibility([
            { compatibility: socketCompatibility },
            { compatibility: coolerCompatibility },
          ]);

          compatChecks.push({
            componentType: "cpu" as const,
            compatibility: socketAndCoolerCompatibility,
          });

          break;
        }
        default:
        // TODO other cooler types: GPU, RAM, M.2 SSD, case fans
      }

      return compatChecks;
    },
    getMaxCount: () => -1,
  },
};

export function buildPowerSummary(build: ExtendedBuildSchema) {
  // Calculate consumption
  let baseWattsNeeded = 0,
    peakWattsNeeded = 0;

  baseWattsNeeded += build.components["cpu"][0]?.tdp ?? 0;
  baseWattsNeeded += build.components["gpu"][0]?.wattage ?? 0;
  // TODO cpu & ram. Power specs for those aren't usually listed though...

  // TODO calculate expected peak wattage (based on boost clock, etc.)
  peakWattsNeeded = baseWattsNeeded;

  // Calculate capacity
  const [assignedPsu] = build.components.psu;

  let baseWattsProvided = 0,
    peakWattsProvided = 0;

  if (assignedPsu) {
    baseWattsProvided = assignedPsu.sustainedWattage;
    peakWattsProvided = assignedPsu.peakWattage || baseWattsProvided;
  }

  return {
    baseCapacity: baseWattsProvided,
    peakCapacity: peakWattsProvided,
    expectedBaseConsumption: baseWattsNeeded,
    expectedPeakConsumption: peakWattsNeeded,
  };
}

export function buildCoolingSummary(build: ExtendedBuildSchema) {
  const cpuCooler = build.components.cooler.find(
    (cooler) => cooler.type === "cpu"
  );

  const gpuCooler = build.components.cooler.find(
    (cooler) => cooler.type === "gpu"
  );

  // Calculate consumption
  let baseCoolingNeeded = 0;

  // if they haven't added a custom CPU cooler to the build, assume that they're using the stock cooler
  // and it doesn't need to be factored into the cooling capacity
  if (cpuCooler) {
    baseCoolingNeeded += build.components["cpu"][0]?.tdp ?? 0;
    // TODO warning if cooler is above but too close to CPU's TDP, for overclocking headroom
    // Might need more fields on CpuSchema (boostTdp?)
  }
  // ... same for GPU cooler
  if (gpuCooler) {
    baseCoolingNeeded += build.components["gpu"].reduce(
      (acc, gpu) => acc + (gpu.tdp || gpu.wattage),
      0
    );
  }

  // Calculate capacity
  let baseCoolingProvided = 0;

  baseCoolingProvided += cpuCooler?.coolingWatts ?? 0;
  baseCoolingProvided += gpuCooler?.coolingWatts ?? 0;

  return {
    baseCapacity: baseCoolingProvided,
    expectedBaseConsumption: baseCoolingNeeded,
  };
}

// TODO function to generate list of build optimizations, like matching RAM speed to mobo, matching PCIe versions, etc.
