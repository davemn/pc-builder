import { CheckIcon, SortDescIcon } from "@primer/octicons-react";
import { createRef, useCallback, useEffect, useMemo, useState } from "react";

import { Modal, ModalVariant } from "components/Modal";
import { BuildComponentStoreName } from "lib/build";
import { ColumnDefinition, Unit } from "lib/columns";
import {
  NumericSortDirectionLabel,
  SortDirection,
  TextSortDirectionLabel,
} from "lib/constants";
import * as Query from "lib/query";
import { makeClassNamePrimitives } from "lib/styles";

import classNames from "./TableFilters.module.css";

const { Div, Span } = makeClassNamePrimitives(classNames);

interface MenuButtonProps {
  isChecked?: boolean;
  isDisabled?: boolean;
  name: string;
  onClick: (name: string) => void;
  showChecked?: boolean;
  value: string;
}

const MenuButton = (props: MenuButtonProps) => {
  const {
    isChecked = false,
    isDisabled = false,
    name,
    onClick,
    showChecked = false,
    value,
  } = props;

  return (
    <Div.MenuButton onClick={() => !isDisabled && onClick(name)}>
      {showChecked && (
        <Div.IconContainer>
          {isChecked && <CheckIcon size={24} />}
        </Div.IconContainer>
      )}
      <span>{name}</span>
      <Span.FilterValue>{value}</Span.FilterValue>
    </Div.MenuButton>
  );
};

interface PopoverMenuProps {
  isNested?: boolean;
  isOpen: boolean;
  onClose: () => void;
  renderButton: () => React.ReactNode;
  renderMenu: () => React.ReactNode;
}

export const PopoverMenu = (props: PopoverMenuProps) => {
  const { isNested, isOpen, onClose, renderButton, renderMenu } = props;

  const buttonRef = createRef<HTMLDivElement>();

  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const { left, top, width, height } =
        buttonRef.current.getBoundingClientRect();

      setMenuPos({
        left: left + width + 12,
        top,
      });
    }
  }, [isOpen]);

  return (
    <Div.Container style={isNested ? { width: "100%" } : undefined}>
      <div ref={buttonRef}>{renderButton()}</div>
      {isOpen && (
        <Modal
          onClickOverlay={onClose}
          style={{
            ...menuPos,
          }}
          variant={ModalVariant.MENU}
        >
          <Div.ModalContainer
            onClick={(event) => {
              // Clicks within the menu area should not continue propagating to the ancestor modal
              // overlay, which would cause the modal to close.
              event.stopPropagation();
            }}
          >
            {renderMenu()}
          </Div.ModalContainer>
        </Modal>
      )}
    </Div.Container>
  );
};

interface LabelledValue {
  label?: string;
  value: string | number;
}

interface OptionsMenuItemProps {
  checkedValues: Array<string | number>;
  isDisabled?: boolean;
  isExclusive: boolean;
  name: string;
  onChangeCheckedValues: (values: Array<string | number>) => void;
  labelledValues: Array<LabelledValue>;
}

const OptionsMenuButton = (props: OptionsMenuItemProps) => {
  const {
    checkedValues,
    isDisabled = false,
    isExclusive,
    labelledValues,
    name,
    onChangeCheckedValues,
  } = props;

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const onCheckValue = (newValue: string | number) => {
    let newCheckedValues;
    if (checkedValues.includes(newValue)) {
      newCheckedValues = isExclusive
        ? []
        : checkedValues.filter((v) => v !== newValue);
    } else {
      newCheckedValues = isExclusive
        ? [newValue]
        : [...checkedValues, newValue];
    }

    if (isExclusive) {
      setIsMenuOpen(false);
    }
    onChangeCheckedValues(newCheckedValues);
  };

  const checkedValuesSummary = useMemo(() => {
    if (checkedValues.length === 0) {
      return "";
    }

    if (checkedValues.length === 1) {
      const labelledValue = labelledValues.find(
        ({ value }) => value === checkedValues[0]
      );
      return labelledValue?.label ?? labelledValue?.value ?? checkedValues[0];
    }

    return `${checkedValues.length}`;
  }, [checkedValues, labelledValues]);

  return (
    <PopoverMenu
      isNested={true}
      isOpen={isMenuOpen}
      onClose={() => setIsMenuOpen(false)}
      renderButton={() => (
        <MenuButton
          isDisabled={isDisabled}
          name={name}
          onClick={() => setIsMenuOpen(true)}
          value={`${checkedValuesSummary}`}
        />
      )}
      renderMenu={() =>
        labelledValues.map(({ label, value }) => (
          <MenuButton
            isChecked={checkedValues.includes(value)}
            key={label ?? `${value}`}
            name={label ?? `${value}`}
            onClick={() => onCheckValue(value)}
            showChecked={true}
            value=""
          />
        ))
      }
    />
  );
};

interface SortByMenuButtonProps<T extends BuildComponentStoreName> {
  columns: Array<ColumnDefinition<T>>;
  onChangeSort: (sortBy: Array<ActiveSortColumn>) => void;
  sortBy: Array<ActiveSortColumn>;
}

