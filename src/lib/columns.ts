import { Schema, StoreName } from "lib/db";

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

export interface ColumnDefinition<T extends StoreName> {
  label: string;
  // plain "keyof" becomes "string | number | symbol", per https://stackoverflow.com/a/65420892
  name: Extract<keyof Schema<T>, string>;
  unit: UnitDefinition;
}

export const Unit: Record<string, UnitDefinition> = {
  WATTS: {
    dataType: "numeric",
    format: (value: number) => `${value} W`,
    // getBest: (a: number, b: number) => Math.min(a, b),
    compareQuality: QualityFn.LESS_IS_BETTER,
  },
  DOLLARS: {
    dataType: "numeric",
    format: (value: number) => `$${Math.ceil(value)}`,
    // getBest: (a: number, b: number) => Math.min(a, b),
    compareQuality: QualityFn.LESS_IS_BETTER,
  },
  GIGABYTES: {
    dataType: "numeric",
    format: (value: number) => `${value} Gb`,
    compareQuality: QualityFn.MORE_IS_BETTER,
  },
  GIGAHERTZ: {
    dataType: "numeric",
    format: (value: number) => `${value} GHz`,
    compareQuality: QualityFn.MORE_IS_BETTER,
  },
  MEGABYTES: {
    dataType: "numeric",
    format: (value: number) => `${value} Mb`,
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

export const BuildColumns: Array<ColumnDefinition<"build">> = [
  { label: "Name", name: "name", unit: Unit.NONE },
];

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
