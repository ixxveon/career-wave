from datetime import date, timedelta

from admin.scraping.adapter import RawJobNotice
from admin.scraping.service import JobNoticeNormalizer


SPRING_JOB_TYPES = {"FULL_TIME", "INTERN", "CONTRACT", "FREELANCE", "DAILY"}
SPRING_COMPANY_SIZES = {"STARTUP", "SME", "MID_MARKET", "LARGE", "PUBLIC", "UNICORN", "FOREIGN"}
SPRING_CAREER_LEVELS = {"FRESHER", "ANY_EXPERIENCE", "INTERN", "UNDER_1", "OVER_1", "OVER_2", "OVER_3", "OVER_5", "OVER_7", "OVER_10"}
SPRING_NOTICE_STATUSES = {"ACTIVE", "CLOSED"}


def _raw_notice(**overrides) -> RawJobNotice:
    values = {
        "original_url": "https://example.com/jobs/1",
        "title": "Backend Engineer",
        "company_name": "Career Wave",
        "description": "Build reliable services.",
        "skill_tags": ["Python", "FastAPI"],
        "job_type": None,
        "company_size": None,
        "job_category": ["Backend"],
        "career_level": None,
        "location": "Seoul",
        "salary": None,
        "deadline": None,
    }
    values.update(overrides)
    return RawJobNotice(**values)


def test_normalizer_maps_site_values_to_spring_enums():
    normalizer = JobNoticeNormalizer()

    notice = normalizer.normalize(
        source_name="saramin",
        raw_notice=_raw_notice(
            job_type="정규직",
            company_size="중소기업",
            career_level="경력 3년 이상",
            deadline=(date.today() + timedelta(days=10)).isoformat(),
        ),
    )

    assert notice.job_type == "FULL_TIME"
    assert notice.company_size == "SME"
    assert notice.career_level == "OVER_3"
    assert notice.notice_status == "ACTIVE"
    assert notice.job_type in SPRING_JOB_TYPES
    assert notice.company_size in SPRING_COMPANY_SIZES
    assert notice.career_level in SPRING_CAREER_LEVELS
    assert notice.notice_status in SPRING_NOTICE_STATUSES


def test_normalizer_maps_intern_contract_startup_large_and_senior_values():
    normalizer = JobNoticeNormalizer()

    intern_notice = normalizer.normalize(
        source_name="wanted",
        raw_notice=_raw_notice(
            job_type="인턴",
            company_size="스타트업",
            career_level="신입",
        ),
    )
    contract_notice = normalizer.normalize(
        source_name="saramin",
        raw_notice=_raw_notice(
            job_type="계약직",
            company_size="대기업",
            career_level="5~10",
        ),
    )

    assert intern_notice.job_type == "INTERN"
    assert intern_notice.company_size == "STARTUP"
    assert intern_notice.career_level == "FRESHER"
    assert contract_notice.job_type == "CONTRACT"
    assert contract_notice.company_size == "LARGE"
    assert contract_notice.career_level == "OVER_5"


def test_normalizer_maps_mid_sized_company_to_mid_market():
    normalizer = JobNoticeNormalizer()

    notice = normalizer.normalize(
        source_name="wanted",
        raw_notice=_raw_notice(company_size="중견"),
    )

    assert notice.company_size == "MID_MARKET"


def test_normalizer_uses_standard_codes_for_extended_filter_values():
    normalizer = JobNoticeNormalizer()

    notice = normalizer.normalize(
        source_name="jumpit",
        raw_notice=_raw_notice(
            title="Machine Learning Engineer",
            job_category=None,
            job_type="Freelance",
            company_size="Foreign company",
            career_level="10 years or more",
            location="Seoul",
        ),
    )

    assert notice.job_category == ["ML_ENGINEER"]
    assert notice.job_type == "FREELANCE"
    assert notice.company_size == "FOREIGN"
    assert notice.career_level == "OVER_10"
    assert notice.career_min_years == 10
    assert notice.career_max_years is None
    assert notice.location == "SEOUL"


def test_normalizer_uses_enum_safe_fallbacks_for_unknown_values():
    normalizer = JobNoticeNormalizer()

    notice = normalizer.normalize(
        source_name="wanted",
        raw_notice=_raw_notice(
            job_type="unknown type",
            company_size="unknown size",
            career_level="unknown career",
        ),
    )

    assert notice.job_type is None
    assert notice.company_size is None
    assert notice.career_level is None


def test_normalizer_keeps_company_size_empty_when_source_value_is_missing():
    normalizer = JobNoticeNormalizer()

    notice = normalizer.normalize(
        source_name="wanted",
        raw_notice=_raw_notice(company_size=None),
    )

    assert notice.company_size is None


def test_normalizer_standardizes_job_category_location_and_company_size():
    normalizer = JobNoticeNormalizer()

    notice = normalizer.normalize(
        source_name="saramin",
        raw_notice=_raw_notice(
            title="Backend Platform Engineer",
            skill_tags=["Python", "FastAPI"],
            job_category=["IT", "Python", "2026-07-13"],
            location="\uc11c\uc6b8\ud2b9\ubcc4\uc2dc \uac15\ub0a8\uad6c",
            company_size="SME",
        ),
    )

    assert notice.job_category == ["BACKEND"]
    assert notice.skill_tags == ["Python", "FastAPI"]
    assert notice.location == "SEOUL"
    assert notice.company_size == "SME"


def test_normalizer_drops_unmapped_job_category_and_location_values():
    normalizer = JobNoticeNormalizer()

    notice = normalizer.normalize(
        source_name="wanted",
        raw_notice=_raw_notice(
            title="General Specialist",
            job_category=["IT", "2026-07-13", "Updated"],
            location="Remote worldwide",
        ),
    )

    assert notice.job_category is None
    assert notice.location is None


def test_normalizer_does_not_match_short_ascii_keywords_inside_words():
    normalizer = JobNoticeNormalizer()

    notice = normalizer.normalize(
        source_name="wanted",
        raw_notice=_raw_notice(
            title="Maintenance HTML Capital Engineer",
            job_category=None,
        ),
    )

    assert notice.job_category is None


def test_normalizer_normalizes_company_logo_urls():
    normalizer = JobNoticeNormalizer()

    protocol_relative = normalizer.normalize(
        source_name="wanted",
        raw_notice=_raw_notice(company_logo_url="//cdn.example.com/logo.png"),
    )
    invalid = normalizer.normalize(
        source_name="wanted",
        raw_notice=_raw_notice(company_logo_url="javascript:alert(1)"),
    )
    relative = normalizer.normalize(
        source_name="wanted",
        raw_notice=_raw_notice(
            original_url="https://www.wanted.co.kr/wd/123",
            company_logo_url="/images/company-logo.png",
        ),
    )

    assert protocol_relative.company_logo_url == "https://cdn.example.com/logo.png"
    assert invalid.company_logo_url is None
    assert relative.company_logo_url == "https://www.wanted.co.kr/images/company-logo.png"


def test_normalizer_closes_notice_when_deadline_is_past():
    normalizer = JobNoticeNormalizer()

    notice = normalizer.normalize(
        source_name="saramin",
        raw_notice=_raw_notice(deadline=(date.today() - timedelta(days=1)).isoformat()),
    )

    assert notice.notice_status == "CLOSED"


def test_normalizer_ignores_implausible_career_numbers():
    normalizer = JobNoticeNormalizer()

    notice = normalizer.normalize(
        source_name="wanted",
        raw_notice=_raw_notice(career_level="2024년 채용"),
    )

    assert notice.career_level is None
