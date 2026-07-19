from dataclasses import dataclass


@dataclass(frozen=True)
class FilterOptionDefinition:
    code: str
    label: str
    keywords: tuple[str, ...]


JOB_CATEGORY_OPTIONS = (
    FilterOptionDefinition("BACKEND", "백엔드", ("BACKEND", "백엔드", "JAVA 개발", "SPRING")),
    FilterOptionDefinition("FRONTEND", "프론트엔드", ("FRONTEND", "프론트엔드", "WEB PUBLISHER", "웹퍼블리셔")),
    FilterOptionDefinition("FULLSTACK", "풀스택", ("FULLSTACK", "FULL STACK", "풀스택")),
    FilterOptionDefinition("MOBILE", "모바일", ("MOBILE", "모바일", "FLUTTER", "REACT NATIVE")),
    FilterOptionDefinition("IOS", "iOS", ("IOS", "아이오에스")),
    FilterOptionDefinition("ANDROID", "Android", ("ANDROID", "안드로이드")),
    FilterOptionDefinition("SERVER", "서버", ("SERVER", "서버", "API")),
    FilterOptionDefinition("WEB_DEVELOPMENT", "웹개발", ("WEB DEVELOPMENT", "WEB DEVELOPER", "웹개발")),
    FilterOptionDefinition("SOFTWARE_ENGINEER", "소프트웨어 엔지니어", ("SOFTWARE ENGINEER", "소프트웨어 엔지니어")),
    FilterOptionDefinition("SYSTEM_ENGINEER", "시스템 엔지니어", ("SYSTEM ENGINEER", "시스템 엔지니어")),
    FilterOptionDefinition("DATA_ANALYST", "데이터 분석가", ("DATA ANALYST", "DATA ANALYTICS", "데이터 분석가", "데이터분석가")),
    FilterOptionDefinition("DATA_ENGINEER", "데이터 엔지니어", ("DATA ENGINEER", "데이터 엔지니어", "데이터엔지니어")),
    FilterOptionDefinition("DATA_SCIENTIST", "데이터 사이언티스트", ("DATA SCIENTIST", "데이터 사이언티스트", "데이터사이언티스트")),
    FilterOptionDefinition("ML_ENGINEER", "머신러닝 엔지니어", ("MACHINE LEARNING ENGINEER", "ML ENGINEER", "머신러닝 엔지니어")),
    FilterOptionDefinition("AI_ENGINEER", "AI 엔지니어", ("AI ENGINEER", "인공지능 엔지니어", "AI 엔지니어")),
    FilterOptionDefinition("MLOPS", "MLOps", ("MLOPS", "ML OPS", "엠엘옵스")),
    FilterOptionDefinition("BI", "BI", ("BUSINESS INTELLIGENCE", "BI", "비아이")),
    FilterOptionDefinition("DBA", "DBA", ("DATABASE ADMINISTRATOR", "DBA", "데이터베이스 관리자")),
)

JOB_TYPE_OPTIONS = (
    FilterOptionDefinition("FULL_TIME", "정규직", ("정규직", "상용직", "FULLTIME", "FULL TIME", "FULL_TIME")),
    FilterOptionDefinition("CONTRACT", "계약직", ("계약직", "기간제", "파견직", "CONTRACT", "TEMPORARY")),
    FilterOptionDefinition("INTERN", "인턴", ("인턴", "INTERNSHIP", "교육생")),
    FilterOptionDefinition("FREELANCE", "프리랜서", ("프리랜서", "FREELANCE")),
    FilterOptionDefinition("DAILY", "일용직", ("일용직", "일용", "DAILY")),
)

LOCATION_OPTIONS = (
    FilterOptionDefinition("SEOUL", "서울", ("서울", "SEOUL")),
    FilterOptionDefinition("GYEONGGI", "경기", ("경기", "GYEONGGI", "성남", "수원", "용인", "고양", "부천", "안양", "판교")),
    FilterOptionDefinition("INCHEON", "인천", ("인천", "INCHEON")),
    FilterOptionDefinition("BUSAN", "부산", ("부산", "BUSAN")),
    FilterOptionDefinition("DAEGU", "대구", ("대구", "DAEGU")),
    FilterOptionDefinition("GWANGJU", "광주", ("광주", "GWANGJU")),
    FilterOptionDefinition("DAEJEON", "대전", ("대전", "DAEJEON")),
    FilterOptionDefinition("ULSAN", "울산", ("울산", "ULSAN")),
    FilterOptionDefinition("SEJONG", "세종", ("세종", "SEJONG")),
    FilterOptionDefinition("GANGWON", "강원", ("강원", "GANGWON")),
    FilterOptionDefinition("CHUNGBUK", "충북", ("충북", "CHUNGBUK")),
    FilterOptionDefinition("CHUNGNAM", "충남", ("충남", "CHUNGNAM")),
    FilterOptionDefinition("JEONBUK", "전북", ("전북", "JEONBUK")),
    FilterOptionDefinition("JEONNAM", "전남", ("전남", "JEONNAM")),
    FilterOptionDefinition("GYEONGBUK", "경북", ("경북", "GYEONGBUK")),
    FilterOptionDefinition("GYEONGNAM", "경남", ("경남", "GYEONGNAM")),
    FilterOptionDefinition("JEJU", "제주", ("제주", "JEJU")),
    FilterOptionDefinition("OVERSEAS", "해외", ("해외", "OVERSEAS", "GLOBAL", "FOREIGN")),
)

COMPANY_SIZE_OPTIONS = (
    FilterOptionDefinition("STARTUP", "스타트업", ("스타트업", "벤처", "STARTUP")),
    FilterOptionDefinition("SME", "중소기업", ("중소기업", "중소", "SME", "SMALL MEDIUM")),
    FilterOptionDefinition("MID_MARKET", "중견기업", ("중견기업", "중견", "MID MARKET", "MIDSIZE")),
    FilterOptionDefinition("LARGE", "대기업", ("대기업", "대기업 계열", "LARGE", "ENTERPRISE")),
    FilterOptionDefinition("PUBLIC", "공기업", ("공기업", "공공기관", "공사", "PUBLIC")),
    FilterOptionDefinition("UNICORN", "유니콘", ("유니콘", "UNICORN")),
    FilterOptionDefinition("FOREIGN", "외국계", ("외국계", "외국 기업", "FOREIGN")),
)
