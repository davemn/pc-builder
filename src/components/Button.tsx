import { cx } from "lib/styles";

import classNames from "./Button.module.css";

export enum ButtonVariant {
  ACTIVE,
  DEFAULT,
}

export enum ButtonSize {
  NORMAL,
  LARGE,
}

// interface ButtonProps {
//   children: React.ReactNode;
//   className?: string;
//   onClick: () => void;
//   type?: "button" | "submit";
//   variant?: ButtonVariant;
// }

type ButtonProps = {
  children: React.ReactNode;
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
} & (
  | {
      type: "submit";
      onClick?: never;
    }
  | {
      type?: "button";
      onClick: () => void;
    }
);

export const Button = (props: ButtonProps) => {
  const {
    children,
    className: classNameProp,
    onClick,
    size = ButtonSize.NORMAL,
    type = "button",
    variant = ButtonVariant.DEFAULT,
  } = props;

  return (
    <button
      className={`${cx(
        classNames,
        "button",
        size === ButtonSize.NORMAL && "sizeNormal",
        size === ButtonSize.LARGE && "sizeLarge",
        variant === ButtonVariant.DEFAULT && "variantDefault",
        variant === ButtonVariant.ACTIVE && "variantActive"
      )} ${classNameProp ?? ""}`}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
};