const SortByMenuButton = <T extends BuildComponentStoreName>(
  props: SortByMenuButtonProps<T>
) => {
  const { columns, sortBy, onChangeSort } = props;

  const getLabelledValue = useCallback(
    (column: ColumnDefinition<T>, direction: SortDirection) => {
      let label: string;
      switch (column.unit.dataType) {
        case "numeric":
          label = `${column.label} (${NumericSortDirectionLabel[direction]})`;
          break;
        case "text":
        default:
          label = `${column.label} (${TextSortDirectionLabel[direction]})`;
          break;
      }

      return { label, value: `${column.name},${direction}` };
    },
    []
  );

  // TODO memoize
  const labelledValues = columns.flatMap((column) => {
    return [
      getLabelledValue(column, SortDirection.ASC),
      getLabelledValue(column, SortDirection.DESC),
    ];
  });

  const checkedValues = sortBy.flatMap((sort) => {
    const column = columns.find((c) => c.name === sort.columnName);

    if (!column) {
      console.warn(`No matching column to sort by: ${sort.columnName}`);
      return [];
    }

    return [getLabelledValue(column, sort.direction).value];
  });

  return (
    <OptionsMenuButton
      checkedValues={checkedValues}
      isExclusive={true}
      labelledValues={labelledValues}
      name="Sort by"
      onChangeCheckedValues={(values) => {
        onChangeSort(
          (values as string[]).map((value) => {
            const [columnName, direction] = value.split(",");

            const directionValue = direction as "asc" | "desc";

            return {
              columnName,
              direction: directionValue as SortDirection,
            };
          })
        );
      }}
    />
  );
};

interface ColumnFilterMenuButtonProps<T extends BuildComponentStoreName> {
  column: ColumnDefinition<T>;
  componentType: T;
}

const ColumnFilterMenuButton = <T extends BuildComponentStoreName>(
  props: ColumnFilterMenuButtonProps<T>
) => {
  const { column, componentType } = props;

  const [isLoading, setIsLoading] = useState(true);

  // TODO move this state to props, control from parent
  const [activeFilterValues, setActiveFilterValues] = useState<
    Array<string | number>
  >([]);
  const [allFilterValues, setAllFilterValues] = useState<Array<LabelledValue>>(
    []
  );

  useEffect(() => {
    const fetchValues = async () => {
      let formattedValues: LabelledValue[];

      switch (column.unit) {
        case Unit.CURRENCY:
          formattedValues = [
            { value: "Under $100" },
            { value: "$100 - $250" },
            { value: "$250 - $500" },
            { value: "Over $500" },
          ];
          break;
        default:
          // Not relying on a query hook here because there are too many places that
          // query would need to be invalidated.
          const columnValues = await Query.getUniqueComponentColumnValues({
            componentType,
            columnName: column.name,
          });
          formattedValues = columnValues.map((columnValue) => {
            switch (column.unit.dataType) {
              case "numeric":
              default:
                return {
                  label: column.unit.format(parseFloat(columnValue as string)),
                  value: columnValue,
                };
              case "text":
                return {
                  label: column.unit.format(`${columnValue}`),
                  value: columnValue,
                };
            }
          });
          break;
      }

      return formattedValues;
    };

    // fetchValues();
    Promise.all([
      fetchValues(),
      /* force a minimum loading time so placeholder displays fully */
      new Promise((resolve) => setTimeout(resolve, 200)),
    ]).then(([values]) => {
      setAllFilterValues(values);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <Div.MenuButtonPlaceholder>
        <Span.Skeleton />
      </Div.MenuButtonPlaceholder>
    );
  }

  return (
    <OptionsMenuButton
      checkedValues={activeFilterValues}
      isExclusive={false}
      labelledValues={allFilterValues}
      name={column.label}
      onChangeCheckedValues={setActiveFilterValues}
    />
  );
};

type ActiveSortColumn = { columnName: string; direction: SortDirection };
type ActiveFilterColumn = { columnName: string; values: string[] | number[] };

interface TableFiltersProps<T extends BuildComponentStoreName> {
  columns: Array<ColumnDefinition<T>>;
  componentType: T;
  // TODO control <SortByMenuButton /> and <ColumnFilterMenuButton /> state
  onChangeSort: (sortBy: Array<ActiveSortColumn>) => void;
  sortBy: Array<ActiveSortColumn>;
}

export const TableFilters = <T extends BuildComponentStoreName>(
  props: TableFiltersProps<T>
) => {
  const { columns, componentType, onChangeSort, sortBy } = props;

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const sortableColumns = [...columns];

  // Every product name is effectively unique, so a name filter isn't useful
  const filterableColumns = columns.filter((column) => column.name !== "name");

  return (
    <PopoverMenu
      isOpen={isMenuOpen}
      onClose={() => setIsMenuOpen(false)}
      renderButton={() => (
        <Div.ButtonIconContainer onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <SortDescIcon size={24} />
        </Div.ButtonIconContainer>
      )}
      renderMenu={() => (
        <>
          <SortByMenuButton
            key="sort"
            columns={sortableColumns}
            onChangeSort={onChangeSort}
            sortBy={sortBy}
          />
          <Div.MenuItemLabel>Filters</Div.MenuItemLabel>
          {filterableColumns.map((column) => (
            <ColumnFilterMenuButton
              key={column.name}
              column={column}
              componentType={componentType}
            />
          ))}
        </>
      )}
    />
  );
};
