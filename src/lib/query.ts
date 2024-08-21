import { BuildComponentStoreName } from "lib/build";
import { SortDirection } from "lib/constants";
import { BuildGroupSchema, BuildSchema, EdgeSchema, Schema } from "lib/db";

/**
 * @deprecated
 * Stubs out the Dexie db & table APIs with an empty implementation, to help transition
 * the codebase to Electron.
 */
export class DexieStub {
  constructor(databaseName: string) {}

  version(versionNo: number) {
    return new DexieVersionStub();
  }

  table<T = any>(tableName: string) {
    return new DexieTableQueryStub<T>(tableName);
  }

  transaction(
    mode: "rw" | "r",
    tables: Array<string>,
    txCallback: DexieTransactionCallback
  ) {
    return txCallback(new DexieTransactionStub());
  }
}

class DexieVersionStub {
  stores(schema: any) {
    return this;
  }

  upgrade(txCallback: DexieTransactionCallback) {
    txCallback(new DexieTransactionStub());
  }
}

type DexieTransactionCallback = (
  transaction: DexieTransactionStub
) => Promise<any>;

class DexieTransactionStub {
  table<T = any>(tableName: string) {
    return new DexieTableQueryStub<T>(tableName);
  }
}

class DexieTableQueryStub<T> {
  constructor(tableName: string) {}

  /** Collection.toArray() */
  toArray(): Promise<Array<T>> {
    return Promise.resolve([]);
  }

  /** Collection.modify() */
  modify(rowCallback: (row: any) => void): Promise<number> {
    // resolved value is the number of modified objects
    return Promise.resolve(0);
  }

  /** Collection.sortBy() */
  sortBy(columnName: string): Promise<Array<T>> {
    return Promise.resolve([]);
  }

  /** Collection.delete() */
  delete(): Promise<number> {
    // Collection.delete() removes all rows in the current query
    // whereas Table.delete() deletes a single record by ID.
    return Promise.resolve(0);
  }

  /** Table.toCollection() */
  toCollection() {
    return this;
  }

  /** Table.get() */
  get(id: number): Promise<T | undefined> {
    return Promise.resolve(undefined);
  }

  /** Table.add() */
  add(row: any): Promise<number> {
    // resolved value is the ID of the inserted object
    return Promise.resolve(-1);
  }

  /** Table.update() */
  update(id: number, changes: Partial<T>): Promise<number> {
    // resolved value is the number of updated records
    return Promise.resolve(0);
  }

  /** Table.where() */
  where(criteria: any) {
    return this;
  }

  /** WhereClause.anyOf() */
  anyOf(keys: Array<any>) {
    return this;
  }
}

export interface QueryWhereConditions {
  [key: string]: string | number | string[] | number[] | null;
}

export type QueryOrderBy = Array<{
  columnName: string;
  direction: SortDirection;
}>;

export interface QueryUnknownComponentSchema {
  [key: string]: string | number | null;
}

export function addBuildGroup(body: { name: string }): Promise<number> {
  return window.UserDataModel.dispatch({
    type: "addBuildGroup",
    body,
  });
}

export function getAllBuildGroups(): Promise<Array<BuildGroupSchema>> {
  return window.UserDataModel.dispatch({
    type: "getAllBuildGroups",
    body: {},
  });
}

export function getBuildGroupsWhere(
  conditions: QueryWhereConditions
): Promise<Array<BuildGroupSchema>> {
  return window.UserDataModel.dispatch({
    type: "getBuildGroupsWhere",
    body: conditions,
  });
}

export function getBuildsWhere(
  conditions: QueryWhereConditions
): Promise<Array<BuildSchema>> {
  return window.UserDataModel.dispatch({
    type: "getBuildsWhere",
    body: conditions,
  });
}

export function getEdgesWhere(
  conditions: QueryWhereConditions
): Promise<Array<EdgeSchema>> {
  return window.UserDataModel.dispatch({
    type: "getEdgesWhere",
    body: conditions,
  });
}

export function getComponentsWhere<T extends BuildComponentStoreName>(
  tableName: T,
  conditions: QueryWhereConditions,
  orderBy?: QueryOrderBy
): Promise<Array<Schema<T>>> {
  return window.UserDataModel.dispatch({
    type: "getComponentsWhere",
    body: {
      tableName,
      conditions,
      orderBy,
    },
  });
}

export function deleteBuild(body: { id: number }): Promise<void> {
  return window.UserDataModel.dispatch({
    type: "deleteBuild",
    body,
  });
}

export function createOrCopyBuild(body: {
  groupId: number;
  buildIdToCopy?: number;
}): Promise<number> {
  return window.UserDataModel.dispatch({
    type: "createOrCopyBuild",
    body,
  });
}

export function updateBuild(body: {
  id: number;
  changes: QueryUnknownComponentSchema;
}): Promise<void> {
  return window.UserDataModel.dispatch({
    type: "updateBuild",
    body,
  });
}

export function removeComponentFromBuild(body: {
  buildId: number;
  edgeId: number;
  componentType: BuildComponentStoreName;
}): Promise<void> {
  return window.UserDataModel.dispatch({
    type: "removeComponentFromBuild",
    body,
  });
}

export function assignComponentToBuild(body: {
  buildId: number;
  edgeId: number | null;
  componentId: number;
  componentType: BuildComponentStoreName;
}): Promise<number> {
  return window.UserDataModel.dispatch({
    type: "assignComponentToBuild",
    body,
  });
}

export function createComponent(body: {
  componentType: BuildComponentStoreName;
  component: QueryUnknownComponentSchema;
}): Promise<number> {
  return window.UserDataModel.dispatch({
    type: "createComponent",
    body,
  });
}

export function updateComponent(body: {
  componentType: BuildComponentStoreName;
  id: number;
  changes: QueryUnknownComponentSchema;
}): Promise<void> {
  return window.UserDataModel.dispatch({
    type: "updateComponent",
    body,
  });
}
