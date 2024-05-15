import { useContext, useEffect } from "react";
import { createPortal } from "react-dom";

import { ModalContext } from "context/modal";
import { makeClassNamePrimitives } from "lib/styles";

import classNames from "./Modal.module.css";

const { Div } = makeClassNamePrimitives(classNames);

interface ModalProps {
  children: React.ReactNode;
}

export const Modal = (props: ModalProps) => {
  const { children } = props;

  const { getModalRootElem, setIsModalOpen } = useContext(ModalContext);

  useEffect(() => {
    setIsModalOpen(true);

    return () => {
      setIsModalOpen(false);
    };
  }, [setIsModalOpen]);

  return createPortal(
    <Div.ModalOverlay>
      <Div.Modal>{children}</Div.Modal>
    </Div.ModalOverlay>,
    getModalRootElem()!
  );
};
