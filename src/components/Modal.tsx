import { useEffect } from "react";
import { createPortal } from "react-dom";

import classNames from "./Modal.module.css";

interface ModalProps {
  children: React.ReactNode;
}

export const Modal = (props: ModalProps) => {
  const { children } = props;

  useEffect(() => {
    // document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");

    return () => {
      // document.body.style.overflow = "auto";
      document.body.classList.remove("modal-open");
    };
  }, []);

  return createPortal(
    <div className={classNames.modal}>{children}</div>,
    document.getElementById("modal-root")!
  );
};
