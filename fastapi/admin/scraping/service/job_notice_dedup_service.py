from admin.scraping.repository import JobNoticeRepository
from admin.scraping.service.job_notice_normalizer import NormalizedJobNotice


class JobNoticeDedupService:
    def __init__(self, job_notice_repository: JobNoticeRepository) -> None:
        self._job_notice_repository = job_notice_repository

    def save_for_run(self, notices: list[NormalizedJobNotice]) -> None:
        self._save_all(notices)

    def save_for_retry(self, notices: list[NormalizedJobNotice]) -> None:
        self._save_all(notices)

    def skip_for_test(self, notices: list[NormalizedJobNotice]) -> None:
        _ = notices

    def _save_all(self, notices: list[NormalizedJobNotice]) -> None:
        for notice in self._distinct_notices(notices):
            if self._job_notice_repository.exists_by_source_and_original_url(
                notice.source,
                notice.original_url,
            ):
                continue

            self._job_notice_repository.save(
                company_name=notice.company_name,
                title=notice.title,
                description=notice.description,
                skill_tags=notice.skill_tags,
                job_type=notice.job_type,
                company_size=notice.company_size,
                job_category=notice.job_category,
                career_level=notice.career_level,
                location=notice.location,
                salary=notice.salary,
                notice_status=notice.notice_status,
                original_url=notice.original_url,
                source=notice.source,
                view_count=notice.view_count,
                deadline=notice.deadline,
            )

    def _distinct_notices(self, notices: list[NormalizedJobNotice]) -> list[NormalizedJobNotice]:
        deduplicated: list[NormalizedJobNotice] = []
        seen_keys: set[tuple[str, str]] = set()

        for notice in notices:
            dedup_key = (notice.source, notice.original_url)
            if dedup_key in seen_keys:
                continue

            seen_keys.add(dedup_key)
            deduplicated.append(notice)

        return deduplicated
