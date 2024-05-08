import { BuildComponentStoreName } from "lib/build";
import { Schema } from "lib/db";

const QualityFn = {
  LESS_IS_BETTER: (a: number, b: number) => Math.sign(b - a),
  MORE_IS_BETTER: (a: number, b: number) => Math.sign(a - b),
};

export type UnitDefinition =
  | {
      dataType: "numeric";
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
  name: Extract<keyof Schema<T>, string>;
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
  DOLLARS: {
    dataType: "numeric",
    format: (value: number) => `$${Math.ceil(value)}`,
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

export const CpuColumns: Array<ColumnDefinition<"cpu">> = [
  { label: "Name", name: "name", unit: Unit.NONE },
  { label: "Brand", name: "brand", unit: Unit.NONE },
  { label: "Price", name: "price", unit: Unit.DOLLARS },
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
  { label: "Price", name: "price", unit: Unit.DOLLARS },
  { label: "VRAM", name: "vram", unit: Unit.GIGABYTES },
  { label: "TDP", name: "tdp", unit: Unit.WATTS },
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
  { label: "Price", name: "price", unit: Unit.DOLLARS },
  { label: "Capacity", name: "capacity", unit: Unit.GIGABYTES },
  { label: "Speed", name: "speed", unit: Unit.MEGATRANSFERS_PER_SECOND },
  { label: "Type", name: "type", unit: Unit.NONE },
];

export const StorageColumns: Array<ColumnDefinition<"storage">> = [
  { label: "Name", name: "name", unit: Unit.NONE },
  { label: "Brand", name: "brand", unit: Unit.NONE },
  { label: "Price", name: "price", unit: Unit.DOLLARS },
  { label: "Capacity", name: "capacity", unit: Unit.TERABYTES },
  { label: "Form Factor", name: "formFactor", unit: Unit.NONE },
  { label: "Interface", name: "interface", unit: Unit.NONE },
  { label: "Read Speed", name: "readSpeed", unit: Unit.MEGABYTES_PER_SECOND },
  { label: "Write Speed", name: "writeSpeed", unit: Unit.MEGABYTES_PER_SECOND },
];

export const PsuColumns: Array<ColumnDefinition<"psu">> = [
  { label: "Name", name: "name", unit: Unit.NONE },
  { label: "Brand", name: "brand", unit: Unit.NONE },
  { label: "Price", name: "price", unit: Unit.DOLLARS },
  { label: "Wattage", name: "wattage", unit: Unit.WATTS },
  { label: "ATX Version", name: "atxVersion", unit: Unit.NONE },
  { label: "Efficiency Rating", name: "efficiencyRating", unit: Unit.NONE },
];

export const MoboColumns: Array<ColumnDefinition<"mobo">> = [
  { label: "Name", name: "name", unit: Unit.NONE },
  { label: "Brand", name: "brand", unit: Unit.NONE },
  { label: "Price", name: "price", unit: Unit.DOLLARS },
  { label: "Socket", name: "socket", unit: Unit.NONE },
  { label: "Form Factor", name: "formFactor", unit: Unit.NONE },
  { label: "RAM Slots", name: "ramSlots", unit: Unit.COUNT },
  { label: "RAM Type", name: "ramType", unit: Unit.NONE },
  { label: "PCIe Slots", name: "pcieSlots", unit: Unit.COUNT },
  { label: "PCIe Version", name: "pcieVersion", unit: Unit.NONE },
  { label: "M.2 Slots", name: "m2Slots", unit: Unit.COUNT },
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
  { label: "Price", name: "price", unit: Unit.DOLLARS },
  { label: "Watts of Cooling", name: "coolingWatts", unit: Unit.COOLING_WATTS },
  { label: "Type", name: "type", unit: Unit.NONE },
  { label: "Size", name: "size", unit: Unit.NONE },
  { label: "Fan Diameter", name: "fanDiameter", unit: Unit.MILLIMETERS },
];
