import { useLiveQuery } from "dexie-react-hooks";
import React, { useMemo, useState } from "react";

import { Form } from "components/Form";
import { Modal } from "components/Modal";
import { SortControls } from "components/SortControls";
import { ColumnDefinition } from "lib/columns";
import { db, Schema, StoreName } from "lib/db";
import { makeClassNamePrimitives } from "lib/styles";

import classNames from "./ComparisonTable.module.css";

/* These are each preemptively populated for every class, but only a few mappings will be used. */
const { Div, Span } = makeClassNamePrimitives(classNames);

export interface ComparisonTableProps<T extends StoreName> {
  dataStoreName: T;
  dataStoreLabel: string;
  columns: Array<ColumnDefinition<T>>;
  getIsBuildCompatible: (row: Schema<T>) => boolean;
  onRemove?: (id: number) => void;
  onSelect: (id: number) => void;
  selectedRowId?: number;
  style?: React.CSSProperties;
}

function sortByMultiple<T>(
  data: Array<T>,
  sortBy: Array<{
    columnName: Extract<keyof T, string>;
    direction: "asc" | "desc";
  }>
) {
  if (sortBy.length === 0) {
    return [...data];
  }

  return [...data].sort((a, b) => {
    let i = 0;
    let curSort;

    while (i < sortBy.length) {
      curSort = sortBy[i];

      const aValue = a[curSort.columnName];
      const bValue = b[curSort.columnName];

      if (aValue < bValue) {
        return curSort.direction === "asc" ? -1 : 1;
      } else if (aValue > bValue) {
        return curSort.direction === "asc" ? 1 : -1;
      }

      i++;
    }

    return 0;
  });
}

interface TableRowProps<T extends StoreName> {
  columns: ComparisonTableProps<T>["columns"];
  compareToRow?: Schema<T>;
  onEdit: (id: number) => void;
  onRemove?: (id: number) => void;
  onSelect?: (id: number) => void;
  row: Schema<T>;
  rowIndex: number;
}

const TableRow = <T extends StoreName>(props: TableRowProps<T>) => {
  const { columns, compareToRow, onEdit, onRemove, onSelect, row, rowIndex } =
    props;

  const renderCellValue = (column: ColumnDefinition<T>) => {
    const value = row[column.name];
    let valueText: string;

    switch (column.unit.dataType) {
      case "numeric":
        if (typeof value !== "number") {
          console.warn(
            `Expected numeric value for column "${column.name}", got ${JSON.stringify(value)}`
          );
          valueText = `${value}`;
        } else {
          valueText = column.unit.format(value);
        }
        break;
      default:
      case "text":
        valueText = column.unit.format(`${value}`);
        break;
    }

    if (!compareToRow) {
      return <Span.CellValueNeutral>{valueText}</Span.CellValueNeutral>;
    }

    const compareToValue = compareToRow[column.name];
    let quality: number;

    switch (column.unit.dataType) {
      case "numeric":
        if (typeof value !== "number" || typeof compareToValue !== "number") {
          console.warn(
            `Expected numeric value for column "${column.name}", got ${JSON.stringify(
              value
            )} and ${JSON.stringify(compareToValue)}`
          );
          quality = 0;
        } else {
          quality = column.unit.compareQuality(value, compareToValue);
        }
        break;
      default:
      case "text":
        quality = 0;
        break;
    }

    if (quality > 0) {
      return <Span.CellValuePositive>{valueText}</Span.CellValuePositive>;
    }
    if (quality < 0) {
      return <Span.CellValueNegative>{valueText}</Span.CellValueNegative>;
    }
    return <Span.CellValueNeutral>{valueText}</Span.CellValueNeutral>;
  };

  return (
    <>
      {columns.map((column, columnI) => (
        <Div.Cell
          key={`${row.id}-${column.name}`}
          style={{
            ...(rowIndex > 0 ? { borderTop: "1px solid var(--dark0)" } : {}),
            ...(columnI === 0 ? { gridColumn: "span 2" } : {}),
          }}
        >
          {column.name !== "name" && (
            <Span.CellName>{column.label}</Span.CellName>
          )}
          {renderCellValue(column)}
        </Div.Cell>
      ))}
      <Div.Cell
        key={`${row.id}-actions}`}
        style={{
          ...(rowIndex > 0 ? { borderTop: "1px solid var(--dark0)" } : {}),
        }}
      >
        <button onClick={() => onEdit(row.id)}>Edit</button>
        {onRemove && (
          <button
            style={{ border: 0, backgroundColor: "var(--accent100)" }}
            onClick={() => onRemove(row.id)}
          >
            Remove
          </button>
        )}
        {onSelect && <button onClick={() => onSelect(row.id)}>Select</button>}
      </Div.Cell>
    </>
  );
};

