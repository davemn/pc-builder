import Dexie, { Table } from "dexie";

const DATABASE_NAME = "PCBuilder";

export type StoreName =
  | "edges"
  | "build"
  | "buildGroup"
  | "cpu"
  | "gpu"
  | "ram"
  | "storage"
  | "psu"
  | "mobo"
  | "cooler";

export interface EdgeSchema {
  id: number;
  sourceId: number;
  sourceType: StoreName;
  targetId: number;
  targetType: StoreName;
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

export interface StorageSchema {
  id: number;
  brand: string;
  name: string;
  price: number;
  capacity: number;
  formFactor: string;
  interface: string;
  readSpeed: number;
  writeSpeed: number;
}

export interface PsuSchema {
  id: number;
  brand: string;
  name: string;
  price: number;
  wattage: number;
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
  pcieSlots: number;
  pcieVersion: string;
  m2Slots: number;
  usb40Ports: number;
  usb20Ports: number;
  usb10Ports: number;
  usb5Ports: number;
  usbSlowPorts: number;
  ethernetGigabitRate: number;
  // TODO SATA ports
}

export interface CoolerSchema {
  id: number;
  brand: string;
  name: string;
  price: number;
  type: string;
  size: string;
  fanDiameter: number;
  // TODO TDP, Socket compatibility, fan count
  // TODO split size into separate dimensions
}

export type Schema<T extends StoreName> = {
  edges: EdgeSchema;
  build: BuildSchema;
  buildGroup: BuildGroupSchema;
  cpu: CpuSchema;
  gpu: GpuSchema;
  ram: RamSchema;
  storage: StorageSchema;
  psu: PsuSchema;
  mobo: MoboSchema;
  cooler: CoolerSchema;
}[T];

export class BrowserDatabase extends Dexie {
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
      // TODO customize these
      // case: "++id, brand, name, price, formFactor, frontUsbPorts, frontAudioPorts, driveBays, maxGpuLength, maxCpuCoolerHeight, maxPsuLength, maxRadiatorLength, maxRadiatorWidth, maxRadiatorHeight, maxFanLength, maxFanWidth, maxFanHeight, maxFanCount, maxDustFilterCount",
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
  }
}

export const db = new BrowserDatabase();
