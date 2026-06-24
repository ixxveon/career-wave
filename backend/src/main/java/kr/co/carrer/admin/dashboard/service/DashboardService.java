package kr.co.carrer.admin.dashboard.service;

import kr.co.carrer.admin.dashboard.dto.DashboardDTO;

public interface DashboardService {

    DashboardDTO.ResponseSummary getSummary(DashboardDTO.RequestSummary request);
}
