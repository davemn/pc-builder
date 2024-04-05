import { HTMLAttributes } from "react";

export function cx(
  nameMap: CSSModuleClasses,
  ...classes: Array<string | boolean>
) {
  return (
    classes
      // .filter(Boolean)
      // .map((c) => nameMap[c])
      .flatMap((c) => (typeof c === "string" ? [nameMap[c]] : []))
      .join(" ")
  );
}

/* Given a CSS module, generates a set of React components that render divs and spans bound to each module class name */
export function makeClassNamePrimitives(classNames: CSSModuleClasses) {
  const Div: Record<
    string,
    React.FunctionComponent<HTMLAttributes<HTMLDivElement>>
  > = {};

  const Span: Record<
    string,
    React.FunctionComponent<HTMLAttributes<HTMLSpanElement>>
  > = {};

  for (const key of Object.keys(classNames)) {
    const displayName = key[0].toUpperCase() + key.slice(1);

    Div[displayName] = (props: HTMLAttributes<HTMLDivElement>) => (
      <div className={classNames[key]} {...props} />
    );

    Span[displayName] = (props: HTMLAttributes<HTMLDivElement>) => (
      <span className={classNames[key]} {...props} />
    );
  }

  return { Div, Span };
}
