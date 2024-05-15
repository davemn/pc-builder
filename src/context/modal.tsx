import { createContext, useRef, useState } from "react";

interface ModalContextValue {
  getModalRootElem: () => HTMLDivElement | null;
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
}

export const ModalContext = createContext<ModalContextValue>({
  getModalRootElem: () => null,
  isModalOpen: false,
  setIsModalOpen: () => {},
});

interface ModalProviderProps {
  children: React.ReactNode;
}

// Provides a ref. pointing to the modal root elem
export const ModalProvider = (props: ModalProviderProps) => {
  const { children } = props;

  const modalRootRef = useRef<HTMLDivElement>(null);
  const getModalRootElem = () => modalRootRef.current;

  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <ModalContext.Provider
      value={{ getModalRootElem, isModalOpen, setIsModalOpen }}
    >
      {children}
      <div key="modal-root" ref={modalRootRef} />
    </ModalContext.Provider>
  );
};
