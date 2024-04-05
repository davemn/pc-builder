import React, { useState } from "react";

import { NavigateProp, PageId, PageProps } from "lib/page";
import { BuildsPage } from "pages/BuildsPage";
import { EditBuildPage } from "pages/EditBuildPage";

import classNames from "./App.module.css";

interface PageState<T extends PageId = PageId> {
  id: T;
  props: PageProps<T>;
}

function isPageId<T extends PageId>(
  id: T,
  state: PageState
): state is PageState<T> {
  return state.id === id;
}

export const App = () => {
  const [page, setPage] = useState<PageState>({
    id: "builds",
    props: {},
  });

  const navigate: NavigateProp = (targetId, targetProps) => {
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

  return (
    <div className={classNames.container}>
      {isPageId("builds", page) && (
        <BuildsPage navigate={navigate} {...page.props} />
      )}
      {isPageId("editBuild", page) && (
        <EditBuildPage navigate={navigate} {...page.props} />
      )}
    </div>
  );
};
