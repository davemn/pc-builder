import { BuildComponentStoreName } from "lib/build";
import { Schema } from "lib/db";
import { formatScaledPrice } from "lib/format";

/**
 * Sort an array by 1+ columns. Prefer using the database for handling sorting when possible.
 */
export function sortByMultiple<T>(
  data: Array<T>,
  sortBy: Array<{
    columnName: Extract<keyof T, string>;
    direction: "asc" | "desc";
  }>
) {
  if (sortBy.length === 0) {
    return [...data];
  }

  return [...data].sort((a, b) => {
    let i = 0;
    let curSort;

    while (i < sortBy.length) {
      curSort = sortBy[i];

      const aValue = a[curSort.columnName];
      const bValue = b[curSort.columnName];

      if (aValue < bValue) {
        return curSort.direction === "asc" ? -1 : 1;
      } else if (aValue > bValue) {
        return curSort.direction === "asc" ? 1 : -1;
      }

      i++;
    }

    return 0;
  });
}

const QualityFn = {
  LESS_IS_BETTER: (a: number, b: number) => Math.sign(b - a),
  MORE_IS_BETTER: (a: number, b: number) => Math.sign(a - b),
};

export type UnitDefinition =
  | {
      dataType: "numeric" | "currency";
      format: (value: number) => string;
      compareQuality: (a: number, b: number) => number;
    }
  | {
      dataType: "text";
      format: (value: string) => string;
    };

export interface ColumnDefinition<T extends BuildComponentStoreName> {
  label: string;
  // plain "keyof" becomes "string | number | symbol", per https://stackoverflow.com/a/65420892
  // "price" is the exception here because it's not actually a field on any schema, it's computed from the associated product link(s)
  name: Extract<keyof Schema<T>, string> | "price";
  unit: UnitDefinition;
}

export const Unit: Record<string, UnitDefinition> = {
  WATTS: {
    dataType: "numeric",
    format: (value: number) => `${value} W`,
    compareQuality: QualityFn.LESS_IS_BETTER,
  },
  COOLING_WATTS: {
    dataType: "numeric",
    format: (value: number) => `${value} W`,
    compareQuality: QualityFn.MORE_IS_BETTER,
  },
  CURRENCY: {
    dataType: "currency",
    format: (value: number) =>
      value === 0 ? "-" : `$${formatScaledPrice(value)}`,
    compareQuality: QualityFn.LESS_IS_BETTER,
  },
  MILLIMETERS: {
    dataType: "numeric",
    format: (value: number) => `${value} mm`,
    compareQuality: QualityFn.LESS_IS_BETTER,
  },
  TERABYTES: {
    dataType: "numeric",
    format: (value: number) => `${value} TB`,
    compareQuality: QualityFn.MORE_IS_BETTER,
  },
  GIGABYTES: {
    dataType: "numeric",
    format: (value: number) => `${value} GB`,
    compareQuality: QualityFn.MORE_IS_BETTER,
  },
  GIGABITS_PER_SECOND: {
    dataType: "numeric",
    format: (value: number) => `${value} Gb/s`,
    compareQuality: QualityFn.MORE_IS_BETTER,
  },
  GIGAHERTZ: {
    dataType: "numeric",
    format: (value: number) => `${value} GHz`,
    compareQuality: QualityFn.MORE_IS_BETTER,
  },
  MEGABYTES: {
    dataType: "numeric",
    format: (value: number) => `${value} MB`,
    compareQuality: QualityFn.MORE_IS_BETTER,
  },
  MEGABYTES_PER_SECOND: {
    dataType: "numeric",
    format: (value: number) => `${value} MB/s`,
    compareQuality: QualityFn.MORE_IS_BETTER,
  },
  MEGATRANSFERS_PER_SECOND: {
    dataType: "numeric",
    format: (value: number) => `${value} MT/s`,
    compareQuality: QualityFn.MORE_IS_BETTER,
  },
  COUNT: {
    dataType: "numeric",
    format: (value: number) => `${value}x`,
    compareQuality: QualityFn.MORE_IS_BETTER,
  },
  NONE: {
    dataType: "text",
    format: (value: string) => value,
  },
};

