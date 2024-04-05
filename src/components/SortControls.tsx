import { useEffect, useReducer, useRef } from "react";

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
}

interface SortControlsState {
  allColumns: Array<Column>;
  activeSortColumns: Array<{
    columnIndex: number;
    direction: SortDirection;
  }>;
  inactiveSortColumns: Array<number>;
}

interface SortControlActivateAction {
  type: "activate";
  payload: { columnIndex: number; direction: SortDirection };
}

interface SortControlDeactivateAction {
  type: "deactivate";
  payload: number;
}

const SortControlActions = {
  activate: (
    columnIndex: number,
    direction: SortDirection
  ): SortControlActivateAction => ({
    type: "activate" as const,
    payload: { columnIndex, direction },
  }),
  deactivate: (columnIndex: number): SortControlDeactivateAction => ({
    type: "deactivate" as const,
    payload: columnIndex,
  }),
};

const sortControlsReducer: React.Reducer<
  SortControlsState,
  SortControlActivateAction | SortControlDeactivateAction
> = (state, action) => {
  switch (action.type) {
    // lol block scope in switch
    case "activate": {
      const { columnIndex, direction } = action.payload;

      return {
        ...state,
        activeSortColumns: [
          ...state.activeSortColumns,
          { columnIndex, direction },
        ],
        inactiveSortColumns: state.inactiveSortColumns.filter(
          (column) => column !== columnIndex
        ),
      };
    }

    case "deactivate": {
      const deactivatedIndex = action.payload;

      // preserve original order of inactive columns
      const newInactiveSortColumns = state.allColumns.flatMap((_, i) =>
        state.inactiveSortColumns.includes(i) || i === deactivatedIndex
          ? [i]
          : []
      );

      return {
        ...state,
        activeSortColumns: state.activeSortColumns.filter(
          ({ columnIndex }) => columnIndex !== deactivatedIndex
        ),
        inactiveSortColumns: newInactiveSortColumns,
      };
    }

    default:
      return state;
  }
};

export const SortControls = (props: SortControlProps) => {
  const { columns, onChangeSort } = props;

  const sortChanged = useRef<boolean>(false);

  const [state, dispatch] = useReducer(sortControlsReducer, {
    allColumns: columns,
    activeSortColumns: [],
    inactiveSortColumns: Array.from({ length: columns.length }, (_, i) => i),
  });

  // Show inactive columns first, followed by active columns

  useEffect(() => {
    if (sortChanged.current) {
      onChangeSort(
        state.activeSortColumns.map(({ columnIndex, direction }) => ({
          columnName: columns[columnIndex].name,
          direction,
        }))
      );
      sortChanged.current = false;
    }
  }, [state]);

  return (
    <Div.SortControls>
      {state.inactiveSortColumns.map((columnIndex) => (
        <select
          key={`inactive-${columnIndex}`}
          name={columns[columnIndex].name}
          defaultValue=""
          onChange={(e) => {
            const direction = e.target.value as SortDirection;
            dispatch(SortControlActions.activate(columnIndex, direction));
            sortChanged.current = true;
          }}
        >
          <option value="">{columns[columnIndex].label}</option>
          <option value={SortDirection.ASC}>Low to High</option>
          <option value={SortDirection.DESC}>High to Low</option>
        </select>
      ))}

      {state.activeSortColumns.map(({ columnIndex, direction }) => (
        <button
          key={`active-${columnIndex}`}
          className={classNames.activeButton}
          onClick={() => {
            dispatch(SortControlActions.deactivate(columnIndex));
            sortChanged.current = true;
          }}
        >
          Sort: {columns[columnIndex].label} ({SortDirectionLabel[direction]})
        </button>
      ))}
    </Div.SortControls>
  );
};
