import type { InputHTMLAttributes } from "react";

import { cx } from "lib/styles";

import classNames from "./Input.module.css";

export enum InputVariant {
  DEFAULT,
  INLINE,
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  labelText: string;
  variant?: InputVariant;
}

export const Input = (props: InputProps) => {
  const { labelText, variant = InputVariant.DEFAULT, ...rest } = props;

  return (
    <div
      className={`${cx(
        classNames,
        "inputContainer",
        variant === InputVariant.DEFAULT && "variantDefault",
        variant === InputVariant.INLINE && "variantInline"
      )}`}
    >
      <label>{labelText}</label>
      <input {...rest} />
    </div>
  );
};
