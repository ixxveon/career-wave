import { useMutation } from "@tanstack/react-query";

import { createCommunityReport } from "@/api/user/community";
import type { CreateCommunityReportRequest } from "@/types/user/community";
import type { MemberApiError } from "@/utils/user/member/errorMapping";

export function useCreateCommunityReport() {
  return useMutation<void, MemberApiError, CreateCommunityReportRequest>({
    mutationFn: (request) => createCommunityReport(request),
  });
}