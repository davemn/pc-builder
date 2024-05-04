import { createContext } from "react";

import { useBuildGroup } from "hooks/useBuildGroup";
import { ExtendedBuildGroupSchema } from "lib/build";

interface BuildGroupContextValue {
  buildGroup: ExtendedBuildGroupSchema | null;
}

export const BuildGroupContext = createContext<BuildGroupContextValue>({
  buildGroup: null,
});

interface BuildGroupProviderProps {
  buildGroupId: number | null;
  children: React.ReactNode;
}

export const BuildGroupProvider = (props: BuildGroupProviderProps) => {
  const { buildGroupId, children } = props;

  const buildGroup = useBuildGroup(buildGroupId);

  return (
    <BuildGroupContext.Provider value={{ buildGroup }}>
      {children}
    </BuildGroupContext.Provider>
  );
};
