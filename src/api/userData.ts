import { ipcMain, app } from "electron";
import type { Knex as KnexNamespace } from "knex";

import { DatabaseMigration, DatabaseName, connectTo } from "../db";

interface IpcAction {
  type: string;
  body: { [key: string]: any };
}

interface IRow {
  [key: string]: string | number | boolean | string[] | number[] | null;
}

interface IOrderByColumn {
  columnName: string;
  direction: string;
}

type IOrderBy = Array<IOrderByColumn>;

function snakeCaseToCamelCase(str: string) {
  return str.replace(/(_\w)/g, (m) => m[1].toUpperCase());
}

function camelCaseToSnakeCase(str: string) {
  // insert an underscore between adjacent characters with differing cases
  return str.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

function addWhereClauses(query: KnexNamespace.QueryBuilder, conditions: IRow) {
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

  return query;
}

function isValidOrderBy(rawOrderBy: unknown): rawOrderBy is IOrderBy {
  if (!Array.isArray(rawOrderBy)) {
    return false;
  }

  if (
    !rawOrderBy.every(
      (orderBy) =>
        orderBy !== null &&
        typeof orderBy === "object" &&
        "columnName" in orderBy &&
        "direction" in orderBy
    )
  ) {
    return false;
  }

  return true;
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
  retailerLinks: (row: IRow) => {
    const outputRow: IRow = OutputRowMapper.generic(row);

    if (
      "priceHistory" in outputRow &&
      typeof outputRow.priceHistory === "string"
    ) {
      try {
        outputRow.priceHistory = JSON.parse(outputRow.priceHistory);
      } catch (e) {
        console.error("Error parsing price history JSON", e);
        outputRow.priceHistory = [];
      }
    }

    if ("isFavorite" in outputRow && typeof outputRow.isFavorite === "number") {
      outputRow.isFavorite = Boolean(outputRow.isFavorite);
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
  retailerLinks: (row: IRow) => {
    const inputRow: IRow = InputRowMapper.generic(row);

    if ("price_history" in inputRow && Array.isArray(inputRow.price_history)) {
      inputRow.price_history = JSON.stringify(inputRow.price_history);
    }

    return inputRow;
  },
};

export class UserDataModel {
  static readonly ComponentTableNames = [
    "cpu",
    "gpu",
    "ram",
    "m2_storage",
    "sata_storage",
    "psu",
    "mobo",
    "cooler",
  ];

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

  // Static helpers not exposed directly to the renderer process, but for use in the instance methods below
  static async getComponentPrice(
    tx: KnexNamespace.Transaction,
    {
      componentId,
      componentType,
    }: {
      componentId: number;
      componentType: string;
    }
  ): Promise<number> {
    const edges = await tx("edge")
      .where({
        source_id: componentId,
        source_type: componentType,
        target_type: "retailer_product_link",
      })
      .select("target_id");

    let productLinks = await tx("retailer_product_link")
      .whereIn(
        "id",
        edges.map((edge) => edge.target_id)
      )
      .select("is_favorite", "price_history");

    if (productLinks.length === 0) {
      return 0;
    }

    productLinks = productLinks.map((row) => ({
      ...row,
      price_history: JSON.parse(row.price_history),
    }));

    const favoriteLink = productLinks.find((link) => Boolean(link.is_favorite));

    if (favoriteLink) {
      return favoriteLink.price_history[0].price;
    }

    console.warn(`No favorite link found for ${componentType}`, componentId);
    return 0;
  }

  // Add new methods here, no other boilerplate in main / preload needed

  async addBuildGroup({ name }: IpcAction["body"]) {
    const db = await connectTo(DatabaseName.USER_DATA);
    const [newRow] = await db("build_group").insert({ name }).returning("id");
    return newRow.id;
  }

  async updateBuildGroup({ id, changes }: IpcAction["body"]) {
    if (typeof id !== "number" || id < 0) {
      throw new Error("Invalid group ID");
    }

    if (typeof changes !== "object" || changes === null) {
      throw new Error("Invalid updates");
    }

    const db = await connectTo(DatabaseName.USER_DATA);

    const values = InputRowMapper.generic(changes);
    await db("build_group").where({ id }).update(values);
  }

  async getAllBuildGroups() {
    const db = await connectTo(DatabaseName.USER_DATA);
    const rows = await db("build_group").select("*");
    return rows.map(OutputRowMapper.generic);
  }

  async getBuildGroupsWhere(rawConditions: IRow) {
    const db = await connectTo(DatabaseName.USER_DATA);

    const conditions = InputRowMapper.generic(rawConditions);

    let query = db("build_group");
    query = addWhereClauses(query, conditions);

    const rows = await query.select("*");
    return rows.map(OutputRowMapper.generic);
  }

  async getBuildsWhere(rawConditions: IRow) {
    const db = await connectTo(DatabaseName.USER_DATA);

    const conditions = InputRowMapper.generic(rawConditions);

    let query = db("build");
    query = addWhereClauses(query, conditions);

    const rows = await query.select("*");
    return rows.map(OutputRowMapper.generic);
  }

  async getBuildPrice({ buildId, componentType }: IpcAction["body"]) {
    if (typeof buildId !== "number" || buildId < 0) {
      throw new Error("Invalid build ID");
    }

    // optional filter by component type
    let componentTableName: string | null = null;
    if (typeof componentType === "string") {
      componentTableName = camelCaseToSnakeCase(componentType);

      if (!UserDataModel.ComponentTableNames.includes(componentTableName)) {
        throw new Error(`Invalid table name: "${componentTableName}"`);
      }
    }

    const db = await connectTo(DatabaseName.USER_DATA);

    return await db.transaction(async (tx) => {
      const build = await tx("build").where({ id: buildId }).first();

      if (!build) {
        return null;
      }

      // find all component edges for this build, or optionally only the edges for a specific component type

      const edgesQuery = tx("edge").where({
        source_id: buildId,
        source_type: "build",
      });

      if (componentTableName) {
        edgesQuery.where("target_type", componentTableName);
      } else {
        edgesQuery.whereIn("target_type", UserDataModel.ComponentTableNames);
      }

      const componentEdges = await edgesQuery.select("*");

      let price = 0;

      for (const edge of componentEdges) {
        const componentPrice = await UserDataModel.getComponentPrice(tx, {
          componentType: edge.target_type,
          componentId: edge.target_id,
        });

        price += componentPrice;
      }

      return price;
    });
  }

  async getEdgesWhere(rawConditions: IRow) {
    const db = await connectTo(DatabaseName.USER_DATA);

    // Rewrite where clause keys (and some values) to snake_case
    const conditions = InputRowMapper.edges(rawConditions);

    let query = db("edge");
    query = addWhereClauses(query, conditions);

    const rows = await query.select("*");
    return rows.map(OutputRowMapper.edges);
  }

  async getComponentsWhere({
    tableName: rawTableName,
    conditions: rawConditions,
    orderBy: rawOrderBy,
    columns: rawColumns,
  }: IpcAction["body"]) {
    const tableName = camelCaseToSnakeCase(rawTableName);

    if (!UserDataModel.ComponentTableNames.includes(tableName)) {
      throw new Error(`Invalid table name: "${tableName}"`);
    }

    let columns: string[] | undefined;

    if (Array.isArray(rawColumns)) {
      columns = rawColumns.map(camelCaseToSnakeCase);
    }

    const db = await connectTo(DatabaseName.USER_DATA);

    const conditions = InputRowMapper.generic(rawConditions);

    let query = db(tableName);
    query = addWhereClauses(query, conditions);

    if (rawOrderBy) {
      if (!isValidOrderBy(rawOrderBy)) {
        throw new Error(`Invalid orderBy on "${tableName}"`);
      }

      const orderBy = rawOrderBy.map(({ columnName, direction }) => ({
        column: camelCaseToSnakeCase(columnName),
        order: direction,
      }));

      query = query.orderBy(orderBy);
    }

    const rows = await query.select(columns ?? "*");

    return rows.map(OutputRowMapper.generic);
  }

  async deleteBuild({ id: buildId }: IpcAction["body"]) {
    if (typeof buildId !== "number" || buildId < 0) {
      throw new Error("Invalid build ID");
    }

    const db = await connectTo(DatabaseName.USER_DATA);

    await db.transaction(async (tx) => {
      // remove build from any group & delete
      await tx("edge")
        .where({
          source_type: "build_group",
          target_id: buildId,
          target_type: "build",
        })
        .del();

      await tx("build").where({ id: buildId }).del();
    });
  }

  async createOrCopyBuild({ groupId, buildIdToCopy }: IpcAction["body"]) {
    if (typeof groupId !== "number" || groupId < 0) {
      throw new Error("Invalid group ID");
    }

    if (typeof buildIdToCopy !== "number" && buildIdToCopy !== undefined) {
      throw new Error("Invalid build ID");
    }

    if (typeof buildIdToCopy === "number" && buildIdToCopy < 0) {
      throw new Error("Invalid build ID");
    }

    const db = await connectTo(DatabaseName.USER_DATA);

    return db.transaction(async (tx) => {
      let buildId: number;
      if (buildIdToCopy === undefined) {
        const [newBuild] = await tx("build")
          .insert({ name: "New Build" })
          .returning("id");
        buildId = newBuild.id;
      } else {
        const buildToCopy = await tx("build")
          .where({ id: buildIdToCopy })
          .first();

        if (!buildToCopy) {
          throw new Error("Build to copy not found");
        }

        const [copiedBuild] = await tx("build")
          .insert({
            name: `${buildToCopy.name} (Copy)`,
          })
          .returning("id");
        buildId = copiedBuild.id;

        const edges = await tx("edge")
          .where({
            source_id: buildIdToCopy,
            source_type: "build",
          })
          .select("*");

        for (const edge of edges) {
          await tx("edge").insert({
            source_id: buildId,
            source_type: "build",
            target_id: edge.target_id,
            target_type: edge.target_type,
          });
        }
      }

      await tx("edge").insert({
        source_id: groupId,
        source_type: "build_group",
        target_id: buildId,
        target_type: "build",
      });

      return buildId;
    });
  }

  async updateBuild({ id: buildId, changes }: IpcAction["body"]) {
    if (typeof buildId !== "number" || buildId < 0) {
      throw new Error("Invalid build ID");
    }

    if (typeof changes !== "object" || changes === null) {
      throw new Error("Invalid updates");
    }

    const db = await connectTo(DatabaseName.USER_DATA);

    const values = InputRowMapper.generic(changes);
    await db("build").where({ id: buildId }).update(values);
  }

  async removeComponentFromBuild({ buildId, edgeId }: IpcAction["body"]) {
    if (typeof buildId !== "number" || buildId < 0) {
      throw new Error("Invalid build ID");
    }

    if (typeof edgeId !== "number" || edgeId < 0) {
      throw new Error("Invalid edge ID");
    }

    const db = await connectTo(DatabaseName.USER_DATA);

    await db.transaction(async (tx) => {
      const build = await tx("build").where({ id: buildId }).first();

      if (!build) {
        throw new Error("Build not found");
      }

      const componentEdge = await tx("edge")
        .where({
          source_id: buildId,
          source_type: "build",
          id: edgeId,
        })
        .first();

      if (!componentEdge) {
        throw new Error("Component not found");
      }

      const component = await tx(componentEdge.target_type)
        .where({ id: componentEdge.target_id })
        .first();

      if (!component) {
        throw new Error("Component not found");
      }

      await tx("edge")
        .where({ source_id: buildId, source_type: "build", id: edgeId })
        .del();
    });
  }

  async assignComponentToBuild({
    buildId,
    edgeId,
    componentId,
    componentType,
  }: IpcAction["body"]) {
    if (typeof buildId !== "number" || buildId < 0) {
      throw new Error("Invalid build ID");
    }

    if (typeof componentId !== "number" || componentId < 0) {
      throw new Error("Invalid component ID");
    }

    if (typeof edgeId === "number") {
      if (edgeId < 0) {
        throw new Error("Invalid edge ID");
      }
    } else {
      if (edgeId !== null) {
        throw new Error("Invalid edge ID");
      }
    }

    const componentTableName = camelCaseToSnakeCase(componentType);

    if (!UserDataModel.ComponentTableNames.includes(componentTableName)) {
      throw new Error(`Invalid table name: "${componentTableName}"`);
    }

    const db = await connectTo(DatabaseName.USER_DATA);

    return db.transaction(async (tx) => {
      const build = await tx("build").where({ id: buildId }).first();

      if (!build) {
        throw new Error("Build not found");
      }

      const component = await tx(componentTableName)
        .where({ id: componentId })
        .first();

      if (!component) {
        throw new Error("Component not found");
      }

      let newEdgeId: number;
      let prevComponent: IRow | null = null;

      if (edgeId === null) {
        // Creating a new edge
        const [newEdge] = await tx("edge")
          .insert({
            source_id: buildId,
            source_type: "build",
            target_id: componentId,
            target_type: componentTableName,
          })
          .returning("id");
        newEdgeId = newEdge.id;
      } else {
        // Updating an existing edge to point to a different component
        const prevComponentEdge = await tx("edge")
          .where({ id: edgeId })
          .first();
        prevComponent = await tx(prevComponentEdge.target_type)
          .where({ id: prevComponentEdge.target_id })
          .first();

        newEdgeId = edgeId;
        await tx("edge").where({ id: edgeId }).update({
          target_id: componentId,
        });
      }

      return newEdgeId;
    });
  }

  async createComponent({ componentType, component }: IpcAction["body"]) {
    const tableName = camelCaseToSnakeCase(componentType);

    if (!UserDataModel.ComponentTableNames.includes(tableName)) {
      throw new Error(`Invalid table name: "${tableName}"`);
    }

    if (typeof component !== "object" || component === null) {
      throw new Error("Invalid component definition");
    }

    const db = await connectTo(DatabaseName.USER_DATA);

    const values = InputRowMapper.generic(component);
    const [newComponent] = await db(tableName).insert(values).returning("id");

    return newComponent.id;
  }

  async updateComponent({ componentType, id, changes }: IpcAction["body"]) {
    const tableName = camelCaseToSnakeCase(componentType);

    if (!UserDataModel.ComponentTableNames.includes(tableName)) {
      throw new Error(`Invalid table name: "${tableName}"`);
    }

    if (typeof id !== "number" || id < 0) {
      throw new Error("Invalid component ID");
    }

    if (typeof changes !== "object" || changes === null) {
      throw new Error("Invalid updates");
    }

    const db = await connectTo(DatabaseName.USER_DATA);

    const values = InputRowMapper.generic(changes);
    await db(tableName).where({ id }).update(values);
  }

  async getComponentRetailerLinks({
    componentType,
    componentId,
  }: IpcAction["body"]) {
    const componentTableName = camelCaseToSnakeCase(componentType);

    if (!UserDataModel.ComponentTableNames.includes(componentTableName)) {
      throw new Error(`Invalid table name: "${componentTableName}"`);
    }

    if (typeof componentId !== "number" || componentId < 0) {
      throw new Error("Invalid component ID");
    }

    const db = await connectTo(DatabaseName.USER_DATA);

    const edges = await db("edge")
      .where({
        source_id: componentId,
        source_type: componentTableName,
        target_type: "retailer_product_link",
      })
      .select("target_id");

    const linkRows = await db("retailer_product_link")
      .where(
        "id",
        "in",
        edges.map((edge) => edge.target_id)
      )
      .select("*");

    return linkRows.map(OutputRowMapper.retailerLinks);
  }

  async addRetailerLinkToComponent({
    componentType,
    componentId,
    retailerName,
    url,
  }: IpcAction["body"]) {
    const componentTableName = camelCaseToSnakeCase(componentType);

    if (!UserDataModel.ComponentTableNames.includes(componentTableName)) {
      throw new Error(`Invalid table name: "${componentTableName}"`);
    }

    if (typeof componentId !== "number" || componentId < 0) {
      throw new Error("Invalid component ID");
    }

    if (typeof retailerName !== "string" || !retailerName) {
      throw new Error("Link name required");
    }

    if (typeof url !== "string" || !url) {
      throw new Error("Link URL required");
    }

    const db = await connectTo(DatabaseName.USER_DATA);

    return db.transaction(async (tx) => {
      const existingLinkEdges = await tx("edge").where({
        source_id: componentId,
        source_type: componentTableName,
        target_type: "retailer_product_link",
      });

      // By default, the first link added is marked as favorite
      let is_favorite = false;
      if (existingLinkEdges.length === 0) {
        is_favorite = true;
      }

      let linkId: number;
      const [newLink] = await tx("retailer_product_link")
        .insert({ retailer_name: retailerName, url, is_favorite })
        .returning("id");

      linkId = newLink.id;

      await tx("edge").insert({
        source_id: componentId,
        source_type: componentTableName,
        target_id: linkId,
        target_type: "retailer_product_link",
      });

      return linkId;
    });
  }

  async updateRetailerLink({ id, changes }: IpcAction["body"]) {
    if (typeof id !== "number" || id < 0) {
      throw new Error("Invalid link ID");
    }

    if (typeof changes !== "object" || changes === null) {
      throw new Error("Invalid updates");
    }

    const db = await connectTo(DatabaseName.USER_DATA);

    const values = InputRowMapper.retailerLinks(changes);

    await db.transaction(async (tx) => {
      await tx("retailer_product_link").where({ id }).update(values);
    });
  }

  async toggleFavoriteRetailerLink({
    componentType,
    componentId,
    linkId,
  }: IpcAction["body"]) {
    const componentTableName = camelCaseToSnakeCase(componentType);

    if (!UserDataModel.ComponentTableNames.includes(componentTableName)) {
      throw new Error(`Invalid table name: "${componentTableName}"`);
    }

    if (typeof componentId !== "number" || componentId < 0) {
      throw new Error("Invalid component ID");
    }

    if (typeof linkId !== "number" || linkId < 0) {
      throw new Error("Invalid link ID");
    }

    const db = await connectTo(DatabaseName.USER_DATA);

    return db.transaction(async (tx) => {
      const edges = await tx("edge")
        .where({
          source_id: componentId,
          source_type: componentTableName,
          target_type: "retailer_product_link",
        })
        .select("target_id");

      const linkIds = edges.map((edge) => edge.target_id);

      await tx("retailer_product_link")
        .whereIn("id", linkIds)
        .update({ is_favorite: false });

      await tx("retailer_product_link")
        .where({ id: linkId })
        .update({ is_favorite: true });
    });
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
  {
    name: "add_price_history",
    up: async (knex: KnexNamespace) => {
      await knex.schema.createTable("retailer_product_link", (table) => {
        table.increments("id").primary();
        table.string("retailer_name").notNullable();
        table.string("url").notNullable();
        table.json("price_history").notNullable().defaultTo("[]");
      });
    },
    down: async (knex: KnexNamespace) => {},
  },
  {
    name: "move_price_to_retailer_link",
    up: async (knex: KnexNamespace) => {
      // remove price column from builds
      await knex.schema.alterTable("build", (table) => {
        table.dropColumn("price");
      });

      // remove price column from components
      await knex.schema.alterTable("cpu", (table) => {
        table.dropColumn("price");
      });
      await knex.schema.alterTable("gpu", (table) => {
        table.dropColumn("price");
      });
      await knex.schema.alterTable("ram", (table) => {
        table.dropColumn("price");
      });
      await knex.schema.alterTable("m2_storage", (table) => {
        table.dropColumn("price");
      });
      await knex.schema.alterTable("sata_storage", (table) => {
        table.dropColumn("price");
      });
      await knex.schema.alterTable("psu", (table) => {
        table.dropColumn("price");
      });
      await knex.schema.alterTable("mobo", (table) => {
        table.dropColumn("price");
      });
      await knex.schema.alterTable("cooler", (table) => {
        table.dropColumn("price");
      });

      // add is_favorite column to retailer_product_link
      await knex.schema.table("retailer_product_link", (table) => {
        table.boolean("is_favorite").notNullable().defaultTo(false);
      });
    },
    down: async (knex: KnexNamespace) => {},
  },
  // TODO for future migration, other component types:
  // case: "++id, brand, name, formFactor, frontUsbPorts, frontAudioPorts, driveBays, maxGpuLength, maxCpuCoolerHeight, maxPsuLength, maxRadiatorLength, maxRadiatorWidth, maxRadiatorHeight, maxFanLength, maxFanWidth, maxFanHeight, maxFanCount, maxDustFilterCount",
  // nvmeCarrierCard: "++id, brand, name, type, pcieVersion, m2Slots",
  // rgbLighting: "++id, brand, name, type, color, brightness",
  // soundCard: "++id, brand, name, type, spdifOutputs, spdifInputs, line35mmOutputs, headphone35mmOutputs, microphone35mmInputs"
  // monitor: "++id, brand, name, resolution, refreshRate, panelType, responseTime, aspectRatio, size, vesaMount, hdmiInputs, displayPortInputs, usbPorts, speakers, freesync, gsync, curved, color, brightness, contrast, viewingAngle, powerConsumption, weight, height, width, depth",
];
