package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.type.ResourceType;

import java.util.UUID;

public interface EntitlementService {

    /**
     * 서비스 시작 트랜잭션에서 호출 — 이용권 RESERVED 전이 + ServiceUsageRecord 생성.
     * 멱등 보장: 동일 resourceId가 이미 RESERVED 상태이면 SERVICE_USAGE_ALREADY_RESERVED.
     * 무료 이용권 소진 시 SUBSCRIPTION_REQUIRED(402).
     */
    void reserve(UUID memberId, String productCode, ResourceType resourceType, UUID resourceId);

    /**
     * 서비스 완료 콜백에서 호출 — 이용권 USED 전이 + ServiceUsageRecord CONSUMED 전이.
     * 멱등 보장: 이미 CONSUMED 상태이면 무시.
     */
    void consume(ResourceType resourceType, UUID resourceId);

    /**
     * 서비스 실패/취소 시 호출 — 이용권 AVAILABLE 복원 + ServiceUsageRecord RELEASED 전이.
     * 멱등 보장: 이미 RELEASED 또는 레코드 없으면 무시. CONSUMED 상태에서는 예외.
     */
    void release(ResourceType resourceType, UUID resourceId);
}
