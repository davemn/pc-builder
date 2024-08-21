const DATABASE_NAME = "PCBuilder";

// TODO "edges" should be "edge" to match the schema & database
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
