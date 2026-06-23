package kr.co.carrer.admin.dashboard.repository;

import kr.co.carrer.admin.dashboard.type.DashboardRangeType;

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

    public DashboardQueryWindow {
        if (range == null) {
            throw new IllegalArgumentException("dashboard range is required.");
        }
        if (rangeStartInclusive == null || rangeEndExclusive == null) {
            throw new IllegalArgumentException("dashboard query window requires start and end.");
        }
        if (!ZoneOffset.UTC.equals(rangeStartInclusive.getOffset())
                || !ZoneOffset.UTC.equals(rangeEndExclusive.getOffset())) {
            throw new IllegalArgumentException("dashboard query window must be normalized to UTC.");
        }
        if (!rangeStartInclusive.isBefore(rangeEndExclusive)) {
            throw new IllegalArgumentException("dashboard query window start must be before end.");
        }
    }

    public static DashboardQueryWindow of(DashboardRangeType range, ZonedDateTime baseDateTimeUtc) {
        if (baseDateTimeUtc == null) {
            throw new IllegalArgumentException("dashboard base date time is required.");
        }

        ZonedDateTime normalizedBaseDateTime = baseDateTimeUtc.withZoneSameInstant(ZoneOffset.UTC);
        ZonedDateTime rangeEndExclusive = normalizedBaseDateTime.plusNanos(1);

        return switch (range) {
            case TODAY -> {
                ZonedDateTime rangeStartInclusive = normalizedBaseDateTime
                        .toLocalDate()
                        .atStartOfDay()
                        .atZone(ZoneOffset.UTC);
                yield new DashboardQueryWindow(range, rangeStartInclusive, rangeEndExclusive);
            }
            case DAYS_7 -> new DashboardQueryWindow(
                    range,
                    normalizedBaseDateTime.minusDays(7),
                    rangeEndExclusive
            );
            case DAYS_30 -> new DashboardQueryWindow(
                    range,
                    normalizedBaseDateTime.minusDays(30),
                    rangeEndExclusive
            );
        };
    }
}
