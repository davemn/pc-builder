import { BuildComponentStoreName } from "lib/build";
import { SortDirection } from "lib/constants";
import { BuildGroupSchema, BuildSchema, EdgeSchema, Schema } from "lib/db";

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
