from datetime import date, timedelta

from admin.scraping.adapter import RawJobNotice
from admin.scraping.service import JobNoticeNormalizer


SPRING_JOB_TYPES = {"FULLTIME", "INTERN", "CONTRACT"}
SPRING_COMPANY_SIZES = {"STARTUP", "SME", "LARGE"}
SPRING_CAREER_LEVELS = {"JUNIOR", "SENIOR", "ANY"}
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

    assert notice.job_type == "FULLTIME"
    assert notice.company_size == "SME"
    assert notice.career_level == "JUNIOR"
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
    assert intern_notice.career_level == "JUNIOR"
    assert contract_notice.job_type == "CONTRACT"
    assert contract_notice.company_size == "LARGE"
    assert contract_notice.career_level == "SENIOR"


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

    assert notice.job_type == "FULLTIME"
    assert notice.company_size == "SME"
    assert notice.career_level == "ANY"


def test_normalizer_closes_notice_when_deadline_is_past():
    normalizer = JobNoticeNormalizer()

    notice = normalizer.normalize(
        source_name="saramin",
        raw_notice=_raw_notice(deadline=(date.today() - timedelta(days=1)).isoformat()),
    )

    assert notice.notice_status == "CLOSED"
