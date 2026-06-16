package kr.co.carrer.admin.admin.service;

import kr.co.carrer.global.exception.CustomException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.function.Function;
import java.util.function.Supplier;

@Component
@RequiredArgsConstructor
public class AdminAuditActionExecutor {

    private static final String SUCCESS_SEVERITY = "INFO";
    private static final String FAILURE_SEVERITY = "ERROR";

    private final AdminAuditLogWriter adminAuditLogWriter;

    public <T> T execute(
            Long actorAdminId,
            String action,
            String targetType,
            Long targetId,
            String ipAddress,
            Supplier<T> work
    ) {
        return execute(actorAdminId, action, targetType, ipAddress, targetId, work, ignored -> targetId);
    }

    public <T> T execute(
            Long actorAdminId,
            String action,
            String targetType,
            String ipAddress,
            Long failureTargetId,
            Supplier<T> work,
            Function<T, Long> targetIdResolver
    ) {
        try {
            T result = work.get();
            adminAuditLogWriter.writeSuccess(
                    actorAdminId,
                    action,
                    targetType,
                    targetIdResolver.apply(result),
                    ipAddress,
                    SUCCESS_SEVERITY
            );
            return result;
        } catch (RuntimeException exception) {
            writeFailureSafely(actorAdminId, action, targetType, failureTargetId, ipAddress, exception);
            throw exception;
        }
    }

    public void execute(
            Long actorAdminId,
            String action,
            String targetType,
            Long targetId,
            String ipAddress,
            Runnable work
    ) {
        execute(actorAdminId, action, targetType, targetId, ipAddress, () -> {
            work.run();
            return null;
        });
    }

    private void writeFailureSafely(
            Long actorAdminId,
            String action,
            String targetType,
            Long targetId,
            String ipAddress,
            RuntimeException exception
    ) {
        try {
            adminAuditLogWriter.writeFailure(
                    actorAdminId,
                    action,
                    targetType,
                    targetId,
                    ipAddress,
                    FAILURE_SEVERITY,
                    buildFailureDetail(exception)
            );
        } catch (RuntimeException ignored) {
            // Preserve the original business exception even when audit logging fails.
        }
    }

    private String buildFailureDetail(RuntimeException exception) {
        if (exception instanceof CustomException customException) {
            return "result=FAILURE,errorCode=" + customException.getErrorCode().name();
        }
        return "result=FAILURE,errorCode=INTERNAL_ERROR";
    }
}
