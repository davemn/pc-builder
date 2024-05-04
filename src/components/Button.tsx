import { cx } from "lib/styles";

import classNames from "./Button.module.css";

export enum ButtonVariant {
  ACCENT,
  ACCENT_ACTIVE,
  /** @deprecated */
  ACTIVE,
  DEFAULT,
  DEFAULT_ACTIVE,
  NEGATIVE,
  NEGATIVE_ACTIVE,
}

export enum ButtonSize {
  NORMAL,
  LARGE,
}

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
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
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
        variant === ButtonVariant.DEFAULT_ACTIVE && "variantDefaultActive",
        variant === ButtonVariant.ACTIVE && "variantActive",
        variant === ButtonVariant.ACCENT && "variantAccent",
        variant === ButtonVariant.ACCENT_ACTIVE && "variantAccentActive",
        variant === ButtonVariant.NEGATIVE && "variantNegative",
        variant === ButtonVariant.NEGATIVE_ACTIVE && "variantNegativeActive"
      )} ${classNameProp ?? ""}`}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
};