export function isDerivedColumn<T extends BuildComponentStoreName>(
  componentType: T,
  column: ColumnDefinition<T>
) {
  return column.name === "price";
}

export const CpuColumns: Array<ColumnDefinition<"cpu">> = [
  { label: "Name", name: "name", unit: Unit.NONE },
  { label: "Brand", name: "brand", unit: Unit.NONE },
  { label: "Price", name: "price", unit: Unit.CURRENCY },
  { label: "Socket", name: "socket", unit: Unit.NONE },
  { label: "Cores", name: "cores", unit: Unit.COUNT },
  { label: "Cache", name: "cache", unit: Unit.MEGABYTES },
  { label: "Base Clock", name: "baseClock", unit: Unit.GIGAHERTZ },
  { label: "Boost Clock", name: "boostClock", unit: Unit.GIGAHERTZ },
  { label: "TDP", name: "tdp", unit: Unit.WATTS },
];

export const GpuColumns: Array<ColumnDefinition<"gpu">> = [
  { label: "Name", name: "name", unit: Unit.NONE },
  { label: "Brand", name: "brand", unit: Unit.NONE },
  { label: "Price", name: "price", unit: Unit.CURRENCY },
  { label: "VRAM", name: "vram", unit: Unit.GIGABYTES },
  { label: "Wattage", name: "wattage", unit: Unit.WATTS },
  { label: "TDP", name: "tdp", unit: Unit.COOLING_WATTS },
  { label: "HDMI Outputs", name: "hdmiOutputs", unit: Unit.COUNT },
  {
    label: "DisplayPort Outputs",
    name: "displayPortOutputs",
    unit: Unit.COUNT,
  },
];

export const RamColumns: Array<ColumnDefinition<"ram">> = [
  { label: "Name", name: "name", unit: Unit.NONE },
  { label: "Brand", name: "brand", unit: Unit.NONE },
  { label: "Price", name: "price", unit: Unit.CURRENCY },
  { label: "Capacity", name: "capacity", unit: Unit.GIGABYTES },
  { label: "Speed", name: "speed", unit: Unit.MEGATRANSFERS_PER_SECOND },
  { label: "Type", name: "type", unit: Unit.NONE },
];

export const M2StorageColumns: Array<ColumnDefinition<"m2Storage">> = [
  { label: "Name", name: "name", unit: Unit.NONE },
  { label: "Brand", name: "brand", unit: Unit.NONE },
  { label: "Price", name: "price", unit: Unit.CURRENCY },
  { label: "Capacity", name: "capacity", unit: Unit.TERABYTES },
  { label: "Module Code", name: "moduleCode", unit: Unit.NONE },
  { label: "Key (M, B)", name: "moduleKey", unit: Unit.NONE },
  { label: "Interface (PCIe, SATA)", name: "interface", unit: Unit.NONE },
  { label: "PCIe Version", name: "pcieVersion", unit: Unit.NONE },
  { label: "Read Speed", name: "readSpeed", unit: Unit.MEGABYTES_PER_SECOND },
  { label: "Write Speed", name: "writeSpeed", unit: Unit.MEGABYTES_PER_SECOND },
];

export const SataStorageColumns: Array<ColumnDefinition<"sataStorage">> = [
  { label: "Name", name: "name", unit: Unit.NONE },
  { label: "Brand", name: "brand", unit: Unit.NONE },
  { label: "Price", name: "price", unit: Unit.CURRENCY },
  { label: "Capacity", name: "capacity", unit: Unit.TERABYTES },
  { label: "Form Factor", name: "formFactor", unit: Unit.NONE },
  { label: "Read Speed", name: "readSpeed", unit: Unit.MEGABYTES_PER_SECOND },
  { label: "Write Speed", name: "writeSpeed", unit: Unit.MEGABYTES_PER_SECOND },
];

export const PsuColumns: Array<ColumnDefinition<"psu">> = [
  { label: "Name", name: "name", unit: Unit.NONE },
  { label: "Brand", name: "brand", unit: Unit.NONE },
  { label: "Price", name: "price", unit: Unit.CURRENCY },
  { label: "Wattage (Sustained)", name: "sustainedWattage", unit: Unit.WATTS },
  { label: "Wattage (Peak)", name: "peakWattage", unit: Unit.WATTS },
  { label: "ATX Version", name: "atxVersion", unit: Unit.NONE },
  { label: "Efficiency Rating", name: "efficiencyRating", unit: Unit.NONE },
];