export const ComparisonTable = <T extends StoreName>(
  props: ComparisonTableProps<T>
) => {
  const {
    dataStoreName,
    dataStoreLabel,
    columns,
    getIsBuildCompatible,
    onRemove,
    onSelect,
    selectedRowId,
    style,
  } = props;

  const [sortBy, setSortBy] = useState<
    Array<{ columnName: string; direction: "asc" | "desc" }>
  >([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<Schema<T>>();

  const allRows = useLiveQuery<Array<Schema<T>>, Array<never>>(
    async () => {
      // Dexie doesn't support multi-column sorting
      const rows = await db.table(dataStoreName).toArray();
      return sortByMultiple(rows, sortBy);
    },
    [dataStoreName, sortBy],
    []
  );

  const [selectedRow, unselectedRows, incompatibleRows] = useMemo(() => {
    let selectedRow: Schema<T> | undefined,
      unselectedRows: Array<Schema<T>> = [],
      incompatibleRows: Array<Schema<T>> = [];

    for (const row of allRows) {
      if (row.id === selectedRowId) {
        selectedRow = row;
      } else if (getIsBuildCompatible(row)) {
        unselectedRows.push(row);
      } else {
        incompatibleRows.push(row);
      }
    }

    return [selectedRow, unselectedRows, incompatibleRows];
  }, [selectedRowId, allRows, getIsBuildCompatible]);

  // TODO combine useLiveQuery and useMemo (return the memo value from useLiveQuery)
  // Otherwise the row state is stale when the table is re-rendered when dataStoreName changes

  const handleEdit = (row: Schema<T>) => {
    setEditRow(row);
    setEditModalOpen(true);
  };

  return (
    <Div.Container>
      <h2 className={classNames.tableName}>{dataStoreLabel}</h2>

      {selectedRow && (
        <Div.SelectedRow
          style={{
            gridTemplateColumns: `1fr repeat(${columns.length}, 1fr) auto`,
          }}
        >
          <TableRow
            columns={columns}
            onEdit={() => handleEdit(selectedRow)}
            onRemove={onRemove}
            row={selectedRow}
            rowIndex={0}
          />
        </Div.SelectedRow>
      )}

      <Div.TableFilters>
        <button onClick={() => setAddModalOpen(true)}>Add</button>
        <SortControls columns={columns} onChangeSort={setSortBy} />
      </Div.TableFilters>

      {/* Rows that are compatible with the current build */}
      <Div.Table
        style={{
          gridTemplateColumns: `1fr repeat(${columns.length}, 1fr) auto`,
          ...style,
        }}
      >
        {unselectedRows.map((row, rowI) => (
          <TableRow
            key={row.id}
            columns={columns}
            compareToRow={selectedRow}
            onEdit={() => handleEdit(row)}
            onSelect={onSelect}
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
        {selectedRow && unselectedRows.length === 0 && (
          <Div.EmptyState
            style={{ gridColumn: `1 / span ${columns.length + 2}` }}
          >
            No compatible components to compare
          </Div.EmptyState>
        )}
      </Div.Table>

      {/* Rows that are incompatible with the current build */}
      {incompatibleRows.length > 0 && (
        <>
          <h2 className={classNames.tableName}>
            Incompatible {dataStoreLabel}
          </h2>
          <Div.Table
            style={{
              gridTemplateColumns: `1fr repeat(${columns.length}, 1fr) auto`,
              ...style,
            }}
          >
            {incompatibleRows.map((row, rowI) => (
              <TableRow
                key={row.id}
                columns={columns}
                compareToRow={selectedRow}
                onEdit={() => handleEdit(row)}
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
        </>
      )}

      {addModalOpen && (
        <Modal>
          <h2>Add</h2>
          <Form
            schema={columns.map((column) => ({
              type: column.unit.dataType,
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

              await db.table(dataStoreName).add(data);

              setAddModalOpen(false);
            }}
          />
        </Modal>
      )}

      {editModalOpen && editRow && (
        <Modal>
          <h2>Edit</h2>
          <Form
            initialData={
              editRow as Record<Extract<keyof T, string>, number | string>
            }
            schema={columns.map((column) => ({
              type: column.unit.dataType,
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

              await db.table(dataStoreName).update(editRow.id, data);

              setEditRow(undefined);
              setEditModalOpen(false);
            }}
          />
        </Modal>
      )}
    </Div.Container>
  );
};
