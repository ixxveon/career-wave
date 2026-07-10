package kr.co.carrer.admin.member.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import kr.co.carrer.admin.member.dto.MemberDTO;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.lang.reflect.Field;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MemberQueryRepositoryTest {

    @Test
    void countMemberKpi_includesCompanyMembersExceptPremiumCount() throws Exception {
        EntityManager em = mock(EntityManager.class);
        Query query = mock(Query.class);
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);

        when(em.createNativeQuery(sqlCaptor.capture())).thenReturn(query);
        when(query.getSingleResult()).thenReturn(new Object[] { 3L, 2L, 1L });

        MemberQueryRepository repository = new MemberQueryRepository();
        Field emField = MemberQueryRepository.class.getDeclaredField("em");
        emField.setAccessible(true);
        emField.set(repository, em);

        MemberDTO.ResponseCounts result = repository.countMemberKpi();

        assertThat(result.todayJoinCount()).isEqualTo(3L);
        assertThat(result.premiumCount()).isEqualTo(2L);
        assertThat(result.suspendedCount()).isEqualTo(1L);

        String sql = sqlCaptor.getValue();
        // 오늘 신규 가입 / 정지 회원 수는 role_type 제한 없이 전체 회원(개인+기업)을 집계한다.
        assertThat(sql).doesNotContain("WHERE m.role_type = 'USER'\n            ");
        // 프리미엄 구독만 개인 회원(USER)으로 한정한다 — 기업 회원은 실질적인 구독 개념이 없음.
        assertThat(sql).contains("FILTER (WHERE m.role_type = 'USER' AND m.subscription_status = 'PREMIUM')");
    }
}
