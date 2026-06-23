package kr.co.carrer.admin.dashboard.type;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import kr.co.carrer.global.exception.BadRequestException;
import kr.co.carrer.global.exception.ErrorCode;

public enum DashboardRangeType {
    TODAY("TODAY"),
    DAYS_7("7D"),
    DAYS_30("30D");

    private final String value;

    DashboardRangeType(String value) {
        this.value = value;
    }

    @JsonValue
    public String toJsonValue() {
        return value;
    }

    @JsonCreator
    public static DashboardRangeType fromJsonValue(String value) {
        if (value == null) {
            return null;
        }

        for (DashboardRangeType rangeType : values()) {
            if (rangeType.value.equalsIgnoreCase(value)) {
                return rangeType;
            }
        }

        throw new BadRequestException(ErrorCode.BAD_REQUEST, "지원하지 않는 dashboard range 입니다. " + value);
    }
}
