export const dashboardQueryKeys = {
  all: ["dashboard"] as const,
  profile: () => [...dashboardQueryKeys.all, "profile"] as const,
  github: () => [...dashboardQueryKeys.all, "github"] as const,
  bookmarkLists: () => [...dashboardQueryKeys.all, "bookmarks"] as const,
  bookmarks: (keyword?: string, page = 0, size = 20) =>
    [...dashboardQueryKeys.bookmarkLists(), keyword, page, size] as const,
};
