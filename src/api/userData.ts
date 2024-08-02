import { ipcMain, app } from "electron";
import type { Knex as KnexNamespace } from "knex";

import { DatabaseMigration, DatabaseName, connectTo } from "../db";

interface IpcAction {
  type: string;
  body: { [key: string]: any };
}

interface IRow {
  [key: string]: string | number | null;
}

function snakeCaseToCamelCase(str: string) {
  return str.replace(/(_\w)/g, (m) => m[1].toUpperCase());
}

function camelCaseToSnakeCase(str: string) {
  // insert an underscore between adjacent characters with differing cases
  return str.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

const OutputRowMapper = {
  generic: (row: IRow) => {
    const output: IRow = {};
    for (const key in row) {
      output[snakeCaseToCamelCase(key)] = row[key];
    }
    return output;
  },
  edges: (row: IRow) => {
    const outputRow: IRow = OutputRowMapper.generic(row);

    if ("sourceType" in outputRow && typeof outputRow.sourceType === "string") {
      outputRow.sourceType = snakeCaseToCamelCase(outputRow.sourceType);
    }

    if ("targetType" in outputRow && typeof outputRow.targetType === "string") {
      outputRow.targetType = snakeCaseToCamelCase(outputRow.targetType);
    }

    return outputRow;
  },
};

const InputRowMapper = {
  generic: (row: IRow) => {
    const inputRow: IRow = {};
    for (const key in row) {
      inputRow[camelCaseToSnakeCase(key)] = row[key];
    }
    return inputRow;
  },
  edges: (row: IRow) => {
    const inputRow: IRow = InputRowMapper.generic(row);

    if ("source_type" in inputRow && typeof inputRow.source_type === "string") {
      inputRow.source_type = camelCaseToSnakeCase(inputRow.source_type);
    }

    if ("target_type" in inputRow && typeof inputRow.target_type === "string") {
      inputRow.target_type = camelCaseToSnakeCase(inputRow.target_type);
    }

    return inputRow;
  },
};

export class UserDataModel {
  static initMain() {
    if (!ipcMain || !app) {
      throw new Error("Only call initMain in the main process.");
    }

    return new UserDataModel();
  }

  constructor() {
    if (ipcMain && app) {
      ipcMain.handle("UserDataModel:dispatch", (event, action: IpcAction) => {
        const { type, body } = action;

        if (Object.getPrototypeOf(this).hasOwnProperty(type)) {
          const methodName = type as keyof UserDataModel;
          if (typeof this[methodName] === "function") {
            return this[methodName]({ ...body });
          }
        }

        throw new Error(`Unknown action type: ${type}`);
      });
    }
  }

  // Add new methods here, no other boilerplate in main / preload needed

  /** @deprecated */
  async getAllBuildComponentsOfType({ dataStoreName }: IpcAction["body"]) {
    const db = await connectTo(DatabaseName.USER_DATA);
    // TODO enforce that dataStoreName is one of the component tables only
    const tableName = camelCaseToSnakeCase(dataStoreName);

    const rows = await db(tableName).select("*");
    return rows.map(OutputRowMapper.generic);
  }

  async addBuildGroup({ name }: IpcAction["body"]) {
    const db = await connectTo(DatabaseName.USER_DATA);
    const [newRow] = await db("build_group").insert({ name }).returning("id");
    return newRow.id;
  }

  async getAllBuildGroups() {
    const db = await connectTo(DatabaseName.USER_DATA);
    const rows = await db("build_group").select("*");
    return rows.map(OutputRowMapper.generic);
  }

  async getBuildsWhere(rawConditions: IRow) {
    const db = await connectTo(DatabaseName.USER_DATA);

    const conditions = InputRowMapper.generic(rawConditions);
    // TODO support WHERE IN clauses

    const rows = await db("build").where(conditions).select("*");
    return rows.map(OutputRowMapper.generic);
  }

  async getEdgesWhere(rawConditions: IRow) {
    const db = await connectTo(DatabaseName.USER_DATA);

    // Rewrite where clause keys (and some values) to snake_case
    const conditions = InputRowMapper.edges(rawConditions);
    // TODO support WHERE IN clauses

    const rows = await db("edge").where(conditions).select("*");
    return rows.map(OutputRowMapper.edges);
  }

  async getComponentsWhere({
    tableName: rawTableName,
    conditions: rawConditions,
  }: IpcAction["body"]) {
    const tableName = camelCaseToSnakeCase(rawTableName);

    if (
      ![
        "cpu",
        "gpu",
        "ram",
        "m2_storage",
        "sata_storage",
        "psu",
        "mobo",
        "cooler",
      ].includes(tableName)
    ) {
      throw new Error(`Invalid table name: "${tableName}"`);
    }

    const db = await connectTo(DatabaseName.USER_DATA);

    const conditions = InputRowMapper.generic(rawConditions);

    let query = db(tableName);
    let isFirstWhereClause = true;

    for (const [key, value] of Object.entries(conditions)) {
      if (Array.isArray(value)) {
        if (isFirstWhereClause) {
          query = query.where(key, "in", value);
          isFirstWhereClause = false;
        } else {
          query = query.andWhere(key, "in", value);
        }
      } else {
        if (isFirstWhereClause) {
          query = query.where(key, value);
          isFirstWhereClause = false;
        } else {
          query = query.andWhere(key, value);
        }
      }
    }

    const rows = await query.select("*");

    return rows.map(OutputRowMapper.generic);
  }
}

export const migrations: Array<DatabaseMigration> = [
  {
    name: "initial",
    up: async (knex: KnexNamespace) => {
      await knex.schema.createTable("edge", (table) => {
        table.increments("id").primary();
        table.integer("source_id").notNullable();
        table.string("source_type").notNullable();
        table.integer("target_id").notNullable();
        table.string("target_type").notNullable();
      });

      await knex.schema.createTable("build", (table) => {
        table.increments("id").primary();
        table.string("name").notNullable();
        table.integer("price").notNullable();
      });

      await knex.schema.createTable("build_group", (table) => {
        table.increments("id").primary();
        table.string("name").notNullable();
      });

      await knex.schema.createTable("cpu", (table) => {
        table.increments("id").primary();
        table.string("brand").notNullable();
        table.string("name").notNullable();
        table.integer("price").notNullable();
        table.string("socket").notNullable();
        table.integer("cores").notNullable();
        table.integer("cache").notNullable();
        table.integer("base_clock").notNullable();
        table.integer("boost_clock").notNullable();
        table.integer("tdp").notNullable();
      });

      await knex.schema.createTable("gpu", (table) => {
        table.increments("id").primary();
        table.string("brand").notNullable();
        table.string("name").notNullable();
        table.integer("price").notNullable();
        table.integer("vram").notNullable();
        table.integer("tdp").notNullable();
        table.integer("wattage").notNullable();
        table.integer("hdmi_outputs").notNullable();
        table.integer("display_port_outputs").notNullable();
      });

      await knex.schema.createTable("ram", (table) => {
        table.increments("id").primary();
        table.string("brand").notNullable();
        table.string("name").notNullable();
        table.integer("price").notNullable();
        table.integer("capacity").notNullable();
        table.integer("speed").notNullable();
        table.string("type").notNullable();
      });

      await knex.schema.createTable("m2_storage", (table) => {
        table.increments("id").primary();
        table.string("brand").notNullable();
        table.string("name").notNullable();
        table.integer("price").notNullable();
        table.integer("capacity").notNullable();
        table.string("module_code").notNullable();
        table.string("module_key").notNullable();
        table.string("interface").notNullable();
        table.string("pcie_version").notNullable();
        table.integer("read_speed").notNullable();
        table.integer("write_speed").notNullable();
      });

      await knex.schema.createTable("sata_storage", (table) => {
        table.increments("id").primary();
        table.string("brand").notNullable();
        table.string("name").notNullable();
        table.integer("price").notNullable();
        table.integer("capacity").notNullable();
        table.string("form_factor").notNullable();
        table.integer("read_speed").notNullable();
        table.integer("write_speed").notNullable();
      });

      await knex.schema.createTable("psu", (table) => {
        table.increments("id").primary();
        table.string("brand").notNullable();
        table.string("name").notNullable();
        table.integer("price").notNullable();
        table.integer("sustained_wattage").notNullable();
        table.integer("peak_wattage").notNullable();
        table.string("atx_version").notNullable();
        table.string("efficiency_rating").notNullable();
      });

      // TODO redo mobo
      await knex.schema.createTable("mobo", (table) => {
        table.increments("id").primary();
        table.string("brand").notNullable();
        table.string("name").notNullable();
        table.integer("price").notNullable();
        table.string("socket").notNullable();
        table.string("form_factor").notNullable();
        table.integer("ram_slots").notNullable();
        table.string("ram_type").notNullable();
        table.integer("m2_slots").notNullable();
        table.integer("usb_40_ports").notNullable();
        table.integer("usb_20_ports").notNullable();
        table.integer("usb_10_ports").notNullable();
        table.integer("usb_5_ports").notNullable();
        table.integer("usb_slow_ports").notNullable();
        table.integer("ethernet_gigabit_rate").notNullable();
        table.integer("pcie_5_x16_slots").notNullable();
        table.integer("pcie_5_x8_slots").notNullable();
        table.integer("pcie_5_x4_slots").notNullable();
        table.integer("pcie_5_x2_slots").notNullable();
        table.integer("pcie_5_x1_slots").notNullable();
        table.integer("pcie_4_x16_slots").notNullable();
        table.integer("pcie_4_x8_slots").notNullable();
        table.integer("pcie_4_x4_slots").notNullable();
        table.integer("pcie_4_x2_slots").notNullable();
        table.integer("pcie_4_x1_slots").notNullable();
        table.integer("pcie_3_x16_slots").notNullable();
        table.integer("pcie_3_x8_slots").notNullable();
        table.integer("pcie_3_x4_slots").notNullable();
        table.integer("pcie_3_x2_slots").notNullable();
        table.integer("pcie_3_x1_slots").notNullable();
        table.integer("sata_6_gbps_ports").notNullable();
      });

      await knex.schema.createTable("cooler", (table) => {
        table.increments("id").primary();
        table.string("brand").notNullable();
        table.string("name").notNullable();
        table.integer("price").notNullable();
        table.string("type").notNullable();
        table.string("size").notNullable();
        table.integer("fan_diameter").notNullable();
        table.integer("cooling_watts").notNullable();
        table.json("compatibility").notNullable().defaultTo("[]");
      });
    },
    down: async (knex: KnexNamespace) => {},
  },
];
