import React, { useContext, useState } from "react";

import { Button, ButtonVariant } from "components/Button";
import { Form } from "components/Form";
import { Modal } from "components/Modal";
import { SortControls } from "components/SortControls";
import { BuildContext } from "context/build";
import { useComponentMutations } from "hooks/useComponent";
import { useComponentIds } from "hooks/useComponentIds";
import { BuildComponentMeta, BuildComponentStoreName } from "lib/build";
import { ColumnDefinition } from "lib/columns";
import { SortDirection } from "lib/constants";
import { Schema } from "lib/db";
import * as Query from "lib/query";
import { cx, makeClassNamePrimitives } from "lib/styles";

import { TableRow } from "./TableRow";

import classNames from "./ComparisonTable.module.css";

/* These are each preemptively populated for every class, but only a few mappings will be used. */
const { Div, Span } = makeClassNamePrimitives(classNames);

export interface ComparisonTableProps<T extends BuildComponentStoreName> {
  dataStoreName: T;
  onEditSelected: (previousRow: Schema<T>, row: Schema<T>) => void;
  onRemove: (rowId: number) => void;
  onSelect: (previousRowId: number | null, rowId: number) => void;
  selectedRowId?: number;
  style?: React.CSSProperties;
}

export const ComparisonTable = <T extends BuildComponentStoreName>(
  props: ComparisonTableProps<T>
) => {
  const {
    dataStoreName,
    onEditSelected,
    onRemove,
    onSelect,
    selectedRowId,
    style,
  } = props;

  const { build } = useContext(BuildContext);

  const [sortBy, setSortBy] = useState<
    Array<{ columnName: string; direction: SortDirection }>
  >([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<Schema<T>>();
  const [isEditingSelectedRow, setIsEditingSelectedRow] = useState(false);

  const { pluralName: componentTypePluralLabel } =
    BuildComponentMeta[dataStoreName];

  const { isFetching, isPending, ...queryData } = useComponentIds(
    dataStoreName,
    build,
    sortBy
  );

  const { createComponent, updateComponent } = useComponentMutations();

  const allRowIds = queryData.allComponentIds;
  const columns = BuildComponentMeta[dataStoreName].columns;
  const selectedRowIsCompatible = queryData.buildCompatibleComponentIds.some(
    (id) => id === selectedRowId
  );
  const unselectedRowIds = queryData.buildCompatibleComponentIds.filter(
    (id) => id !== selectedRowId
  );
  const incompatibleRowIds = queryData.buildIncompatibleComponentIds.filter(
    (id) => id !== selectedRowId
  );

  const handleEdit = async (rowId: number, editingSelected = false) => {
    setEditModalOpen(true);
    const [row] = await Query.getComponentsWhere(dataStoreName, { id: rowId });
    setEditRow(row);
    if (editingSelected) {
      setIsEditingSelectedRow(true);
    }
  };

  if (isPending || isFetching) {
    return (
      <Div.Container>
        <Div.TableName>
          <h2>{componentTypePluralLabel}</h2>
          <Button disabled onClick={() => {}} variant={ButtonVariant.ACCENT}>
            Add
          </Button>
        </Div.TableName>
      </Div.Container>
    );
  }

  return (
    <Div.Container>
      <Div.TableName>
        <h2>{componentTypePluralLabel}</h2>
        <Button
          onClick={() => setAddModalOpen(true)}
          variant={ButtonVariant.ACCENT}
        >
          Add
        </Button>
      </Div.TableName>

      {selectedRowId !== undefined && (
        <>
          <h2
            className={cx(
              classNames,
              selectedRowIsCompatible
                ? "compatibleRowBadge"
                : "incompatibleRowBadge"
            )}
          >
            {selectedRowIsCompatible ? "Selected" : "Incompatible with build"}
          </h2>
          <Div.ScrollContainer
            style={{
              border: selectedRowIsCompatible
                ? "2px solid var(--accent100)"
                : "2px solid var(--negative100)",
            }}
          >
            <Div.SelectedRow
              style={{
                gridTemplateColumns: `repeat(${columns.length}, minmax(max-content, 1fr)) 125px`,
              }}
            >
              <TableRow
                columns={columns}
                componentType={dataStoreName}
                onEdit={() => handleEdit(selectedRowId, true)}
                onRemove={() => onRemove(selectedRowId)}
                rowId={selectedRowId}
                rowIndex={0}
                removeButtonVariant={
                  selectedRowIsCompatible
                    ? ButtonVariant.ACCENT
                    : ButtonVariant.NEGATIVE
                }
              />
            </Div.SelectedRow>
          </Div.ScrollContainer>
        </>
      )}

      <Div.TableFilters>
        <SortControls columns={columns} onChangeSort={setSortBy} />
      </Div.TableFilters>

      {/* Rows that are compatible with the current build */}
      <Div.ScrollContainer>
        <Div.Table
          style={{
            gridTemplateColumns: `repeat(${columns.length}, minmax(max-content, 1fr)) 125px`,
            ...style,
          }}
        >
          {unselectedRowIds.map((rowId, rowI) => (
            <TableRow
              key={rowId}
              columns={columns}
              compareToRowId={selectedRowId}
              componentType={dataStoreName}
              onEdit={() => handleEdit(rowId)}
              onSelect={() => onSelect(selectedRowId ?? null, rowId)}
              rowId={rowId}
              rowIndex={rowI}
            />
          ))}
          {allRowIds.length === 0 && (
            <Div.EmptyState
              style={{ gridColumn: `1 / span ${columns.length + 2}` }}
            >
              Nothing added
            </Div.EmptyState>
          )}
          {allRowIds.length > 0 && unselectedRowIds.length === 0 && (
            <Div.EmptyState
              style={{ gridColumn: `1 / span ${columns.length + 2}` }}
            >
              {selectedRowId !== undefined
                ? `No compatible ${componentTypePluralLabel} to compare`
                : `No ${componentTypePluralLabel} compatible with build`}
            </Div.EmptyState>
          )}
        </Div.Table>
      </Div.ScrollContainer>

      {/* Rows that are incompatible with the current build */}
      {incompatibleRowIds.length > 0 && (
        <>
          <h2 className={classNames.tableName}>
            Incompatible {componentTypePluralLabel}
          </h2>
          <Div.ScrollContainer>
            <Div.Table
              style={{
                gridTemplateColumns: `repeat(${columns.length}, minmax(max-content, 1fr)) 125px`,
                ...style,
              }}
            >
              {incompatibleRowIds.map((rowId, rowI) => (
                <TableRow
                  key={rowId}
                  columns={columns}
                  compareToRowId={selectedRowId}
                  componentType={dataStoreName}
                  onEdit={() => handleEdit(rowId)}
                  onSelect={() => onSelect(selectedRowId ?? null, rowId)}
                  rowId={rowId}
                  rowIndex={rowI}
                />
              ))}
              {allRowIds.length === 0 && (
                <Div.EmptyState
                  style={{ gridColumn: `1 / span ${columns.length + 2}` }}
                >
                  Nothing added
                </Div.EmptyState>
              )}
            </Div.Table>
          </Div.ScrollContainer>
        </>
      )}

      {addModalOpen && (
        <Modal>
          <h2 className={classNames.modalTitle}>Add</h2>
          <Form
            schema={columns.map((column) => ({
              dataType: column.unit.dataType,
              name: column.name,
              label: column.label,
            }))}
            onCancel={() => setAddModalOpen(false)}
            onSubmit={async (data) => {
              console.log(data);
              if (!data.name) {
                alert("Name is required");
                return;
              }

              await createComponent({
                componentType: dataStoreName,
                component: data,
              });

              setAddModalOpen(false);
            }}
          />
        </Modal>
      )}

      {editModalOpen && editRow && (
        <Modal>
          <h2 className={classNames.modalTitle}>Edit</h2>
          <Form
            initialData={
              editRow as Record<Extract<keyof T, string>, number | string>
            }
            schema={columns.map((column) => ({
              dataType: column.unit.dataType,
              name: column.name,
              label: column.label,
            }))}
            onCancel={() => {
              setEditRow(undefined);
              setEditModalOpen(false);
            }}
            onSubmit={async (data) => {
              console.log(data);
              if (!data.name) {
                alert("Name is required");
                return;
              }

              await updateComponent({
                componentType: dataStoreName,
                id: editRow.id,
                changes: data,
              });

              if (isEditingSelectedRow) {
                onEditSelected(editRow, { ...editRow, ...data } as Schema<T>);
                setIsEditingSelectedRow(false);
              }

              setEditRow(undefined);
              setEditModalOpen(false);
            }}
          />
        </Modal>
      )}
    </Div.Container>
  );
};
