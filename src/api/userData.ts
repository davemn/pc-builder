import { ipcMain, app, contextBridge, ipcRenderer } from "electron";
import type { Knex as KnexNamespace } from "knex";

import { DatabaseMigration, DatabaseName, connectTo } from "../db";

interface IpcAction {
  type: string;
  body: { [key: string]: any };
}

interface IndexableClass {
  [key: string]: any;
}

const GET_ALL_BUILD_COMPONENTS_OF_TYPE_EVENT = "getAllBuildComponentsOfType";

export class UserDataModel {
  static initMain() {
    if (!ipcMain || !app) {
      throw new Error("Only call initMain in the main process.");
    }

    return new UserDataModel();
  }

  static initPreload() {
    contextBridge.exposeInMainWorld("UserDataModel", {
      dispatch: (action: any) =>
        ipcRenderer.invoke("UserDataModel:dispatch", action),

      getAllBuildComponentsOfType: (type: string) =>
        ipcRenderer.invoke(
          `UserDataModel:${GET_ALL_BUILD_COMPONENTS_OF_TYPE_EVENT}`,
          type
        ),
    });
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

      ipcMain.handle(
        `UserDataModel:${GET_ALL_BUILD_COMPONENTS_OF_TYPE_EVENT}`,
        (event, type) => this.getAllBuildComponentsOfType(type)
      );
    }
  }

  // Add new methods here, no other boilerplate in main / preload needed

  async getAllBuildComponentsOfType({ dataStoreName }: IpcAction["body"]) {
    const db = await connectTo(DatabaseName.USER_DATA);
    // TODO enforce that dataStoreName is one of the component tables only
    const rows = await db(dataStoreName).select("*");
    return rows;
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
