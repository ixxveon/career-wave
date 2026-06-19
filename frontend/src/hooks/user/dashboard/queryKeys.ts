export const dashboardQueryKeys = {
  all: ["dashboard"] as const,
  profile: () => [...dashboardQueryKeys.all, "profile"] as const,
  github: () => [...dashboardQueryKeys.all, "github"] as const,
  bookmarks: (keyword?: string, page = 0, size = 20) =>
    [...dashboardQueryKeys.all, "bookmarks", keyword, page, size] as const,
};