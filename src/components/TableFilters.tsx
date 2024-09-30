import { CheckIcon, SortDescIcon } from "@primer/octicons-react";
import { createRef, useEffect, useState } from "react";

import { Modal, ModalVariant } from "components/Modal";
import { BuildComponentStoreName } from "lib/build";
import { ColumnDefinition, Unit } from "lib/columns";
import { SortDirection, SortDirectionLabel } from "lib/constants";
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

interface OptionsMenuItemProps {
  isDisabled?: boolean;
  isExclusive: boolean;
  name: string;
  onChangeValue?: (value: string | string[]) => void;
  values: string[];
}

const OptionsMenuButton = (props: OptionsMenuItemProps) => {
  const {
    isDisabled = false,
    isExclusive,
    name,
    onChangeValue,
    values,
  } = props;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [checkedValues, setCheckedValues] = useState<string[]>([]);

  const onSelectValue = (newValue: string) => {
    if (checkedValues.includes(newValue)) {
      setCheckedValues(
        isExclusive ? [] : checkedValues.filter((v) => v !== newValue)
      );
    } else {
      setCheckedValues(isExclusive ? [newValue] : [...checkedValues, newValue]);
    }

    if (isExclusive) {
      setIsMenuOpen(false);
    }
    onChangeValue?.(checkedValues);
  };

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
          value={
            isExclusive
              ? checkedValues[0] || ""
              : `${checkedValues.length || ""}`
          }
        />
      )}
      renderMenu={() =>
        values.map((name) => (
          <MenuButton
            isChecked={checkedValues.includes(name)}
            key={name}
            name={name}
            onClick={onSelectValue}
            showChecked={true}
            value=""
          />
        ))
      }
    />
  );
};

const SortByMenuButton = () => {
  return (
    <OptionsMenuButton
      isExclusive={true}
      name="Sort by"
      values={[
        "Price (Low - High)",
        "Price (High - Low)",
        "Name (A - Z)",
        "Name (Z - A)",
      ]}
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
  const [filterValues, setFilterValues] = useState<string[]>([]);

  useEffect(() => {
    const fetchValues = async () => {
      let formattedValues: string[];

      switch (column.unit) {
        case Unit.CURRENCY:
          formattedValues = [
            "Under $100",
            "$100 - $250",
            "$250 - $500",
            "Over $500",
          ];
          break;
        default:
          // Not relying on a query hook here because there are too many places that
          // query would need to be invalidated.
          const values = await Query.getUniqueComponentColumnValues({
            componentType,
            columnName: column.name,
          });
          formattedValues = values.map((value) => {
            switch (column.unit.dataType) {
              case "numeric":
              default:
                return column.unit.format(parseFloat(value as string));
              case "text":
                return column.unit.format(`${value}`);
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
      setFilterValues(values);
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
      isExclusive={false}
      name={column.label}
      values={filterValues}
    />
  );
};

interface TableFiltersProps<T extends BuildComponentStoreName> {
  columns: Array<ColumnDefinition<T>>;
  componentType: T;
  // TODO control <SortByMenuButton /> and <ColumnFilterMenuButton /> state
  onChangeSort: (
    sortBy: Array<{ columnName: string; direction: SortDirection }>
  ) => void;
  sortBy: Array<{ columnName: string; direction: SortDirection }>;
}

export const TableFilters = <T extends BuildComponentStoreName>(
  props: TableFiltersProps<T>
) => {
  const { columns, componentType } = props;

  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
          <SortByMenuButton key="sort" />
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
