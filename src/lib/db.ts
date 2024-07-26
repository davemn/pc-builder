import { DexieStub } from "./query";

const DATABASE_NAME = "PCBuilder";

export type StoreName =
  | "edges"
  | "build"
  | "buildGroup"
  | "cpu"
  | "gpu"
  | "ram"
  | "m2Storage"
  | "sataStorage"
  | "psu"
  | "mobo"
  | "cooler";

export interface EdgeSchema<
  T extends StoreName = StoreName,
  U extends StoreName = StoreName
> {
  id: number;
  sourceId: number;
  sourceType: T;
  targetId: number;
  targetType: U;
}

export interface BuildSchema {
  id: number;
  name: string;
  price: number;
}

export interface BuildGroupSchema {
  id: number;
  name: string;
}

export interface CpuSchema {
  id: number;
  brand: string;
  name: string;
  price: number;
  socket: string;
  cores: number;
  cache: number;
  baseClock: number;
  boostClock: number;
  tdp: number;
}

export interface GpuSchema {
  id: number;
  brand: string;
  name: string;
  price: number;
  vram: number;
  tdp: number;
  wattage: number;
  hdmiOutputs: number;
  displayPortOutputs: number;
}

export interface RamSchema {
  id: number;
  brand: string;
  name: string;
  price: number;
  capacity: number;
  speed: number;
  type: string;
}

export interface M2StorageSchema {
  id: number;
  brand: string;
  name: string;
  price: number;
  capacity: number;
  moduleCode: string; // e.g. 2280, 22110
  moduleKey: string; // M, B
  interface: string; // e.g. PCIe, SATA
  pcieVersion: string; // optional, empty when interface is SATA
  readSpeed: number;
  writeSpeed: number;
}

export interface SataStorageSchema {
  id: number;
  brand: string;
  name: string;
  price: number;
  capacity: number;
  formFactor: string; // 2.5", 3.5"
  readSpeed: number;
  writeSpeed: number;
}

export interface PsuSchema {
  id: number;
  brand: string;
  name: string;
  price: number;
  sustainedWattage: number;
  peakWattage: number;
  atxVersion: string;
  efficiencyRating: string;
}

export interface MoboSchema {
  id: number;
  brand: string;
  name: string;
  price: number;
  socket: string;
  formFactor: string;
  ramSlots: number;
  ramType: string;
  // TODO add MoboM2SlotSchema w/ boolean fields for each supported M.2 module length, PCIe version, PCIe lanes, M.2 key type (M, B)
  m2Slots: number;
  usb40Ports: number;
  usb20Ports: number;
  usb10Ports: number;
  usb5Ports: number;
  usbSlowPorts: number;
  ethernetGigabitRate: number;
  pcie5x16Slots: number;
  pcie5x8Slots: number;
  pcie5x4Slots: number;
  pcie5x2Slots: number;
  pcie5x1Slots: number;
  pcie4x16Slots: number;
  pcie4x8Slots: number;
  pcie4x4Slots: number;
  pcie4x2Slots: number;
  pcie4x1Slots: number;
  pcie3x16Slots: number;
  pcie3x8Slots: number;
  pcie3x4Slots: number;
  pcie3x2Slots: number;
  pcie3x1Slots: number;
  sata6GbpsPorts: number;
}

// TODO split CoolerSchema into separate schemas for each type
// maxCounts() can then be based on e.g. assigned M.2 SSDs or RAM sticks
export interface CoolerSchema {
  id: number;
  brand: string;
  name: string;
  price: number;
  /* TODO type was meant to be "water" | "air", but might be better used for
   * "gpu" | "cpu" | "ram" | "ssd" | "case" to separate cooling requirements
   * for different components.
   */
  type: string;
  size: string;
  fanDiameter: number;
  coolingWatts: number;
  compatibility: Array<string>;
  // TODO fan count, noise level
  // TODO split size into separate dimensions
}

export type Schema<T extends StoreName> = {
  edges: EdgeSchema;
  build: BuildSchema;
  buildGroup: BuildGroupSchema;
  cpu: CpuSchema;
  gpu: GpuSchema;
  ram: RamSchema;
  m2Storage: M2StorageSchema;
  sataStorage: SataStorageSchema;
  psu: PsuSchema;
  mobo: MoboSchema;
  cooler: CoolerSchema;
}[T];

