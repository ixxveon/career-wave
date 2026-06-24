package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.dto.EntitlementDTO;

import java.util.UUID;

public interface EntitlementQueryService {

    EntitlementDTO.ResponseEntitlementList getMyEntitlements(UUID memberId);
}
