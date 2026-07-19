package kr.co.carrer.admin.audit.entity;

import kr.co.carrer.admin.audit.type.AuditLogSeverity;
import kr.co.carrer.admin.audit.type.AuditLogType;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AuditLogTest {

    @Test
    void createsSearchTextFromKeywordSearchFields() {
        AuditLog auditLog = AuditLog.create(
                1L,
                AuditLogType.ADMIN_ACTIVITY,
                "UPDATE_ADMIN_ROLE",
                "ADMIN",
                "42",
                "127.0.0.1",
                AuditLogSeverity.INFO,
                "Changed role to BACKEND"
        );

        assertThat(auditLog.getSearchText())
                .isEqualTo("UPDATE_ADMIN_ROLE ADMIN 42 Changed role to BACKEND");
    }

    @Test
    void createsSearchTextWhenOptionalFieldsAreMissing() {
        AuditLog auditLog = AuditLog.create(
                null,
                AuditLogType.ADMIN_ACTIVITY,
                "LOGIN",
                null,
                null,
                null,
                AuditLogSeverity.INFO,
                null
        );

        assertThat(auditLog.getSearchText()).isEqualTo("LOGIN");
    }
}
