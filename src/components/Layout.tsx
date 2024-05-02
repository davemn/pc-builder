import { makeClassNamePrimitives } from "lib/styles";

import classNames from "./Layout.module.css";

const { Div } = makeClassNamePrimitives(classNames);

interface LayoutProps {
  nav?: React.ReactNode;
  subnav?: React.ReactNode;
  sidebar?: React.ReactNode;
  content: React.ReactNode;
  emptyStateText: string;
}

export const Layout = (props: LayoutProps) => {
  const {
    nav: navProp,
    subnav: subnavProp,
    sidebar: sidebarProp,
    content: contentProp,
    emptyStateText,
  } = props;

  return (
    <Div.Container
      style={{
        gridTemplateRows: !subnavProp ? "auto 1fr" : "auto auto 1fr",
      }}
    >
      {navProp && <nav className={classNames.nav}>{navProp}</nav>}
      {subnavProp && <Div.Subnav>{subnavProp}</Div.Subnav>}
      {sidebarProp && <Div.Sidebar>{sidebarProp}</Div.Sidebar>}
      <Div.Content
        style={{
          ...(!sidebarProp ? { gridColumn: "1 / 3" } : {}),
        }}
      >
        {contentProp ? (
          contentProp
        ) : (
          <Div.EmptyStateText>{emptyStateText}</Div.EmptyStateText>
        )}
      </Div.Content>
    </Div.Container>
  );
};
