import { cx } from "lib/styles";

import classNames from "./Button.module.css";

export enum ButtonVariant {
  ACTIVE,
  DEFAULT,
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
    type = "button",
    variant = ButtonVariant.DEFAULT,
  } = props;

  return (
    <button
      className={cx(
        classNames,
        "button",
        variant === ButtonVariant.DEFAULT && "variantDefault",
        variant === ButtonVariant.ACTIVE && "variantActive",
        classNameProp ?? false
      )}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
};
