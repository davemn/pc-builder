import { useState } from "react";

import { Button, ButtonVariant } from "components/Button";
import { useLiveQuery } from "hooks/useLiveQuery";
import { db } from "lib/db";

import classNames from "./Form.module.css";

interface FormProps {
  className?: string;
  initialData?: Record<string, number | string>;
  onCancel?: () => void;
  onSubmit: (data: Record<string, any>) => void;
  schema: Array<{
    dataType: "text" | "numeric" | "currency";
    label: string;
    name: string;
    // multiple?: boolean;
  }>;
}

// Example usage:
// if (field.type === "select") {
//   return (
//     <StoredSelect
//       key={field.name}
//       tableName={field.name}
//       label={field.label}
//       multiple={field.multiple}
//     />
//   );
// }

interface SelectProps {
  tableName: string;
  label: string;
  multiple?: boolean;
}

/** @deprecated */
const StoredSelect = (props: SelectProps) => {
  const { tableName, label, multiple = false } = props;

  const rows = useLiveQuery(
    () => db.table(tableName).toCollection().sortBy("name"),
    [tableName]
  );

  return (
    <div className={classNames.fieldContainer}>
      <label>{label}</label>
      <div className={classNames.selectContainer}>
        <select name={tableName} multiple={multiple}>
          {rows?.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <Button
          className={classNames.addButton}
          type="button"
          onClick={() => {}}
        >
          +
        </Button>
      </div>
    </div>
  );
};

export const Form = (props: FormProps) => {
  const {
    className: classNameProp,
    initialData,
    onCancel,
    onSubmit,
    schema,
  } = props;

  const [data, setData] = useState(() => {
    return Object.fromEntries(
      schema.map((field) => {
        const defaultFieldValue: string | number =
          field.dataType === "numeric" || field.dataType === "currency"
            ? 0
            : "";

        let fieldValue = defaultFieldValue;

        if (initialData) {
          const rawFieldValue = initialData[field.name];
          if (field.dataType === "numeric" || field.dataType === "currency") {
            fieldValue = parseFloat(rawFieldValue as string);
          } else {
            fieldValue = `${rawFieldValue}`;
          }
        }

        return [field.name, fieldValue];
      })
    );
  });

  // const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  //   e.preventDefault();
  //   const data = Object.fromEntries(new FormData(e.currentTarget).entries());
  //   onSubmit(data);
  // };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(data);
  };

  return (
    <form
      className={[classNames.form, classNameProp].join(" ")}
      onSubmit={handleSubmit}
    >
      {schema.map((field) => {
        if (field.dataType === "text") {
          return (
            <div key={field.name} className={classNames.fieldContainer}>
              <label>{field.label}</label>
              <input
                type="text"
                name={field.name}
                onChange={(e) => {
                  const value = e.currentTarget.value;
                  setData((prevData) => ({
                    ...prevData,
                    [field.name]: value,
                  }));
                }}
                value={data[field.name]}
              />
            </div>
          );
        } else if (
          field.dataType === "numeric" ||
          field.dataType === "currency"
        ) {
          return (
            <div key={field.name} className={classNames.fieldContainer}>
              <label>{field.label}</label>
              <input
                type="number"
                name={field.name}
                onChange={(e) => {
                  let value = parseFloat(e.currentTarget.value);
                  if (isNaN(value)) {
                    value = 0;
                  }
                  setData((prevData) => ({
                    ...prevData,
                    [field.name]: value,
                  }));
                }}
                value={data[field.name]}
              />
            </div>
          );
        }
      })}
      <div className={classNames.actions}>
        <Button onClick={() => onCancel?.()}>Cancel</Button>
        <Button type="submit" variant={ButtonVariant.ACTIVE}>
          Save
        </Button>
      </div>
    </form>
  );
};
