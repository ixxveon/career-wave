package kr.co.carrer.user.community.service;

import kr.co.carrer.user.community.dto.ReportCreateRequest;

import java.util.UUID;

public interface ReportService {

    void createReport(UUID reporterId, ReportCreateRequest request);
}
