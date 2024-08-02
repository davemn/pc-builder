import { createContext } from "react";

import { useBuild } from "hooks/useBuild";
import { ExtendedBuildSchema } from "lib/build";

interface BuildContextValue {
  build: ExtendedBuildSchema | null;
}

export const BuildContext = createContext<BuildContextValue>({
  build: null,
});

interface BuildProviderProps {
  buildId: number | null;
  children: React.ReactNode;
}

export const BuildProvider = (props: BuildProviderProps) => {
  const { buildId, children } = props;

  const { build } = useBuild(buildId);

  return (
    <BuildContext.Provider value={{ build }}>{children}</BuildContext.Provider>
  );
};
