import { useQuery } from "@tanstack/react-query";
import { getDashboardBookmarks } from "../../../api/user/dashboard";
import { dashboardQueryKeys } from "./queryKeys";

interface Params {
  keyword?: string;
  page?: number;
  size?: number;
}

export function useDashboardBookmarks(params: Params, enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.bookmarks(
      params.keyword,
      params.page,
      params.size,
    ),
    queryFn: () => getDashboardBookmarks(params),
    enabled,
  });
}
