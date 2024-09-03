import { SyncIcon } from "@primer/octicons-react";
import { useState } from "react";

import { Button, ButtonVariant } from "components/Button";
import { useComponent } from "hooks/useComponent";
import { BuildComponentStoreName } from "lib/build";
import { ColumnDefinition } from "lib/columns";
import { makeClassNamePrimitives } from "lib/styles";

import { PriceHistoryModal } from "./PriceHistoryModal";

import classNames from "./ComparisonTable.module.css";

const { Div, Span } = makeClassNamePrimitives(classNames);

interface TableRowProps<T extends BuildComponentStoreName> {
  columns: Array<ColumnDefinition<T>>;
  compareToRowId?: number;
  componentType: T;
  onEdit: (id: number) => void;
  onRemove?: (id: number) => void;
  onSelect?: (id: number) => void;
  rowId: number;
  rowIndex: number;
  editButtonVariant?: ButtonVariant;
  removeButtonVariant?: ButtonVariant;
  selectButtonVariant?: ButtonVariant;
}

export const TableRow = <T extends BuildComponentStoreName>(
  props: TableRowProps<T>
) => {
  const {
    columns,
    compareToRowId,
    componentType,
    onEdit,
    onRemove,
    onSelect,
    rowId,
    rowIndex,
    editButtonVariant = ButtonVariant.DEFAULT,
    removeButtonVariant = ButtonVariant.ACCENT,
    selectButtonVariant = ButtonVariant.DEFAULT,
  } = props;

  const { component: row, isPending } = useComponent(componentType, rowId);

  const { component: compareToRow } = useComponent(
    componentType,
    compareToRowId
  );

  const [priceHistoryModalOpen, setPriceHistoryModalOpen] = useState(false);

  if (isPending || !row) {
    return null;
  }

  // TODO move to standalone component
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
        <PriceHistoryModal
          componentType={componentType}
          onClose={() => setPriceHistoryModalOpen(false)}
          row={row}
        />
      )}
    </>
  );
};
