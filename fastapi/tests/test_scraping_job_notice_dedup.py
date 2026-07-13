from admin.scraping.service import JobNoticeDedupService, NormalizedJobNotice


class _RecordingJobNoticeRepository:
    def __init__(self, existing_keys: set[tuple[str, str]] | None = None) -> None:
        self._existing_keys = existing_keys or set()
        self.saved_items: list[dict] = []
        self.exists_calls: list[tuple[str, str]] = []

    def exists_by_source_and_original_url(self, source: str, original_url: str) -> bool:
        self.exists_calls.append((source, original_url))
        return (source, original_url) in self._existing_keys

    def save(self, **kwargs) -> None:
        self.saved_items.append(kwargs)


def _notice(*, source: str, original_url: str, title: str) -> NormalizedJobNotice:
    return NormalizedJobNotice(
        company_name="Test Company",
        title=title,
        description="Description",
        skill_tags=["Python"],
        job_type="FULLTIME",
        company_size="SME",
        job_category=["BACKEND"],
        career_level="JUNIOR",
        location="Seoul",
        salary=None,
        notice_status="ACTIVE",
        original_url=original_url,
        source=source,
        view_count=0,
        deadline=None,
    )


def test_job_notice_dedup_service_skips_duplicates_within_same_batch():
    repository = _RecordingJobNoticeRepository()
    service = JobNoticeDedupService(repository)

    service.save_for_run(
        [
            _notice(source="wanted", original_url="https://wanted.co.kr/1", title="Backend 1"),
            _notice(source="wanted", original_url="https://wanted.co.kr/1", title="Backend 1 Duplicate"),
            _notice(source="wanted", original_url="https://wanted.co.kr/2", title="Backend 2"),
        ]
    )

    assert len(repository.saved_items) == 2
    assert repository.saved_items[0]["original_url"] == "https://wanted.co.kr/1"
    assert repository.saved_items[1]["original_url"] == "https://wanted.co.kr/2"
    assert "search_text" not in repository.saved_items[0]


def test_job_notice_dedup_service_delegates_existing_repository_duplicates_to_save_conflict():
    repository = _RecordingJobNoticeRepository(
        existing_keys={("saramin", "https://saramin.co.kr/jobs/10")}
    )
    service = JobNoticeDedupService(repository)

    service.save_for_retry(
        [
            _notice(source="saramin", original_url="https://saramin.co.kr/jobs/10", title="Existing"),
            _notice(source="saramin", original_url="https://saramin.co.kr/jobs/11", title="New"),
        ]
    )

    assert repository.exists_calls == []
    assert len(repository.saved_items) == 2
    assert repository.saved_items[0]["source"] == "saramin"
    assert repository.saved_items[0]["original_url"] == "https://saramin.co.kr/jobs/10"
    assert repository.saved_items[1]["original_url"] == "https://saramin.co.kr/jobs/11"
