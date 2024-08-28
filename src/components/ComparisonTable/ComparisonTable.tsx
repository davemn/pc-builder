import React, { useContext, useEffect, useState } from "react";

import { Button, ButtonVariant } from "components/Button";
import { Form } from "components/Form";
import { Modal } from "components/Modal";
import { SortControls } from "components/SortControls";
import { BuildContext } from "context/build";
import { useComponentMutations, useComponents } from "hooks/useComponents";
import {
  BuildComponentMeta,
  BuildComponentStoreName,
  Compatibility,
  ExtendedBuildSchema,
  overallCompatibility,
} from "lib/build";
import { ColumnDefinition } from "lib/columns";
import { SortDirection } from "lib/constants";
import { Schema } from "lib/db";
import { cx, makeClassNamePrimitives } from "lib/styles";

import { TableRow } from "./TableRow";

import classNames from "./ComparisonTable.module.css";

/* These are each preemptively populated for every class, but only a few mappings will be used. */
const { Div, Span } = makeClassNamePrimitives(classNames);

export interface ComparisonTableProps<T extends BuildComponentStoreName> {
  dataStoreName: T;
  onEditSelected: (previousRow: Schema<T>, row: Schema<T>) => void;
  onRemove: (row: Schema<T>) => void;
  onSelect: (previousRow: Schema<T> | null, row: Schema<T>) => void;
  selectedRowId?: number;
  style?: React.CSSProperties;
}

interface RowState<T extends BuildComponentStoreName> {
  allRows: Array<Schema<T>>;
  columns: Array<ColumnDefinition<T>>;
  selectedRow: Schema<T> | undefined;
  selectedRowIsCompatible: boolean;
  unselectedRows: Array<Schema<T>>;
  incompatibleRows: Array<Schema<T>>;
}

const InitialRowState = {
  allRows: [],
  columns: [],
  selectedRow: undefined,
  selectedRowIsCompatible: true,
  unselectedRows: [],
  incompatibleRows: [],
};

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
  const [isLoading, setIsLoading] = useState(false);

  const { pluralName: componentTypePluralLabel } =
    BuildComponentMeta[dataStoreName];

  const {
    components: sortedRowsOfType,
    isFetching,
    isPending,
  } = useComponents(dataStoreName, sortBy);

  const { createComponent, updateComponent } = useComponentMutations();

  const [rowState, setRowState] = useState<RowState<T>>(InitialRowState);

  // Tie all of this state to the data query so the table can be reactive to dataStoreName updates
  // without e.g. columns changing before new rows have been fetched
  const {
    allRows,
    columns,
    selectedRow,
    selectedRowIsCompatible,
    unselectedRows,
    incompatibleRows,
  } = rowState;

  useEffect(() => {
    if (isPending) {
      return;
    }

    if (isFetching) {
      return;
    }

    const componentMeta = BuildComponentMeta[dataStoreName];

    const getIsBuildCompatible = (
      row: Schema<T>,
      build: ExtendedBuildSchema
    ) => {
      return (
        overallCompatibility(
          componentMeta.getCompatibilityChecks(row, build)
        ) !== Compatibility.INCOMPATIBLE
      );
    };

    const columns = componentMeta.columns;

    const allRows = [...sortedRowsOfType];

    let selectedRow: Schema<T> | undefined,
      unselectedRows: Array<Schema<T>> = [],
      incompatibleRows: Array<Schema<T>> = [];

    for (const row of allRows) {
      if (row.id === selectedRowId) {
        selectedRow = row;
      } else if (!build || getIsBuildCompatible(row, build)) {
        unselectedRows.push(row);
      } else {
        incompatibleRows.push(row);
      }
    }

    const selectedRowIsCompatible =
      selectedRow && build ? getIsBuildCompatible(selectedRow, build) : true;

    setIsLoading(false);

    setRowState({
      allRows,
      columns,
      selectedRow,
      selectedRowIsCompatible,
      unselectedRows,
      incompatibleRows,
    });
  }, [isPending, isFetching, selectedRowId, build]);

  const handleEdit = (row: Schema<T>, editingSelected = false) => {
    setEditModalOpen(true);
    setEditRow(row);
    if (editingSelected) {
      setIsEditingSelectedRow(true);
    }
  };

  useEffect(() => {
    setIsLoading(true);
  }, [dataStoreName]);

  if (isLoading) {
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

      {selectedRow && (
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
                onEdit={() => handleEdit(selectedRow, true)}
                onRemove={() => onRemove(selectedRow)}
                row={selectedRow}
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
          {unselectedRows.map((row, rowI) => (
            <TableRow
              key={row.id}
              columns={columns}
              compareToRow={selectedRow}
              componentType={dataStoreName}
              onEdit={() => handleEdit(row)}
              onSelect={() => onSelect(selectedRow ?? null, row)}
              row={row}
              rowIndex={rowI}
            />
          ))}
          {allRows.length === 0 && (
            <Div.EmptyState
              style={{ gridColumn: `1 / span ${columns.length + 2}` }}
            >
              Nothing added
            </Div.EmptyState>
          )}
          {allRows.length > 0 && unselectedRows.length === 0 && (
            <Div.EmptyState
              style={{ gridColumn: `1 / span ${columns.length + 2}` }}
            >
              {selectedRow
                ? `No compatible ${componentTypePluralLabel} to compare`
                : `No ${componentTypePluralLabel} compatible with build`}
            </Div.EmptyState>
          )}
        </Div.Table>
      </Div.ScrollContainer>

      {/* Rows that are incompatible with the current build */}
      {incompatibleRows.length > 0 && (
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
              {incompatibleRows.map((row, rowI) => (
                <TableRow
                  key={row.id}
                  columns={columns}
                  compareToRow={selectedRow}
                  componentType={dataStoreName}
                  onEdit={() => handleEdit(row)}
                  onSelect={() => onSelect(selectedRow ?? null, row)}
                  row={row}
                  rowIndex={rowI}
                />
              ))}
              {allRows.length === 0 && (
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
