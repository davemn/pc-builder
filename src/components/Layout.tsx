import { makeClassNamePrimitives } from "lib/styles";

import classNames from "./Layout.module.css";

const { Div } = makeClassNamePrimitives(classNames);

interface LayoutProps {
  nav?: React.ReactNode;
  sidebar?: React.ReactNode;
  content: React.ReactNode;
  emptyStateText: string;
}

export const Layout = (props: LayoutProps) => {
  const {
    nav: navProp,
    sidebar: sidebarProp,
    content: contentProp,
    emptyStateText,
  } = props;

  return (
    <Div.Container>
      {navProp && <nav className={classNames.nav}>{navProp}</nav>}
      {sidebarProp && <Div.Sidebar>{sidebarProp}</Div.Sidebar>}
      <Div.Content>
        {contentProp ? (
          contentProp
        ) : (
          <Div.EmptyStateText>{emptyStateText}</Div.EmptyStateText>
        )}
      </Div.Content>
    </Div.Container>
  );
};
