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
import { Schema, StoreName } from "lib/db";

export type BuildComponentStoreName = Exclude<StoreName, "edges" | "build">;

export interface BuildComponentDefinition<T extends BuildComponentStoreName> {
  singularName: string;
  pluralName: string;
  columns: Array<ColumnDefinition<T>>;
  getIsBuildCompatible: (component: Schema<T>) => boolean;
}

// From https://stackoverflow.com/a/51691257
type Distribute<T> = T extends BuildComponentStoreName
  ? BuildComponentDefinition<T>
  : never;

export type AnyBuildComponentDefinition = Distribute<BuildComponentStoreName>;

type BuildComponentRecord = {
  [key in BuildComponentStoreName]: BuildComponentDefinition<key>;
};

export const BuildComponentMeta: BuildComponentRecord = {
  cpu: {
    singularName: "CPU",
    pluralName: "CPUs",
    columns: CpuColumns,
    getIsBuildCompatible: (component) => {
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
