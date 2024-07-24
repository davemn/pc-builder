import { useContext, useEffect } from "react";
import { createPortal } from "react-dom";

import { ModalContext } from "context/modal";
import { cx, makeClassNamePrimitives } from "lib/styles";

import classNames from "./Modal.module.css";

const { Div } = makeClassNamePrimitives(classNames);

export enum ModalVariant {
  DEFAULT,
  RIGHT_SIDE,
}

interface ModalProps {
  children: React.ReactNode;
  variant?: ModalVariant;
}

export const Modal = (props: ModalProps) => {
  const { children, variant = ModalVariant.DEFAULT } = props;

  const { getModalRootElem, setIsModalOpen } = useContext(ModalContext);

  useEffect(() => {
    setIsModalOpen(true);

    return () => {
      setIsModalOpen(false);
    };
  }, [setIsModalOpen]);

  return createPortal(
    <Div.ModalOverlay>
      <div
        className={cx(
          classNames,
          "modal",
          variant === ModalVariant.DEFAULT && "variantDefault",
          variant === ModalVariant.RIGHT_SIDE && "variantRightSide"
        )}
      >
        {children}
      </div>
    </Div.ModalOverlay>,
    getModalRootElem()!
  );
};
