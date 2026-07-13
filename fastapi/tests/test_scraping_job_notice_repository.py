from admin.scraping.repository.job_notice_repository import JobNoticeRepository


def test_job_notice_repository_builds_search_text_from_keyword_fields():
    search_text = JobNoticeRepository._build_search_text(
        company_name="Career Wave",
        title="Backend Engineer",
        description="Build APIs",
        source="wanted",
        skill_tags=["Python", "FastAPI"],
        job_category=["BACKEND", "AI"],
    )

    assert search_text == "Career Wave Backend Engineer Build APIs wanted Python FastAPI BACKEND AI"


def test_job_notice_repository_builds_search_text_null_safely():
    search_text = JobNoticeRepository._build_search_text(
        company_name=None,
        title="Backend Engineer",
        description=" ",
        source="wanted",
        skill_tags=None,
        job_category=["BACKEND"],
    )

    assert search_text == "Backend Engineer wanted BACKEND"