export class BrowserDatabase extends DexieStub {
  constructor() {
    super(DATABASE_NAME);
    this.version(1).stores({
      // friends: "++id, name, age", // Primary key and indexed props
      edges: "++id, sourceId, sourceType, targetId, targetType",
      // build: "++id, name, cpu, gpu, ram, *storage, psu, mobo, cooler, case",
      build: "++id, name",
      cpu: "++id, brand, name, price, socket, cores, cache, baseClock, boostClock, tdp",
      gpu: "++id, brand, name, price, vram, tdp, hdmiOutputs, displayPortOutputs",
      ram: "++id, brand, name, price, capacity, speed, type",
      storage:
        "++id, brand, name, price, capacity, formFactor, interface, readSpeed, writeSpeed",
      psu: "++id, brand, name, price, wattage, atxVersion, efficiencyRating",
      mobo: "++id, brand, name, price, socket, formFactor, ramSlots, ramType, pcieSlots, pcieVersion, m2Slots, usb40Ports, usb20Ports, usb10Ports, usb5Ports, usbSlowPorts, ethernetGigabitRate",
      cooler: "++id, brand, name, price, type, size, fanDiameter",
      // TODO other component types:
      // case: "++id, brand, name, price, formFactor, frontUsbPorts, frontAudioPorts, driveBays, maxGpuLength, maxCpuCoolerHeight, maxPsuLength, maxRadiatorLength, maxRadiatorWidth, maxRadiatorHeight, maxFanLength, maxFanWidth, maxFanHeight, maxFanCount, maxDustFilterCount",
      // nvmeCarrierCard: "++id, brand, name, price, type, pcieVersion, m2Slots",
      // rgbLighting: "++id, brand, name, price, type, color, brightness",
      // soundCard: "++id, brand, name, price, type, spdifOutputs, spdifInputs, line35mmOutputs, headphone35mmOutputs, microphone35mmInputs"
      // monitor: "++id, brand, name, price, resolution, refreshRate, panelType, responseTime, aspectRatio, size, vesaMount, hdmiInputs, displayPortInputs, usbPorts, speakers, freesync, gsync, curved, color, brightness, contrast, viewingAngle, powerConsumption, weight, height, width, depth",
    });
    this.version(2)
      .stores({
        build: "++id, name, price",
      })
      .upgrade((tx) => {
        return tx
          .table<BuildSchema>("build")
          .toCollection()
          .modify((build) => {
            build.price = 0;
          });
      });
    this.version(3)
      .stores({
        buildGroup: "++id, name",
      })
      .upgrade(async (tx) => {
        const buildGroupId = await tx
          .table<Omit<BuildGroupSchema, "id">>("buildGroup")
          .add({
            name: "Desktop",
          });

        const existingBuilds = await tx.table<BuildSchema>("build").toArray();

        for (const build of existingBuilds) {
          tx.table<Omit<EdgeSchema, "id">>("edges").add({
            sourceId: buildGroupId,
            sourceType: "buildGroup",
            targetId: build.id,
            targetType: "build",
          });
        }
      });
    this.version(4).stores({
      // add coolingWatts
      cooler: "++id, brand, name, price, type, size, fanDiameter, coolingWatts",
    });
    this.version(5)
      .stores({
        // wattage -> sustainedWattage
        // add peakWattage
        psu: "++id, brand, name, price, sustainedWattage, peakWattage, atxVersion, efficiencyRating",
        // add wattage
        gpu: "++id, brand, name, price, vram, tdp, wattage, hdmiOutputs, displayPortOutputs",
        // (pcieSlots, pcieVersion) -> pcie5x16Slots, pcie5x8Slots, pcie5x4Slots, pcie5x2Slots, pcie5x1Slots, pcie4x16Slots, pcie4x8Slots, pcie4x4Slots, pcie4x2Slots, pcie4x1Slots, pcie3x16Slots, pcie3x8Slots, pcie3x4Slots, pcie3x2Slots, pcie3x1Slots
        mobo: "++id, brand, name, price, socket, formFactor, ramSlots, ramType, m2Slots, usb40Ports, usb20Ports, usb10Ports, usb5Ports, usbSlowPorts, ethernetGigabitRate, pcie5x16Slots, pcie5x8Slots, pcie5x4Slots, pcie5x2Slots, pcie5x1Slots, pcie4x16Slots, pcie4x8Slots, pcie4x4Slots, pcie4x2Slots, pcie4x1Slots, pcie3x16Slots, pcie3x8Slots, pcie3x4Slots, pcie3x2Slots, pcie3x1Slots",
      })
      .upgrade(async (tx) => {
        // At the time of this upgrade only the motherboard table actually has any data in it
        return tx
          .table<
            MoboSchema & {
              pcieSlots?: number;
              pcieVersion?: string;
            }
          >("mobo")
          .toCollection()
          .modify((mobo) => {
            delete mobo.pcieSlots;
            delete mobo.pcieVersion;
          });
      });
    this.version(6).stores({
      // add compatibility
      cooler:
        "++id, brand, name, price, type, size, fanDiameter, coolingWatts, compatibility",
    });
    this.version(7)
      .stores({
        // add sata6GbpsPorts
        mobo: "++id, brand, name, price, socket, formFactor, ramSlots, ramType, m2Slots, usb40Ports, usb20Ports, usb10Ports, usb5Ports, usbSlowPorts, ethernetGigabitRate, pcie5x16Slots, pcie5x8Slots, pcie5x4Slots, pcie5x2Slots, pcie5x1Slots, pcie4x16Slots, pcie4x8Slots, pcie4x4Slots, pcie4x2Slots, pcie4x1Slots, pcie3x16Slots, pcie3x8Slots, pcie3x4Slots, pcie3x2Slots, pcie3x1Slots, sata6GbpsPorts",
      })
      .upgrade(async (tx) => {
        // At the time of this upgrade only the motherboard table actually has any data in it
        return tx
          .table<MoboSchema>("mobo")
          .toCollection()
          .modify((mobo) => {
            mobo.sata6GbpsPorts = 0;
          });
      });
    this.version(8).stores({
      // remove storage schema
      storage: null,
      // add m2Storage, sataStorage schemas
      m2Storage:
        "++id, brand, name, price, capacity, moduleCode, moduleKey, interface, pcieVersion, readSpeed, writeSpeed",
      sataStorage:
        "++id, brand, name, price, capacity, formFactor, readSpeed, writeSpeed",
    });
  }
}

export const db = new BrowserDatabase();
