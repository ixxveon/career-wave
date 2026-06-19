import { useQuery } from "@tanstack/react-query";
import { getDashboardGithubProfile } from "../../../api/user/dashboard";
import { dashboardQueryKeys } from "./queryKeys";

export function useDashboardGithub(enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.github(),
    queryFn: getDashboardGithubProfile,
    enabled,
  });
}
