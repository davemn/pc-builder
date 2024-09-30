import { useContext, useEffect } from "react";
import { createPortal } from "react-dom";

import { ModalContext } from "context/modal";
import { cx, makeClassNamePrimitives } from "lib/styles";

import classNames from "./Modal.module.css";

const { Div } = makeClassNamePrimitives(classNames);

export enum ModalVariant {
  DEFAULT,
  MENU,
  RIGHT_SIDE,
}

interface ModalProps {
  children: React.ReactNode;
  onClickOverlay?: () => void;
  style?: React.CSSProperties;
  variant?: ModalVariant;
}

export const Modal = (props: ModalProps) => {
  const {
    children,
    onClickOverlay,
    style,
    variant = ModalVariant.DEFAULT,
  } = props;

  const { getModalRootElem, decrementOpenModalCount, incrementOpenModalCount } =
    useContext(ModalContext);

  useEffect(() => {
    incrementOpenModalCount();

    return () => {
      decrementOpenModalCount();
    };
  }, []);

  return createPortal(
    <Div.ModalOverlay onClick={() => onClickOverlay?.()}>
      <div
        className={cx(
          classNames,
          "modal",
          variant === ModalVariant.DEFAULT && "variantDefault",
          variant === ModalVariant.MENU && "variantMenu",
          variant === ModalVariant.RIGHT_SIDE && "variantRightSide"
        )}
        style={style}
      >
        {children}
      </div>
    </Div.ModalOverlay>,
    getModalRootElem()!
  );
};
