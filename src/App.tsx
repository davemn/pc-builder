import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useContext, useState } from "react";
import ReactDOM from "react-dom/client";

import { ModalContext, ModalProvider } from "context/modal";
import { PageId, PageProps } from "lib/page";
import { makeClassNamePrimitives } from "lib/styles";
import { BuildsPage } from "pages/BuildsPage";
import { EditBuildPage } from "pages/EditBuildPage";

import classNames from "./App.module.css";

const { Div } = makeClassNamePrimitives(classNames);

interface PageState<T extends PageId = PageId> {
  id: T;
  props: Omit<PageProps<T>, "navigate">;
}

function isPageId<T extends PageId>(
  id: T,
  state: PageState
): state is PageState<T> {
  return state.id === id;
}

const AppInner = () => {
  const [page, setPage] = useState<PageState>({
    id: "builds",
    props: {},
  });

  const navigate = (
    targetId: PageId,
    targetProps: Omit<PageProps<PageId>, "navigate">
  ) => {
    switch (targetId) {
      case "builds":
        setPage({ id: "builds", props: {} });
        return;
      case "editBuild":
        setPage({ id: "editBuild", props: targetProps });
        return;
      default:
        throw new Error(`Can't navigate to page: ${targetId}`);
    }
  };

  const { isModalOpen } = useContext(ModalContext);

  return (
    <Div.WindowContainer>
      <Div.TitleBar />
      <Div.Container
        style={{
          ...(isModalOpen
            ? {
                filter: "blur(2px)",
                overflow: "hidden",
                pointerEvents: "none",
              }
            : {}),
        }}
      >
        {isPageId("builds", page) && (
          <BuildsPage navigate={navigate} {...page.props} />
        )}
        {isPageId("editBuild", page) && (
          <EditBuildPage navigate={navigate} {...page.props} />
        )}
      </Div.Container>
    </Div.WindowContainer>
  );
};

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ModalProvider>
        <AppInner />
      </ModalProvider>
    </QueryClientProvider>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
