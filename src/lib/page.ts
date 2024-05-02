export type PageId = "builds" | "editBuild";

export type NavigateProp<T extends PageId> = {
  editBuild: <T extends PageId>(
    targetId: T,
    targetProps: Omit<PageProps<T>, "navigate">
  ) => void;
  builds: (
    targetId: "editBuild",
    targetProps: Omit<EditBuildPageProps, "navigate">
  ) => void;
}[T];

export interface BuildsPageProps {
  navigate: NavigateProp<"builds">;
}

export interface EditBuildPageProps {
  buildGroupId: number;
  buildId: number;
  navigate: NavigateProp<"editBuild">;
}

export type PageProps<T extends PageId> = {
  builds: BuildsPageProps;
  editBuild: EditBuildPageProps;
}[T];
