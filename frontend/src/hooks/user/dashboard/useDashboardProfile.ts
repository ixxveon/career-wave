import { useQuery } from "@tanstack/react-query";
import { getDashboardProfile } from "../../../api/user/dashboard";
import { dashboardQueryKeys } from "./queryKeys";

export function useDashboardProfile(enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.profile(),
    queryFn: getDashboardProfile,
    enabled,
  });
}
