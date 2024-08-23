import { createContext, useCallback, useRef, useState } from "react";

interface ModalContextValue {
  getModalRootElem: () => HTMLDivElement | null;
  decrementOpenModalCount: () => void;
  incrementOpenModalCount: () => void;
  isModalOpen: boolean;
  openModalCount: number;
}

export const ModalContext = createContext<ModalContextValue>({
  getModalRootElem: () => null,
  decrementOpenModalCount: () => {},
  incrementOpenModalCount: () => {},
  isModalOpen: false,
  openModalCount: 0,
});

interface ModalProviderProps {
  children: React.ReactNode;
}

// Provides a ref. pointing to the modal root elem
export const ModalProvider = (props: ModalProviderProps) => {
  const { children } = props;

  const modalRootRef = useRef<HTMLDivElement>(null);
  const getModalRootElem = () => modalRootRef.current;

  const [openModalCount, setOpenModalCount] = useState(0);

  const incrementOpenModalCount = useCallback(() => {
    setOpenModalCount((count) => count + 1);
  }, []);

  const decrementOpenModalCount = useCallback(() => {
    setOpenModalCount((count) => count - 1);
  }, []);

  const isModalOpen = openModalCount > 0;

  return (
    <ModalContext.Provider
      value={{
        getModalRootElem,
        decrementOpenModalCount,
        incrementOpenModalCount,
        isModalOpen,
        openModalCount,
      }}
    >
      {children}
      <div key="modal-root" ref={modalRootRef} />
    </ModalContext.Provider>
  );
};
