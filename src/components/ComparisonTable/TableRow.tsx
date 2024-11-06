import { SyncIcon } from "@primer/octicons-react";
import * as React from "react";

import { Button, ButtonVariant } from "components/Button";
import { useComponent } from "hooks/useComponent";
import { useRetailerLinks } from "hooks/useRetailerLinks";
import { BuildComponentStoreName } from "lib/build";
import { ColumnDefinition, ColumnGroupDefinition } from "lib/columns";
import { formatTimeFromNow } from "lib/format";
import { makeClassNamePrimitives } from "lib/styles";

import classNames from "./ComparisonTable.module.css";

const { Div, Span } = makeClassNamePrimitives(classNames);

interface TableRowProps<T extends BuildComponentStoreName> {
  columns: Array<ColumnDefinition<T>>;
  columnGroups: Array<ColumnGroupDefinition<T>>;
  compareToRowId?: number;
  componentType: T;
  onEdit: (id: number) => void;
  onEditPriceHistory: (id: number) => void;
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
    columnGroups,
    compareToRowId,
    componentType,
    onEdit,
    onEditPriceHistory,
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

  const { retailerLinks } = useRetailerLinks(componentType, row?.id);

  if (isPending || !row) {
    return null;
  }

  const favoriteProductLink = retailerLinks.find((link) => link.isFavorite);
  const latestPriceHistory = favoriteProductLink?.priceHistory[0];

  const renderCellValue = (column: ColumnDefinition<T>) => {
    let value;
    if (column.name === "price") {
      value = latestPriceHistory?.price ?? 0;
    } else {
      value = row[column.name];
    }
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

    if (!compareToRow || column.name === "price") {
      return <Span.CellValueNeutral>{valueText}</Span.CellValueNeutral>;
    }

    // TODO compare price to compareToRow

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

  const renderLabelledCellValue = (
    column: ColumnDefinition<T>,
    showInlineLabel = false
  ) => {
    if (!showInlineLabel) {
      return (
        <React.Fragment key={`${row.id}-${column.name}`}>
          {renderCellValue(column)}
        </React.Fragment>
      );
    }
    return (
      <Div.LabelledCellValue key={`${row.id}-${column.name}`}>
        <Span.CellValueLabel>{column.label}</Span.CellValueLabel>
        {renderCellValue(column)}
      </Div.LabelledCellValue>
    );
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
              onClick={() => onEditPriceHistory(row.id)}
            >
              {renderCellValue(column)}
              <SyncIcon size="small" />
            </button>
            {favoriteProductLink && latestPriceHistory && (
              <>
                <Div.CellStoreName>
                  {favoriteProductLink.retailerName}
                </Div.CellStoreName>
                <Div.CellLastUpdate>
                  {formatTimeFromNow(latestPriceHistory.date)}
                </Div.CellLastUpdate>
              </>
            )}
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

  const renderGroupCell = (group: ColumnGroupDefinition<T>) => {
    const cellStyle = {
      ...(rowIndex > 0 ? { borderTop: "1px solid var(--dark0)" } : {}),
    };

    const groupColumns = group.columns
      .map((groupColumnOrName) => {
        if (typeof groupColumnOrName === "string") {
          return columns.find((column) => column.name === groupColumnOrName);
        }

        const column = columns.find(
          (column) => column.name === groupColumnOrName.name
        );

        if (!column) {
          return;
        }

        return {
          ...column,
          label: groupColumnOrName.label,
        };
      })
      .filter((value) => value !== undefined);

    return (
      <Div.Cell key={`${row.id}-${group.label}`} style={cellStyle}>
        <Span.CellName>{group.label}</Span.CellName>
        {groupColumns.map((column) =>
          renderLabelledCellValue(column, groupColumns.length > 1)
        )}
      </Div.Cell>
    );
  };

  return (
    <>
      {columnGroups.map(renderGroupCell)}
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
    </>
  );
};
