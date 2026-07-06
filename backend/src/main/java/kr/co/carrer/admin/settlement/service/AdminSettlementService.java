package kr.co.carrer.admin.settlement.service;

import kr.co.carrer.admin.settlement.dto.SettlementDTO;
import kr.co.carrer.admin.settlement.type.SettlementStatus;
import kr.co.carrer.global.response.PaginationResponse;

public interface AdminSettlementService {

    PaginationResponse<SettlementDTO.ResponseList> getSettlements(SettlementStatus status, int page, int size);

    SettlementDTO.ResponseDetail getSettlementDetail(Long settlementId);

    SettlementDTO.ResponseList generateSettlement(SettlementDTO.RequestGenerate request, Long adminId, String ipAddress);

    SettlementDTO.ResponseConfirm confirmSettlement(Long settlementId, SettlementDTO.RequestConfirm request, Long adminId, String ipAddress);
}
