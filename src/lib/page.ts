export type PageId = "builds" | "editBuild";

export interface BuildsPageProps {}

export interface EditBuildPageProps {
  buildId: number;
}

export type PageProps<T extends PageId> = {
  builds: BuildsPageProps;
  editBuild: EditBuildPageProps;
}[T];

// export interface NavigatePropArg<T extends PageId = PageId> {
//   id: T;
//   props: {
//     builds: BuildsPageProps;
//     editBuild: EditBuildPageProps;
//   }[T];
// }

// export type NavigateProp = (target: NavigatePropArg<PageId>) => void;
export type NavigateProp<T extends PageId = PageId> = (
  targetId: T,
  targetProps: PageProps<T>
) => void;
