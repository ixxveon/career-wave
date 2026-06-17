package kr.co.carrer.admin.aimetrics.repository;

import kr.co.carrer.admin.aimetrics.entity.AiOpsSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AiOpsSettingRepository extends JpaRepository<AiOpsSetting, Long> {

    Long SINGLETON_ID = 1L;

    default Optional<AiOpsSetting> findSingleton() {
        return findById(SINGLETON_ID);
    }
}
