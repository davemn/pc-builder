import { BuildComponentStoreName } from "lib/build";
import { SortDirection } from "lib/constants";
import {
  BuildGroupSchema,
  BuildSchema,
  EdgeSchema,
  RetailerProductLinkSchema,
  Schema,
} from "lib/db";

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

export function updateBuildGroup(body: {
  id: number;
  changes: QueryUnknownComponentSchema;
}): Promise<void> {
  return window.UserDataModel.dispatch({
    type: "updateBuildGroup",
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

export function getBuildPrice(body: {
  buildId: number;
  componentType?: BuildComponentStoreName;
}): Promise<number | null> {
  return window.UserDataModel.dispatch({
    type: "getBuildPrice",
    body,
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

export async function getComponentIdsWhere<T extends BuildComponentStoreName>(
  tableName: T,
  conditions: QueryWhereConditions,
  orderBy?: QueryOrderBy
): Promise<Array<number>> {
  const rows: Array<{ id: number }> = await window.UserDataModel.dispatch({
    type: "getComponentsWhere",
    body: {
      tableName,
      conditions,
      orderBy,
      columns: ["id"],
    },
  });

  return rows.map((row) => row.id);
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

export function getComponentRetailerLinks(body: {
  componentType: BuildComponentStoreName;
  componentId: number;
}): Promise<Array<RetailerProductLinkSchema>> {
  return window.UserDataModel.dispatch({
    type: "getComponentRetailerLinks",
    body,
  });
}

export function addRetailerLinkToComponent(body: {
  componentType: BuildComponentStoreName;
  componentId: number;
  retailerName: string;
  url: string;
}): Promise<number> {
  return window.UserDataModel.dispatch({
    type: "addRetailerLinkToComponent",
    body,
  });
}

export function updateRetailerLink(body: {
  id: number;
  changes: Partial<Omit<RetailerProductLinkSchema, "id">>;
}): Promise<void> {
  return window.UserDataModel.dispatch({
    type: "updateRetailerLink",
    body,
  });
}

export function toggleFavoriteRetailerLink(body: {
  componentType: BuildComponentStoreName;
  componentId: number;
  linkId: number;
}): Promise<void> {
  return window.UserDataModel.dispatch({
    type: "toggleFavoriteRetailerLink",
    body,
  });
}

export function getUniqueComponentColumnValues(body: {
  componentType: BuildComponentStoreName;
  columnName: string;
}): Promise<string[] | number[]> {
  return window.UserDataModel.dispatch({
    type: "getUniqueComponentColumnValues",
    body,
  });
}