export const MoboColumns: Array<ColumnDefinition<"mobo">> = [
  { label: "Name", name: "name", unit: Unit.NONE },
  { label: "Brand", name: "brand", unit: Unit.NONE },
  { label: "Price", name: "price", unit: Unit.CURRENCY },
  { label: "Socket", name: "socket", unit: Unit.NONE },
  { label: "Form Factor", name: "formFactor", unit: Unit.NONE },
  { label: "RAM Slots", name: "ramSlots", unit: Unit.COUNT },
  { label: "RAM Type", name: "ramType", unit: Unit.NONE },

  { label: "PCIe 5.0 x16 Slots", name: "pcie5x16Slots", unit: Unit.COUNT },
  { label: "PCIe 4.0 x16 Slots", name: "pcie4x16Slots", unit: Unit.COUNT },
  { label: "PCIe 3.0 x16 Slots", name: "pcie3x16Slots", unit: Unit.COUNT },

  { label: "PCIe 5.0 x8 Slots", name: "pcie5x8Slots", unit: Unit.COUNT },
  { label: "PCIe 4.0 x8 Slots", name: "pcie4x8Slots", unit: Unit.COUNT },
  { label: "PCIe 3.0 x8 Slots", name: "pcie3x8Slots", unit: Unit.COUNT },

  { label: "PCIe 5.0 x4 Slots", name: "pcie5x4Slots", unit: Unit.COUNT },
  { label: "PCIe 4.0 x4 Slots", name: "pcie4x4Slots", unit: Unit.COUNT },
  { label: "PCIe 3.0 x4 Slots", name: "pcie3x4Slots", unit: Unit.COUNT },

  { label: "PCIe 5.0 x2 Slots", name: "pcie5x2Slots", unit: Unit.COUNT },
  { label: "PCIe 4.0 x2 Slots", name: "pcie4x2Slots", unit: Unit.COUNT },
  { label: "PCIe 3.0 x2 Slots", name: "pcie3x2Slots", unit: Unit.COUNT },

  { label: "PCIe 5.0 x1 Slots", name: "pcie5x1Slots", unit: Unit.COUNT },
  { label: "PCIe 4.0 x1 Slots", name: "pcie4x1Slots", unit: Unit.COUNT },
  { label: "PCIe 3.0 x1 Slots", name: "pcie3x1Slots", unit: Unit.COUNT },

  { label: "M.2 Sockets", name: "m2Slots", unit: Unit.COUNT },
  { label: "SATA 6.0 Gbps Ports", name: "sata6GbpsPorts", unit: Unit.COUNT },

  { label: "USB 40 GBps Slots", name: "usb40Ports", unit: Unit.COUNT },
  { label: "USB 20 GBps Slots", name: "usb20Ports", unit: Unit.COUNT },
  { label: "USB 10 GBps Slots", name: "usb10Ports", unit: Unit.COUNT },
  { label: "USB 5 GBps Slots", name: "usb5Ports", unit: Unit.COUNT },
  { label: "USB (Slow) Slots", name: "usbSlowPorts", unit: Unit.COUNT },
  {
    label: "Ethernet Gigabit Rate",
    name: "ethernetGigabitRate",
    unit: Unit.GIGABITS_PER_SECOND,
  },
];

export const CoolerColumns: Array<ColumnDefinition<"cooler">> = [
  { label: "Name", name: "name", unit: Unit.NONE },
  { label: "Brand", name: "brand", unit: Unit.NONE },
  { label: "Price", name: "price", unit: Unit.CURRENCY },
  { label: "Watts of Cooling", name: "coolingWatts", unit: Unit.COOLING_WATTS },
  { label: "Type", name: "type", unit: Unit.NONE },
  { label: "Size", name: "size", unit: Unit.NONE },
  { label: "Fan Diameter", name: "fanDiameter", unit: Unit.MILLIMETERS },
];
