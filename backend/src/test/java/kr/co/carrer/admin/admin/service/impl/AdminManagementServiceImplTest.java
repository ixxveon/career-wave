package kr.co.carrer.admin.admin.service.impl;

import kr.co.carrer.admin.admin.repository.AdminQueryRepository;
import kr.co.carrer.admin.admin.repository.AdminRepository;
import kr.co.carrer.admin.admin.repository.AuditLogRepository;
import kr.co.carrer.admin.admin.repository.IpAclQueryRepository;
import kr.co.carrer.admin.admin.repository.IpAclRepository;
import kr.co.carrer.admin.admin.entity.Admin;
import kr.co.carrer.admin.admin.entity.IpAcl;
import kr.co.carrer.admin.admin.exception.AdminManagementErrorCode;
import kr.co.carrer.admin.admin.service.AdminManagementService;
import kr.co.carrer.admin.admin.type.AdminRole;
import kr.co.carrer.admin.admin.type.AdminStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AdminManagementServiceImplTest {

    @InjectMocks
    private AdminManagementServiceImpl adminManagementService;

    @Mock
    private AdminRepository adminRepository;

    @Mock
    private AdminQueryRepository adminQueryRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private IpAclRepository ipAclRepository;

    @Mock
    private IpAclQueryRepository ipAclQueryRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Nested
    @DisplayName("관리자 KPI 요약 조회 - getAdminSummary()")
    class GetAdminSummary {

        @Test
        @DisplayName("전체/활성/잠금/마스터 관리자 수를 요약 결과로 반환한다")
        void returnsSummaryCounts() {
            given(adminRepository.count()).willReturn(5L);
            given(adminRepository.countByStatus(AdminStatus.ACTIVE)).willReturn(3L);
            given(adminRepository.countByStatus(AdminStatus.LOCKED)).willReturn(2L);
            given(adminRepository.countByAdminRole(AdminRole.MASTER)).willReturn(1L);

            AdminManagementService.SummaryResult result = adminManagementService.getAdminSummary();

            assertThat(result.totalAdminCount()).isEqualTo(5L);
            assertThat(result.activeAdminCount()).isEqualTo(3L);
            assertThat(result.lockedAdminCount()).isEqualTo(2L);
            assertThat(result.masterAdminCount()).isEqualTo(1L);
        }
    }

    @Nested
    @DisplayName("관리자 계정 목록 조회 - getAdmins()")
    class GetAdmins {

        @Test
        @DisplayName("관리자 목록을 1-based 페이지 응답으로 반환한다")
        void returnsAdminListWithPagination() {
            ZonedDateTime createdAt = ZonedDateTime.parse("2026-06-15T10:00:00Z");
            ZonedDateTime updatedAt = ZonedDateTime.parse("2026-06-15T11:00:00Z");
            ZonedDateTime lastLoginAt = ZonedDateTime.parse("2026-06-15T12:00:00Z");

            Admin admin = createAdmin(
                1L,
                "master@career-wave.com",
                "master-admin",
                AdminRole.MASTER,
                AdminStatus.ACTIVE,
                lastLoginAt,
                "10.0.0.1",
                createdAt,
                updatedAt
            );

            given(adminQueryRepository.findAdmins(
                null,
                null,
                null,
                PageRequest.of(0, 20)
            )).willReturn(new PageImpl<>(List.of(admin), PageRequest.of(0, 20), 1));

            var result = adminManagementService.getAdmins(null, null, null, 1, 20);

            assertThat(result.page()).isEqualTo(1);
            assertThat(result.size()).isEqualTo(20);
            assertThat(result.totalItems()).isEqualTo(1);
            assertThat(result.totalPages()).isEqualTo(1);
            assertThat(result.items()).hasSize(1);

            AdminManagementService.AdminListItem item = result.items().getFirst();
            assertThat(item.adminId()).isEqualTo(1L);
            assertThat(item.email()).isEqualTo("master@career-wave.com");
            assertThat(item.name()).isEqualTo("master-admin");
            assertThat(item.adminRole()).isEqualTo(AdminRole.MASTER);
            assertThat(item.status()).isEqualTo(AdminStatus.ACTIVE);
            assertThat(item.lastLoginAt()).isEqualTo(lastLoginAt);
            assertThat(item.lastLoginIp()).isEqualTo("10.0.0.1");
            assertThat(item.createdAt()).isEqualTo(createdAt);
            assertThat(item.updatedAt()).isEqualTo(updatedAt);
        }

        @Test
        @DisplayName("keyword 필터를 query repository에 전달해 검색 결과를 반환한다")
        void passesKeywordFilterToQueryRepository() {
            Admin admin = createAdmin(
                2L,
                "backend@career-wave.com",
                "backend-admin",
                AdminRole.BACKEND,
                AdminStatus.ACTIVE,
                null,
                null,
                ZonedDateTime.parse("2026-06-15T09:00:00Z"),
                ZonedDateTime.parse("2026-06-15T09:30:00Z")
            );

            given(adminQueryRepository.findAdmins(
                "backend",
                null,
                null,
                PageRequest.of(0, 20)
            )).willReturn(new PageImpl<>(List.of(admin), PageRequest.of(0, 20), 1));

            var result = adminManagementService.getAdmins("backend", null, null, 1, 20);

            verify(adminQueryRepository).findAdmins("backend", null, null, PageRequest.of(0, 20));
            assertThat(result.items()).hasSize(1);
            assertThat(result.items().getFirst().email()).isEqualTo("backend@career-wave.com");
            assertThat(result.items().getFirst().name()).isEqualTo("backend-admin");
        }

        @Test
        @DisplayName("role 필터를 query repository에 전달해 검색 결과를 반환한다")
        void passesRoleFilterToQueryRepository() {
            Admin admin = createAdmin(
                3L,
                "cs@career-wave.com",
                "cs-admin",
                AdminRole.CS,
                AdminStatus.ACTIVE,
                null,
                null,
                ZonedDateTime.parse("2026-06-15T08:00:00Z"),
                ZonedDateTime.parse("2026-06-15T08:30:00Z")
            );

            given(adminQueryRepository.findAdmins(
                null,
                AdminRole.CS,
                null,
                PageRequest.of(0, 20)
            )).willReturn(new PageImpl<>(List.of(admin), PageRequest.of(0, 20), 1));

            var result = adminManagementService.getAdmins(null, AdminRole.CS, null, 1, 20);

            verify(adminQueryRepository).findAdmins(null, AdminRole.CS, null, PageRequest.of(0, 20));
            assertThat(result.items()).hasSize(1);
            assertThat(result.items().getFirst().adminRole()).isEqualTo(AdminRole.CS);
            assertThat(result.items().getFirst().email()).isEqualTo("cs@career-wave.com");
        }

        @Test
        @DisplayName("status 필터를 query repository에 전달해 검색 결과를 반환한다")
        void passesStatusFilterToQueryRepository() {
            Admin admin = createAdmin(
                4L,
                "locked@career-wave.com",
                "locked-admin",
                AdminRole.BACKEND,
                AdminStatus.LOCKED,
                null,
                null,
                ZonedDateTime.parse("2026-06-15T07:00:00Z"),
                ZonedDateTime.parse("2026-06-15T07:30:00Z")
            );

            given(adminQueryRepository.findAdmins(
                null,
                null,
                AdminStatus.LOCKED,
                PageRequest.of(0, 20)
            )).willReturn(new PageImpl<>(List.of(admin), PageRequest.of(0, 20), 1));

            var result = adminManagementService.getAdmins(null, null, AdminStatus.LOCKED, 1, 20);

            verify(adminQueryRepository).findAdmins(null, null, AdminStatus.LOCKED, PageRequest.of(0, 20));
            assertThat(result.items()).hasSize(1);
            assertThat(result.items().getFirst().status()).isEqualTo(AdminStatus.LOCKED);
            assertThat(result.items().getFirst().email()).isEqualTo("locked@career-wave.com");
        }
    }

    @Nested
    @DisplayName("관리자 계정 생성 - createAdmin()")
    class CreateAdmin {

        @Test
        @DisplayName("관리자 계정을 생성하고 감사 로그를 기록한다")
        void createsAdminAndAuditLog() {
            given(adminRepository.existsByEmail("backend@career-wave.com")).willReturn(false);
            given(passwordEncoder.encode("temporary-password")).willReturn("encoded-password");
            given(adminRepository.saveAndFlush(org.mockito.ArgumentMatchers.any(Admin.class)))
                .willAnswer(invocation -> {
                    Admin savedAdmin = invocation.getArgument(0);
                    setField(savedAdmin, "adminId", 10L);
                    setField(savedAdmin, "createdAt", ZonedDateTime.parse("2026-06-15T13:00:00Z"));
                    setField(savedAdmin, "updatedAt", ZonedDateTime.parse("2026-06-15T13:00:00Z"));
                    return savedAdmin;
                });

            var command = new AdminManagementService.CreateAdminCommand(
                "backend@career-wave.com",
                "temporary-password",
                "backend-admin",
                AdminRole.BACKEND
            );

            var result = adminManagementService.createAdmin(command, 1L, "10.0.0.2");

            ArgumentCaptor<Admin> adminCaptor = ArgumentCaptor.forClass(Admin.class);
            ArgumentCaptor<kr.co.carrer.admin.admin.entity.AuditLog> auditLogCaptor =
                ArgumentCaptor.forClass(kr.co.carrer.admin.admin.entity.AuditLog.class);

            verify(passwordEncoder).encode("temporary-password");
            verify(adminRepository).saveAndFlush(adminCaptor.capture());
            verify(auditLogRepository, times(1)).save(auditLogCaptor.capture());

            Admin savedAdmin = adminCaptor.getValue();
            assertThat(savedAdmin.getEmail()).isEqualTo("backend@career-wave.com");
            assertThat(savedAdmin.getPasswordHash()).isEqualTo("encoded-password");
            assertThat(savedAdmin.getName()).isEqualTo("backend-admin");
            assertThat(savedAdmin.getAdminRole()).isEqualTo(AdminRole.BACKEND);
            assertThat(savedAdmin.getStatus()).isEqualTo(AdminStatus.ACTIVE);

            var auditLog = auditLogCaptor.getValue();
            assertThat(auditLog.getAdminId()).isEqualTo(1L);
            assertThat(auditLog.getLogType()).isEqualTo("ADMIN_MANAGEMENT");
            assertThat(auditLog.getAction()).isEqualTo("CREATE_ADMIN");
            assertThat(auditLog.getTargetType()).isEqualTo("ADMIN");
            assertThat(auditLog.getTargetId()).isEqualTo("10");
            assertThat(auditLog.getIpAddress()).isEqualTo("10.0.0.2");
            assertThat(auditLog.getSeverity()).isEqualTo("INFO");

            assertThat(result.adminId()).isEqualTo(10L);
            assertThat(result.email()).isEqualTo("backend@career-wave.com");
            assertThat(result.name()).isEqualTo("backend-admin");
            assertThat(result.adminRole()).isEqualTo(AdminRole.BACKEND);
            assertThat(result.status()).isEqualTo(AdminStatus.ACTIVE);
        }

        @Test
        @DisplayName("이미 존재하는 관리자 이메일이면 ADMIN_EMAIL_ALREADY_EXISTS 예외를 반환한다")
        void throwsWhenAdminEmailAlreadyExists() {
            given(adminRepository.existsByEmail("backend@career-wave.com")).willReturn(true);

            var command = new AdminManagementService.CreateAdminCommand(
                "backend@career-wave.com",
                "temporary-password",
                "backend-admin",
                AdminRole.BACKEND
            );

            assertThatThrownBy(() -> adminManagementService.createAdmin(command, 1L, "10.0.0.2"))
                .isInstanceOf(kr.co.carrer.global.exception.CustomException.class)
                .extracting(exception -> ((kr.co.carrer.global.exception.CustomException) exception).getErrorCode())
                .isEqualTo(AdminManagementErrorCode.ADMIN_EMAIL_ALREADY_EXISTS);

            verify(adminRepository, never()).saveAndFlush(org.mockito.ArgumentMatchers.any(Admin.class));
            verify(auditLogRepository, never()).save(org.mockito.ArgumentMatchers.any());
        }
    }

    @Nested
    @DisplayName("관리자 권한 변경 - updateAdminRole()")
    class UpdateAdminRole {

        @Test
        @DisplayName("관리자 권한을 변경하고 감사 로그를 기록한다")
        void updatesAdminRoleAndAuditLog() {
            Admin admin = createAdmin(
                20L,
                "backend@career-wave.com",
                "backend-admin",
                AdminRole.BACKEND,
                AdminStatus.ACTIVE,
                null,
                null,
                ZonedDateTime.parse("2026-06-15T09:00:00Z"),
                ZonedDateTime.parse("2026-06-15T09:30:00Z")
            );

            given(adminRepository.findById(20L)).willReturn(Optional.of(admin));

            var command = new AdminManagementService.UpdateAdminRoleCommand(AdminRole.CS);

            var result = adminManagementService.updateAdminRole(20L, command, 1L, "10.0.0.3");

            ArgumentCaptor<kr.co.carrer.admin.admin.entity.AuditLog> auditLogCaptor =
                ArgumentCaptor.forClass(kr.co.carrer.admin.admin.entity.AuditLog.class);

            verify(adminRepository).findById(20L);
            verify(auditLogRepository).save(auditLogCaptor.capture());

            assertThat(admin.getAdminRole()).isEqualTo(AdminRole.CS);
            assertThat(result.adminId()).isEqualTo(20L);
            assertThat(result.adminRole()).isEqualTo(AdminRole.CS);
            assertThat(result.email()).isEqualTo("backend@career-wave.com");

            var auditLog = auditLogCaptor.getValue();
            assertThat(auditLog.getAdminId()).isEqualTo(1L);
            assertThat(auditLog.getLogType()).isEqualTo("ADMIN_MANAGEMENT");
            assertThat(auditLog.getAction()).isEqualTo("UPDATE_ADMIN_ROLE");
            assertThat(auditLog.getTargetType()).isEqualTo("ADMIN");
            assertThat(auditLog.getTargetId()).isEqualTo("20");
            assertThat(auditLog.getIpAddress()).isEqualTo("10.0.0.3");
            assertThat(auditLog.getSeverity()).isEqualTo("INFO");
        }

        @Test
        @DisplayName("동일한 권한으로 변경 요청 시 ADMIN_ROLE_ALREADY_ASSIGNED 예외를 반환한다")
        void throwsWhenAdminRoleAlreadyAssigned() {
            Admin admin = createAdmin(
                21L,
                "backend@career-wave.com",
                "backend-admin",
                AdminRole.BACKEND,
                AdminStatus.ACTIVE,
                null,
                null,
                ZonedDateTime.parse("2026-06-15T09:00:00Z"),
                ZonedDateTime.parse("2026-06-15T09:30:00Z")
            );
            given(adminRepository.findById(21L)).willReturn(Optional.of(admin));

            assertThatThrownBy(() -> adminManagementService.updateAdminRole(
                21L,
                new AdminManagementService.UpdateAdminRoleCommand(AdminRole.BACKEND),
                1L,
                "10.0.0.3"
            ))
                .isInstanceOf(kr.co.carrer.global.exception.CustomException.class)
                .extracting(exception -> ((kr.co.carrer.global.exception.CustomException) exception).getErrorCode())
                .isEqualTo(AdminManagementErrorCode.ADMIN_ROLE_ALREADY_ASSIGNED);
        }
    }

    @Nested
    @DisplayName("관리자 상태 변경 - updateAdminStatus()")
    class UpdateAdminStatus {

        @Test
        @DisplayName("관리자 상태를 ACTIVE에서 LOCKED로 변경하고 감사 로그를 기록한다")
        void updatesAdminStatusAndAuditLog() {
            Admin admin = createAdmin(
                30L,
                "active@career-wave.com",
                "active-admin",
                AdminRole.BACKEND,
                AdminStatus.ACTIVE,
                null,
                null,
                ZonedDateTime.parse("2026-06-15T06:00:00Z"),
                ZonedDateTime.parse("2026-06-15T06:30:00Z")
            );

            given(adminRepository.findById(30L)).willReturn(Optional.of(admin));

            var command = new AdminManagementService.UpdateAdminStatusCommand(AdminStatus.LOCKED);

            var result = adminManagementService.updateAdminStatus(30L, command, 1L, "10.0.0.4");

            ArgumentCaptor<kr.co.carrer.admin.admin.entity.AuditLog> auditLogCaptor =
                ArgumentCaptor.forClass(kr.co.carrer.admin.admin.entity.AuditLog.class);

            verify(adminRepository).findById(30L);
            verify(auditLogRepository).save(auditLogCaptor.capture());

            assertThat(admin.getStatus()).isEqualTo(AdminStatus.LOCKED);
            assertThat(result.adminId()).isEqualTo(30L);
            assertThat(result.status()).isEqualTo(AdminStatus.LOCKED);
            assertThat(result.email()).isEqualTo("active@career-wave.com");

            var auditLog = auditLogCaptor.getValue();
            assertThat(auditLog.getAdminId()).isEqualTo(1L);
            assertThat(auditLog.getLogType()).isEqualTo("ADMIN_MANAGEMENT");
            assertThat(auditLog.getAction()).isEqualTo("UPDATE_ADMIN_STATUS");
            assertThat(auditLog.getTargetType()).isEqualTo("ADMIN");
            assertThat(auditLog.getTargetId()).isEqualTo("30");
            assertThat(auditLog.getIpAddress()).isEqualTo("10.0.0.4");
            assertThat(auditLog.getSeverity()).isEqualTo("INFO");
        }
    }

    @Nested
    @DisplayName("관리자 계정 삭제 - deleteAdmin()")
    class DeleteAdmin {

        @Test
        @DisplayName("관리자 계정을 삭제하고 감사 로그를 기록한다")
        void deletesAdminAndAuditLog() {
            Admin admin = createAdmin(
                40L,
                "delete@career-wave.com",
                "delete-admin",
                AdminRole.BACKEND,
                AdminStatus.ACTIVE,
                null,
                null,
                ZonedDateTime.parse("2026-06-15T05:00:00Z"),
                ZonedDateTime.parse("2026-06-15T05:30:00Z")
            );

            given(adminRepository.findById(40L)).willReturn(Optional.of(admin));

            adminManagementService.deleteAdmin(40L, 1L, "10.0.0.5");

            ArgumentCaptor<kr.co.carrer.admin.admin.entity.AuditLog> auditLogCaptor =
                ArgumentCaptor.forClass(kr.co.carrer.admin.admin.entity.AuditLog.class);

            verify(adminRepository).findById(40L);
            verify(adminRepository).delete(admin);
            verify(auditLogRepository).save(auditLogCaptor.capture());

            var auditLog = auditLogCaptor.getValue();
            assertThat(auditLog.getAdminId()).isEqualTo(1L);
            assertThat(auditLog.getLogType()).isEqualTo("ADMIN_MANAGEMENT");
            assertThat(auditLog.getAction()).isEqualTo("DELETE_ADMIN");
            assertThat(auditLog.getTargetType()).isEqualTo("ADMIN");
            assertThat(auditLog.getTargetId()).isEqualTo("40");
            assertThat(auditLog.getIpAddress()).isEqualTo("10.0.0.5");
            assertThat(auditLog.getSeverity()).isEqualTo("INFO");
        }

        @Test
        @DisplayName("본인 관리자 계정 삭제 요청 시 CANNOT_DELETE_SELF 예외를 반환한다")
        void throwsWhenDeletingSelf() {
            assertThatThrownBy(() -> adminManagementService.deleteAdmin(1L, 1L, "10.0.0.5"))
                .isInstanceOf(kr.co.carrer.global.exception.CustomException.class)
                .extracting(exception -> ((kr.co.carrer.global.exception.CustomException) exception).getErrorCode())
                .isEqualTo(AdminManagementErrorCode.CANNOT_DELETE_SELF);

            verify(adminRepository, never()).findById(org.mockito.ArgumentMatchers.anyLong());
            verify(adminRepository, never()).delete(org.mockito.ArgumentMatchers.any(Admin.class));
            verify(auditLogRepository, never()).save(org.mockito.ArgumentMatchers.any());
        }
    }

    @Nested
    @DisplayName("IP ACL 목록 조회 - getIpAcls()")
    class GetIpAcls {

        @Test
        @DisplayName("IP ACL 목록을 1-based 페이지 응답으로 반환한다")
        void returnsIpAclListWithPagination() {
            ZonedDateTime createdAt = ZonedDateTime.parse("2026-06-15T04:00:00Z");
            ZonedDateTime updatedAt = ZonedDateTime.parse("2026-06-15T04:30:00Z");

            IpAcl ipAcl = createIpAcl(
                100L,
                "사내망",
                "10.0.0.0/24",
                true,
                "본사 내부망",
                createdAt,
                updatedAt
            );

            given(ipAclQueryRepository.findIpAcls(PageRequest.of(0, 20)))
                .willReturn(new PageImpl<>(List.of(ipAcl), PageRequest.of(0, 20), 1));

            var result = adminManagementService.getIpAcls(1, 20);

            assertThat(result.page()).isEqualTo(1);
            assertThat(result.size()).isEqualTo(20);
            assertThat(result.totalItems()).isEqualTo(1);
            assertThat(result.totalPages()).isEqualTo(1);
            assertThat(result.items()).hasSize(1);

            AdminManagementService.IpAclListItem item = result.items().getFirst();
            assertThat(item.ipAclId()).isEqualTo(100L);
            assertThat(item.label()).isEqualTo("사내망");
            assertThat(item.ipRange()).isEqualTo("10.0.0.0/24");
            assertThat(item.isEnabled()).isTrue();
            assertThat(item.description()).isEqualTo("본사 내부망");
            assertThat(item.createdAt()).isEqualTo(createdAt);
            assertThat(item.updatedAt()).isEqualTo(updatedAt);
        }
    }

    @Nested
    @DisplayName("IP ACL 등록 - createIpAcl()")
    class CreateIpAcl {

        @Test
        @DisplayName("IP ACL을 등록하고 감사 로그를 기록한다")
        void createsIpAclAndAuditLog() {
            given(ipAclRepository.existsByIpRange("10.0.0.0/24")).willReturn(false);
            given(ipAclRepository.saveAndFlush(org.mockito.ArgumentMatchers.any(IpAcl.class)))
                .willAnswer(invocation -> {
                    IpAcl savedIpAcl = invocation.getArgument(0);
                    setField(savedIpAcl, "ipAclId", 200L);
                    setField(savedIpAcl, "createdAt", ZonedDateTime.parse("2026-06-15T14:00:00Z"));
                    setField(savedIpAcl, "updatedAt", ZonedDateTime.parse("2026-06-15T14:00:00Z"));
                    return savedIpAcl;
                });

            var command = new AdminManagementService.CreateIpAclCommand(
                "사내망",
                "10.0.0.0/24",
                "본사 내부망"
            );

            var result = adminManagementService.createIpAcl(command, 1L, "10.0.0.6");

            ArgumentCaptor<IpAcl> ipAclCaptor = ArgumentCaptor.forClass(IpAcl.class);
            ArgumentCaptor<kr.co.carrer.admin.admin.entity.AuditLog> auditLogCaptor =
                ArgumentCaptor.forClass(kr.co.carrer.admin.admin.entity.AuditLog.class);

            verify(ipAclRepository).saveAndFlush(ipAclCaptor.capture());
            verify(auditLogRepository).save(auditLogCaptor.capture());

            IpAcl savedIpAcl = ipAclCaptor.getValue();
            assertThat(savedIpAcl.getLabel()).isEqualTo("사내망");
            assertThat(savedIpAcl.getIpRange()).isEqualTo("10.0.0.0/24");
            assertThat(savedIpAcl.getIsEnabled()).isTrue();
            assertThat(savedIpAcl.getDescription()).isEqualTo("본사 내부망");

            var auditLog = auditLogCaptor.getValue();
            assertThat(auditLog.getAdminId()).isEqualTo(1L);
            assertThat(auditLog.getLogType()).isEqualTo("ADMIN_MANAGEMENT");
            assertThat(auditLog.getAction()).isEqualTo("CREATE_IP_ACL");
            assertThat(auditLog.getTargetType()).isEqualTo("IP_ACL");
            assertThat(auditLog.getTargetId()).isEqualTo("200");
            assertThat(auditLog.getIpAddress()).isEqualTo("10.0.0.6");
            assertThat(auditLog.getSeverity()).isEqualTo("INFO");

            assertThat(result.ipAclId()).isEqualTo(200L);
            assertThat(result.label()).isEqualTo("사내망");
            assertThat(result.ipRange()).isEqualTo("10.0.0.0/24");
            assertThat(result.isEnabled()).isTrue();
            assertThat(result.description()).isEqualTo("본사 내부망");
        }

        @Test
        @DisplayName("이미 존재하는 IP 범위면 IP_ACL_DUPLICATED_RANGE 예외를 반환한다")
        void throwsWhenIpAclRangeAlreadyExists() {
            given(ipAclRepository.existsByIpRange("10.0.0.0/24")).willReturn(true);

            var command = new AdminManagementService.CreateIpAclCommand(
                "사내망",
                "10.0.0.0/24",
                "본사 내부망"
            );

            assertThatThrownBy(() -> adminManagementService.createIpAcl(command, 1L, "10.0.0.6"))
                .isInstanceOf(kr.co.carrer.global.exception.CustomException.class)
                .extracting(exception -> ((kr.co.carrer.global.exception.CustomException) exception).getErrorCode())
                .isEqualTo(AdminManagementErrorCode.IP_ACL_DUPLICATED_RANGE);

            verify(ipAclRepository, never()).saveAndFlush(org.mockito.ArgumentMatchers.any(IpAcl.class));
            verify(auditLogRepository, never()).save(org.mockito.ArgumentMatchers.any());
        }
    }

    @Nested
    @DisplayName("IP ACL 활성/비활성 변경 - updateIpAclEnabled()")
    class UpdateIpAclEnabled {

        @Test
        @DisplayName("IP ACL을 활성에서 비활성으로 변경하고 감사 로그를 기록한다")
        void updatesIpAclEnabledAndAuditLog() {
            IpAcl ipAcl = createIpAcl(
                300L,
                "사내망",
                "10.0.0.0/24",
                true,
                "본사 내부망",
                ZonedDateTime.parse("2026-06-15T03:00:00Z"),
                ZonedDateTime.parse("2026-06-15T03:30:00Z")
            );

            given(ipAclRepository.findById(300L)).willReturn(Optional.of(ipAcl));

            var command = new AdminManagementService.UpdateIpAclEnabledCommand(false);

            var result = adminManagementService.updateIpAclEnabled(300L, command, 1L, "10.0.0.7");

            ArgumentCaptor<kr.co.carrer.admin.admin.entity.AuditLog> auditLogCaptor =
                ArgumentCaptor.forClass(kr.co.carrer.admin.admin.entity.AuditLog.class);

            verify(ipAclRepository).findById(300L);
            verify(auditLogRepository).save(auditLogCaptor.capture());

            assertThat(ipAcl.getIsEnabled()).isFalse();
            assertThat(result.ipAclId()).isEqualTo(300L);
            assertThat(result.isEnabled()).isFalse();
            assertThat(result.ipRange()).isEqualTo("10.0.0.0/24");

            var auditLog = auditLogCaptor.getValue();
            assertThat(auditLog.getAdminId()).isEqualTo(1L);
            assertThat(auditLog.getLogType()).isEqualTo("ADMIN_MANAGEMENT");
            assertThat(auditLog.getAction()).isEqualTo("UPDATE_IP_ACL_ENABLED");
            assertThat(auditLog.getTargetType()).isEqualTo("IP_ACL");
            assertThat(auditLog.getTargetId()).isEqualTo("300");
            assertThat(auditLog.getIpAddress()).isEqualTo("10.0.0.7");
            assertThat(auditLog.getSeverity()).isEqualTo("INFO");
        }
    }

    private Admin createAdmin(
        Long adminId,
        String email,
        String name,
        AdminRole adminRole,
        AdminStatus status,
        ZonedDateTime lastLoginAt,
        String lastLoginIp,
        ZonedDateTime createdAt,
        ZonedDateTime updatedAt
    ) {
        try {
            Admin admin = Admin.create(email, "encoded-password", name, adminRole);
            setField(admin, "adminId", adminId);
            setField(admin, "status", status);
            setField(admin, "lastLoginAt", lastLoginAt);
            setField(admin, "lastLoginIp", lastLoginIp);
            setField(admin, "createdAt", createdAt);
            setField(admin, "updatedAt", updatedAt);
            return admin;
        } catch (Exception exception) {
            throw new RuntimeException(exception);
        }
    }

    @Nested
    @DisplayName("IP ACL 삭제 - deleteIpAcl()")
    class DeleteIpAcl {

        @Test
        @DisplayName("IP ACL을 삭제하고 감사 로그를 기록한다")
        void deletesIpAclAndAuditLog() {
            IpAcl ipAcl = createIpAcl(
                400L,
                "외부 VPN",
                "172.16.0.0/24",
                true,
                "원격 운영망",
                ZonedDateTime.parse("2026-06-15T02:00:00Z"),
                ZonedDateTime.parse("2026-06-15T02:30:00Z")
            );

            given(ipAclRepository.findById(400L)).willReturn(Optional.of(ipAcl));

            adminManagementService.deleteIpAcl(400L, 1L, "10.0.0.8");

            ArgumentCaptor<kr.co.carrer.admin.admin.entity.AuditLog> auditLogCaptor =
                ArgumentCaptor.forClass(kr.co.carrer.admin.admin.entity.AuditLog.class);

            verify(ipAclRepository).findById(400L);
            verify(ipAclRepository).delete(ipAcl);
            verify(auditLogRepository).save(auditLogCaptor.capture());

            var auditLog = auditLogCaptor.getValue();
            assertThat(auditLog.getAdminId()).isEqualTo(1L);
            assertThat(auditLog.getLogType()).isEqualTo("ADMIN_MANAGEMENT");
            assertThat(auditLog.getAction()).isEqualTo("DELETE_IP_ACL");
            assertThat(auditLog.getTargetType()).isEqualTo("IP_ACL");
            assertThat(auditLog.getTargetId()).isEqualTo("400");
            assertThat(auditLog.getIpAddress()).isEqualTo("10.0.0.8");
            assertThat(auditLog.getSeverity()).isEqualTo("INFO");
        }
    }

    @Nested
    @DisplayName("관리자/ACL 미존재 예외")
    class NotFoundCases {

        @Test
        @DisplayName("존재하지 않는 관리자 권한 변경은 ADMIN_NOT_FOUND 예외를 반환한다")
        void updateAdminRole_notFound() {
            given(adminRepository.findById(999L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminManagementService.updateAdminRole(
                999L,
                new AdminManagementService.UpdateAdminRoleCommand(AdminRole.CS),
                1L,
                "10.0.0.9"
            ))
                .isInstanceOf(kr.co.carrer.global.exception.CustomException.class)
                .extracting(exception -> ((kr.co.carrer.global.exception.CustomException) exception).getErrorCode())
                .isEqualTo(AdminManagementErrorCode.ADMIN_NOT_FOUND);
        }

        @Test
        @DisplayName("존재하지 않는 관리자 상태 변경은 ADMIN_NOT_FOUND 예외를 반환한다")
        void updateAdminStatus_notFound() {
            given(adminRepository.findById(999L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminManagementService.updateAdminStatus(
                999L,
                new AdminManagementService.UpdateAdminStatusCommand(AdminStatus.LOCKED),
                1L,
                "10.0.0.9"
            ))
                .isInstanceOf(kr.co.carrer.global.exception.CustomException.class)
                .extracting(exception -> ((kr.co.carrer.global.exception.CustomException) exception).getErrorCode())
                .isEqualTo(AdminManagementErrorCode.ADMIN_NOT_FOUND);
        }

        @Test
        @DisplayName("존재하지 않는 관리자 삭제는 ADMIN_NOT_FOUND 예외를 반환한다")
        void deleteAdmin_notFound() {
            given(adminRepository.findById(999L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminManagementService.deleteAdmin(999L, 1L, "10.0.0.9"))
                .isInstanceOf(kr.co.carrer.global.exception.CustomException.class)
                .extracting(exception -> ((kr.co.carrer.global.exception.CustomException) exception).getErrorCode())
                .isEqualTo(AdminManagementErrorCode.ADMIN_NOT_FOUND);
        }

        @Test
        @DisplayName("존재하지 않는 ACL 활성 변경은 IP_ACL_NOT_FOUND 예외를 반환한다")
        void updateIpAclEnabled_notFound() {
            given(ipAclRepository.findById(999L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminManagementService.updateIpAclEnabled(
                999L,
                new AdminManagementService.UpdateIpAclEnabledCommand(false),
                1L,
                "10.0.0.9"
            ))
                .isInstanceOf(kr.co.carrer.global.exception.CustomException.class)
                .extracting(exception -> ((kr.co.carrer.global.exception.CustomException) exception).getErrorCode())
                .isEqualTo(AdminManagementErrorCode.IP_ACL_NOT_FOUND);
        }

        @Test
        @DisplayName("존재하지 않는 ACL 삭제는 IP_ACL_NOT_FOUND 예외를 반환한다")
        void deleteIpAcl_notFound() {
            given(ipAclRepository.findById(999L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminManagementService.deleteIpAcl(999L, 1L, "10.0.0.9"))
                .isInstanceOf(kr.co.carrer.global.exception.CustomException.class)
                .extracting(exception -> ((kr.co.carrer.global.exception.CustomException) exception).getErrorCode())
                .isEqualTo(AdminManagementErrorCode.IP_ACL_NOT_FOUND);
        }
    }

    @Nested
    @DisplayName("관리자/ACL 중복 상태 변경 예외")
    class DuplicateStateCases {

        @Test
        @DisplayName("이미 LOCKED 상태인 관리자에 LOCKED 요청 시 ADMIN_ALREADY_LOCKED 예외를 반환한다")
        void updateAdminStatus_alreadyLocked() {
            Admin admin = createAdmin(
                50L,
                "locked@career-wave.com",
                "locked-admin",
                AdminRole.BACKEND,
                AdminStatus.LOCKED,
                null,
                null,
                ZonedDateTime.parse("2026-06-15T01:00:00Z"),
                ZonedDateTime.parse("2026-06-15T01:30:00Z")
            );
            given(adminRepository.findById(50L)).willReturn(Optional.of(admin));

            assertThatThrownBy(() -> adminManagementService.updateAdminStatus(
                50L,
                new AdminManagementService.UpdateAdminStatusCommand(AdminStatus.LOCKED),
                1L,
                "10.0.0.10"
            ))
                .isInstanceOf(kr.co.carrer.global.exception.CustomException.class)
                .extracting(exception -> ((kr.co.carrer.global.exception.CustomException) exception).getErrorCode())
                .isEqualTo(AdminManagementErrorCode.ADMIN_ALREADY_LOCKED);
        }

        @Test
        @DisplayName("이미 ACTIVE 상태인 관리자에 ACTIVE 요청 시 ADMIN_ALREADY_ACTIVE 예외를 반환한다")
        void updateAdminStatus_alreadyActive() {
            Admin admin = createAdmin(
                51L,
                "active@career-wave.com",
                "active-admin",
                AdminRole.BACKEND,
                AdminStatus.ACTIVE,
                null,
                null,
                ZonedDateTime.parse("2026-06-15T01:00:00Z"),
                ZonedDateTime.parse("2026-06-15T01:30:00Z")
            );
            given(adminRepository.findById(51L)).willReturn(Optional.of(admin));

            assertThatThrownBy(() -> adminManagementService.updateAdminStatus(
                51L,
                new AdminManagementService.UpdateAdminStatusCommand(AdminStatus.ACTIVE),
                1L,
                "10.0.0.10"
            ))
                .isInstanceOf(kr.co.carrer.global.exception.CustomException.class)
                .extracting(exception -> ((kr.co.carrer.global.exception.CustomException) exception).getErrorCode())
                .isEqualTo(AdminManagementErrorCode.ADMIN_ALREADY_ACTIVE);
        }

        @Test
        @DisplayName("이미 활성 상태인 ACL에 활성 요청 시 IP_ACL_ALREADY_ENABLED 예외를 반환한다")
        void updateIpAclEnabled_alreadyEnabled() {
            IpAcl ipAcl = createIpAcl(
                500L,
                "사내망",
                "10.0.0.0/24",
                true,
                "본사 내부망",
                ZonedDateTime.parse("2026-06-15T01:00:00Z"),
                ZonedDateTime.parse("2026-06-15T01:30:00Z")
            );
            given(ipAclRepository.findById(500L)).willReturn(Optional.of(ipAcl));

            assertThatThrownBy(() -> adminManagementService.updateIpAclEnabled(
                500L,
                new AdminManagementService.UpdateIpAclEnabledCommand(true),
                1L,
                "10.0.0.10"
            ))
                .isInstanceOf(kr.co.carrer.global.exception.CustomException.class)
                .extracting(exception -> ((kr.co.carrer.global.exception.CustomException) exception).getErrorCode())
                .isEqualTo(AdminManagementErrorCode.IP_ACL_ALREADY_ENABLED);
        }

        @Test
        @DisplayName("이미 비활성 상태인 ACL에 비활성 요청 시 IP_ACL_ALREADY_DISABLED 예외를 반환한다")
        void updateIpAclEnabled_alreadyDisabled() {
            IpAcl ipAcl = createIpAcl(
                501L,
                "외부 VPN",
                "172.16.0.0/24",
                false,
                "원격 운영망",
                ZonedDateTime.parse("2026-06-15T01:00:00Z"),
                ZonedDateTime.parse("2026-06-15T01:30:00Z")
            );
            given(ipAclRepository.findById(501L)).willReturn(Optional.of(ipAcl));

            assertThatThrownBy(() -> adminManagementService.updateIpAclEnabled(
                501L,
                new AdminManagementService.UpdateIpAclEnabledCommand(false),
                1L,
                "10.0.0.10"
            ))
                .isInstanceOf(kr.co.carrer.global.exception.CustomException.class)
                .extracting(exception -> ((kr.co.carrer.global.exception.CustomException) exception).getErrorCode())
                .isEqualTo(AdminManagementErrorCode.IP_ACL_ALREADY_DISABLED);
        }
    }

    @Nested
    @DisplayName("감사 추적 AuditLog 기록")
    class AuditLogRecording {

        @Test
        @DisplayName("관리자 생성 시 AuditLog 필수 필드가 기대한 값으로 기록된다")
        void recordsAuditLogMetadataOnCreateAdmin() {
            given(adminRepository.existsByEmail("audit@career-wave.com")).willReturn(false);
            given(passwordEncoder.encode("temporary-password")).willReturn("encoded-password");
            given(adminRepository.saveAndFlush(org.mockito.ArgumentMatchers.any(Admin.class)))
                .willAnswer(invocation -> {
                    Admin savedAdmin = invocation.getArgument(0);
                    setField(savedAdmin, "adminId", 700L);
                    setField(savedAdmin, "createdAt", ZonedDateTime.parse("2026-06-15T15:00:00Z"));
                    setField(savedAdmin, "updatedAt", ZonedDateTime.parse("2026-06-15T15:00:00Z"));
                    return savedAdmin;
                });

            var command = new AdminManagementService.CreateAdminCommand(
                "audit@career-wave.com",
                "temporary-password",
                "audit-admin",
                AdminRole.BACKEND
            );

            adminManagementService.createAdmin(command, 77L, "192.168.0.10");

            ArgumentCaptor<kr.co.carrer.admin.admin.entity.AuditLog> auditLogCaptor =
                ArgumentCaptor.forClass(kr.co.carrer.admin.admin.entity.AuditLog.class);

            verify(auditLogRepository).save(auditLogCaptor.capture());

            var auditLog = auditLogCaptor.getValue();
            assertThat(auditLog.getAdminId()).isEqualTo(77L);
            assertThat(auditLog.getLogType()).isEqualTo("ADMIN_MANAGEMENT");
            assertThat(auditLog.getAction()).isEqualTo("CREATE_ADMIN");
            assertThat(auditLog.getTargetType()).isEqualTo("ADMIN");
            assertThat(auditLog.getTargetId()).isEqualTo("700");
            assertThat(auditLog.getIpAddress()).isEqualTo("192.168.0.10");
            assertThat(auditLog.getSeverity()).isEqualTo("INFO");
            assertThat(auditLog.getDetail()).isNull();
        }
    }

    private IpAcl createIpAcl(
        Long ipAclId,
        String label,
        String ipRange,
        Boolean isEnabled,
        String description,
        ZonedDateTime createdAt,
        ZonedDateTime updatedAt
    ) {
        try {
            IpAcl ipAcl = IpAcl.create(label, ipRange, description);
            setField(ipAcl, "ipAclId", ipAclId);
            setField(ipAcl, "isEnabled", isEnabled);
            setField(ipAcl, "createdAt", createdAt);
            setField(ipAcl, "updatedAt", updatedAt);
            return ipAcl;
        } catch (Exception exception) {
            throw new RuntimeException(exception);
        }
    }

    private void setField(Object target, String fieldName, Object value) throws Exception {
        ReflectionTestUtils.setField(target, fieldName, value);
    }
}
