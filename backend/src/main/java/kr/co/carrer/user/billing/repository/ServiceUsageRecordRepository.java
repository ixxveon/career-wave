package kr.co.carrer.user.billing.repository;

import jakarta.persistence.LockModeType;
import kr.co.carrer.user.billing.entity.ServiceUsageRecord;
import kr.co.carrer.user.billing.type.ResourceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ServiceUsageRecordRepository extends JpaRepository<ServiceUsageRecord, UUID> {

    Optional<ServiceUsageRecord> findByResourceTypeAndResourceId(ResourceType resourceType, UUID resourceId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM ServiceUsageRecord r WHERE r.resourceType = :resourceType AND r.resourceId = :resourceId")
    Optional<ServiceUsageRecord> findByResourceTypeAndResourceIdForUpdate(
            @Param("resourceType") ResourceType resourceType,
            @Param("resourceId") UUID resourceId);
}
