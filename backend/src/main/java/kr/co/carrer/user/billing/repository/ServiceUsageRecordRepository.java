package kr.co.carrer.user.billing.repository;

import kr.co.carrer.user.billing.entity.ServiceUsageRecord;
import kr.co.carrer.user.billing.type.ResourceType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ServiceUsageRecordRepository extends JpaRepository<ServiceUsageRecord, UUID> {

    Optional<ServiceUsageRecord> findByResourceTypeAndResourceId(ResourceType resourceType, UUID resourceId);
}
