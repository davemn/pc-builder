export type PageId = "builds" | "editBuild";

export type NavigateProp<T extends PageId> = {
  builds: (
    targetId: "builds",
    targetProps: Omit<BuildsPageProps, "navigate">
  ) => void;
  editBuild: (
    targetId: "editBuild",
    targetProps: Omit<EditBuildPageProps, "navigate">
  ) => void;
}[T];

export interface BuildsPageProps {
  navigate: NavigateProp<"editBuild">;
}

export interface EditBuildPageProps {
  buildGroupId: number;
  buildId: number;
  navigate: NavigateProp<"builds">;
}

export type PageProps<T extends PageId> = {
  builds: BuildsPageProps;
  editBuild: EditBuildPageProps;
}[T];
