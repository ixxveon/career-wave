package kr.co.carrer.admin.dashboard.repository;

import kr.co.carrer.admin.dashboard.type.DashboardRangeType;
import kr.co.carrer.global.exception.BadRequestException;
import kr.co.carrer.global.exception.ErrorCode;

import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;

/**
 * Query layer input contract for dashboard range aggregation.
 * <p>
 * All dashboard summary queries must receive a normalized UTC time window.
 * The upper bound is exclusive so multiple aggregations can reuse the same window safely.
 */
public record DashboardQueryWindow(
        DashboardRangeType range,
        ZonedDateTime rangeStartInclusive,
        ZonedDateTime rangeEndExclusive
) {
    private static final ZoneId KOREA_ZONE_ID = ZoneId.of("Asia/Seoul");
    private static final ZoneOffset UTC = ZoneOffset.UTC;

    public DashboardQueryWindow {
        if (range == null) {
            throw new BadRequestException(ErrorCode.BAD_REQUEST, "dashboard range is required.");
        }
        if (rangeStartInclusive == null || rangeEndExclusive == null) {
            throw new BadRequestException(ErrorCode.BAD_REQUEST, "dashboard query window requires start and end.");
        }
        if (!UTC.equals(rangeStartInclusive.getOffset())
                || !UTC.equals(rangeEndExclusive.getOffset())) {
            throw new BadRequestException(ErrorCode.BAD_REQUEST, "dashboard query window must be normalized to UTC.");
        }
        if (!rangeStartInclusive.isBefore(rangeEndExclusive)) {
            throw new BadRequestException(ErrorCode.BAD_REQUEST, "dashboard query window start must be before end.");
        }
    }

    public static DashboardQueryWindow of(DashboardRangeType range, ZonedDateTime baseDateTimeUtc) {
        if (range == null) {
            throw new BadRequestException(ErrorCode.BAD_REQUEST, "dashboard range is required.");
        }
        if (baseDateTimeUtc == null) {
            throw new BadRequestException(ErrorCode.BAD_REQUEST, "dashboard base date time is required.");
        }

        ZonedDateTime normalizedBaseDateTime = baseDateTimeUtc.withZoneSameInstant(UTC);
        ZonedDateTime koreaBaseDateTime = normalizedBaseDateTime.withZoneSameInstant(KOREA_ZONE_ID);
        ZonedDateTime rangeEndExclusive = normalizedBaseDateTime.plusNanos(1);

        return switch (range) {
            case TODAY -> {
                ZonedDateTime rangeStartInclusive = koreaBaseDateTime
                        .toLocalDate()
                        .atStartOfDay()
                        .atZone(KOREA_ZONE_ID)
                        .withZoneSameInstant(UTC);
                yield new DashboardQueryWindow(range, rangeStartInclusive, rangeEndExclusive);
            }
            case DAYS_7 -> new DashboardQueryWindow(
                    range,
                    koreaBaseDateTime.minusDays(7).withZoneSameInstant(UTC),
                    rangeEndExclusive
            );
            case DAYS_30 -> new DashboardQueryWindow(
                    range,
                    koreaBaseDateTime.minusDays(30).withZoneSameInstant(UTC),
                    rangeEndExclusive
            );
        };
    }
}
