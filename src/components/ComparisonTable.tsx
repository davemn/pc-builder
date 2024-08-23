import { SyncIcon } from "@primer/octicons-react";
import React, { useContext, useEffect, useState } from "react";

import { Button, ButtonVariant } from "components/Button";
import { Form } from "components/Form";
import { Modal, ModalVariant } from "components/Modal";
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
import { RetailerByHostName, RetailerLabel } from "lib/retailer";
import { cx, makeClassNamePrimitives } from "lib/styles";

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

interface TableRowProps<T extends BuildComponentStoreName> {
  columns: Array<ColumnDefinition<T>>;
  compareToRow?: Schema<T>;
  componentTypeSingularLabel: string;
  onEdit: (id: number) => void;
  onRemove?: (id: number) => void;
  onSelect?: (id: number) => void;
  row: Schema<T>;
  rowIndex: number;
  editButtonVariant?: ButtonVariant;
  removeButtonVariant?: ButtonVariant;
  selectButtonVariant?: ButtonVariant;
}

const TableRow = <T extends BuildComponentStoreName>(
  props: TableRowProps<T>
) => {
  const {
    columns,
    compareToRow,
    componentTypeSingularLabel,
    onEdit,
    onRemove,
    onSelect,
    row,
    rowIndex,
    editButtonVariant = ButtonVariant.DEFAULT,
    removeButtonVariant = ButtonVariant.ACCENT,
    selectButtonVariant = ButtonVariant.DEFAULT,
  } = props;

  const [priceHistoryModalOpen, setPriceHistoryModalOpen] = useState(false);
  const [addStoreLinkModalOpen, setAddStoreLinkModalOpen] = useState(false);

  const renderCellValue = (column: ColumnDefinition<T>) => {
    const value = row[column.name];
    let valueText: string;

    switch (column.unit.dataType) {
      case "numeric":
      case "currency":
        if (typeof value !== "number") {
          console.warn(
            `Expected numeric value for column "${
              column.name
            }", got ${JSON.stringify(value)}`
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
      case "currency":
        if (typeof value !== "number" || typeof compareToValue !== "number") {
          console.warn(
            `Expected numeric value for column "${
              column.name
            }", got ${JSON.stringify(value)} and ${JSON.stringify(
              compareToValue
            )}`
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

  const renderCell = (column: ColumnDefinition<T>) => {
    const cellStyle = {
      ...(rowIndex > 0 ? { borderTop: "1px solid var(--dark0)" } : {}),
    };

    switch (column.name) {
      case "name":
        return (
          <Div.Cell key={`${row.id}-${column.name}`} style={cellStyle}>
            {renderCellValue(column)}
          </Div.Cell>
        );
      case "price":
        return (
          <Div.Cell
            key={`${row.id}-${column.name}`}
            style={{
              ...cellStyle,
              gap: "4px",
            }}
          >
            <Span.CellName>{column.label}</Span.CellName>
            <button
              className={classNames.cellPriceRefreshButton}
              onClick={() => setPriceHistoryModalOpen(true)}
            >
              {renderCellValue(column)}
              <SyncIcon size="small" />
            </button>
            <Div.CellStoreName>B&H Photo Video</Div.CellStoreName>
            <Div.CellLastUpdate>1 week ago</Div.CellLastUpdate>
          </Div.Cell>
        );
      default:
        return (
          <Div.Cell key={`${row.id}-${column.name}`} style={cellStyle}>
            <Span.CellName>{column.label}</Span.CellName>
            {renderCellValue(column)}
          </Div.Cell>
        );
    }
  };

  return (
    <>
      {columns.map(renderCell)}
      <Div.ActionCell
        key={`${row.id}-actions}`}
        style={{
          ...(rowIndex > 0 ? { borderTop: "1px solid var(--dark0)" } : {}),
        }}
      >
        <Button onClick={() => onEdit(row.id)} variant={editButtonVariant}>
          Edit
        </Button>
        {onRemove && (
          <Button
            onClick={() => onRemove(row.id)}
            variant={removeButtonVariant}
          >
            Remove
          </Button>
        )}
        {onSelect && (
          <Button
            onClick={() => onSelect(row.id)}
            variant={selectButtonVariant}
          >
            Select
          </Button>
        )}
      </Div.ActionCell>
      {priceHistoryModalOpen && (
        <Modal variant={ModalVariant.RIGHT_SIDE}>
          <Div.PriceModal>
            <Div.PriceModalHeadingContainer>
              <h2 className={classNames.priceModalHeading}>Price History</h2>
              <Button
                onClick={() => setPriceHistoryModalOpen(false)}
                variant={ButtonVariant.DEFAULT}
              >
                Close
              </Button>
            </Div.PriceModalHeadingContainer>
            <h1>{row.name}</h1>
            <Button
              onClick={() => setAddStoreLinkModalOpen(true)}
              variant={ButtonVariant.ACCENT}
            >
              Add Store Link
            </Button>
            <p className={classNames.priceModalPlaceholder}>
              This {componentTypeSingularLabel} isn't linked to any current
              store listing. Add a link above to start tracking its price. Add
              multiple links to track the price of the same{" "}
              {componentTypeSingularLabel} across several retailers.
            </p>
          </Div.PriceModal>
        </Modal>
      )}
      {addStoreLinkModalOpen && (
        <Modal>
          <h2 className={classNames.modalTitle}>Add Store Link</h2>
          <p className={classNames.modalDescription}>
            Find a <strong>{row.name}</strong> listing you like on a retailer's
            website and paste the URL here.
          </p>
          <Form
            schema={[
              {
                dataType: "text",
                name: "link",
                label: "Product Listing URL",
              },
              {
                dataType: "text",
                name: "name",
                label: "Store Name",
              },
            ]}
            onCancel={() => setAddStoreLinkModalOpen(false)}
            onInputBlur={(fieldName, value, setField) => {
              if (fieldName !== "link") {
                return;
              }

              if (!value || typeof value !== "string") {
                return;
              }

              try {
                const url = new URL(value);
                const retailer = RetailerByHostName[url.hostname];

                if (retailer) {
                  setField("name", RetailerLabel[retailer]);
                } else {
                  // If we don't recognize the retailer, just use the hostname
                  setField("name", url.hostname);
                }
              } catch (e) {
                return;
              }
            }}
            onSubmit={(data) => {
              // TODO actually save the link
              console.log(data);
              setAddStoreLinkModalOpen(false);
            }}
          />
        </Modal>
      )}
    </>
  );
};

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

  const {
    pluralName: componentTypePluralLabel,
    singularName: componentTypeSingularLabel,
  } = BuildComponentMeta[dataStoreName];

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
                componentTypeSingularLabel={componentTypeSingularLabel}
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
              componentTypeSingularLabel={componentTypeSingularLabel}
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
                  componentTypeSingularLabel={componentTypeSingularLabel}
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
