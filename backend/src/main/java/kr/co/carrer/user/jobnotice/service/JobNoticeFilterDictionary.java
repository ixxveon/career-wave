package kr.co.carrer.user.jobnotice.service;

import java.util.List;

public final class JobNoticeFilterDictionary {

    private JobNoticeFilterDictionary() {
    }

    public static final List<String> JOB_TYPES = List.of(
            "FULL_TIME", "CONTRACT", "INTERN", "FREELANCE", "DAILY"
    );
    public static final List<String> JOB_CATEGORIES = List.of(
            "BACKEND", "FRONTEND", "FULLSTACK", "MOBILE", "IOS", "ANDROID", "SERVER",
            "WEB_DEVELOPMENT", "SOFTWARE_ENGINEER", "SYSTEM_ENGINEER", "DATA_ANALYST",
            "DATA_ENGINEER", "DATA_SCIENTIST", "ML_ENGINEER", "AI_ENGINEER", "MLOPS", "BI", "DBA"
    );
    public static final List<String> CAREER_LEVELS = List.of(
            "FRESHER", "ANY_EXPERIENCE", "INTERN", "UNDER_1", "OVER_1", "OVER_2",
            "OVER_3", "OVER_5", "OVER_7", "OVER_10"
    );
    public static final List<String> LOCATIONS = List.of(
            "SEOUL", "GYEONGGI", "INCHEON", "BUSAN", "DAEGU", "GWANGJU", "DAEJEON",
            "ULSAN", "SEJONG", "GANGWON", "CHUNGBUK", "CHUNGNAM", "JEONBUK", "JEONNAM",
            "GYEONGBUK", "GYEONGNAM", "JEJU", "OVERSEAS"
    );
    public static final List<String> COMPANY_SIZES = List.of(
            "STARTUP", "SME", "MID_MARKET", "LARGE", "PUBLIC", "UNICORN", "FOREIGN"
    );
}
