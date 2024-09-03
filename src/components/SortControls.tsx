import { ChevronDownIcon, XIcon } from "@primer/octicons-react";

import { Button, ButtonVariant } from "components/Button";
import { SortDirection, SortDirectionLabel } from "lib/constants";
import { makeClassNamePrimitives } from "lib/styles";

import classNames from "./SortControls.module.css";

const { Div, Span } = makeClassNamePrimitives(classNames);

interface Column {
  label: string;
  name: string;
}

interface SortControlProps {
  columns: Array<Column>;
  onChangeSort: (
    sortBy: Array<{ columnName: string; direction: SortDirection }>
  ) => void;
  sortBy: Array<{ columnName: string; direction: SortDirection }>;
}

export const SortControls = (props: SortControlProps) => {
  const { columns: allColumns, onChangeSort, sortBy } = props;

  const activeSortColumns: Array<{
    columnIndex: number;
    direction: SortDirection;
  }> = sortBy.map(({ columnName, direction }) => ({
    columnIndex: allColumns.findIndex((column) => column.name === columnName),
    direction,
  }));

  const inactiveSortColumns: Array<number> = allColumns.flatMap((_, i) =>
    activeSortColumns.some(({ columnIndex }) => columnIndex === i) ? [] : [i]
  );

  return (
    <Div.SortControls>
      {inactiveSortColumns.map((columnIndex) => (
        <Div.SelectContainer key={`inactive-${columnIndex}`}>
          <select
            name={allColumns[columnIndex].name}
            defaultValue=""
            onChange={(e) => {
              const direction = e.target.value as SortDirection;
              onChangeSort([
                ...sortBy,
                {
                  columnName: allColumns[columnIndex].name,
                  direction,
                },
              ]);
            }}
          >
            <option value="">{allColumns[columnIndex].label}</option>
            <option value={SortDirection.ASC}>Low to High</option>
            <option value={SortDirection.DESC}>High to Low</option>
          </select>
          <Div.IconContainer>
            <ChevronDownIcon size="small" />
          </Div.IconContainer>
        </Div.SelectContainer>
      ))}

      {activeSortColumns.map(({ columnIndex, direction }) => (
        <Button
          key={`active-${columnIndex}`}
          onClick={() => {
            onChangeSort(
              sortBy.filter(
                ({ columnName }) => columnName !== allColumns[columnIndex].name
              )
            );
          }}
          variant={ButtonVariant.ACTIVE}
        >
          Sort: {allColumns[columnIndex].label} ({SortDirectionLabel[direction]}
          ) <XIcon />
        </Button>
      ))}
    </Div.SortControls>
  );
};
