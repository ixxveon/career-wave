from dataclasses import dataclass
from datetime import date, datetime

from admin.scraping.adapter import RawJobNotice


@dataclass(frozen=True)
class NormalizedJobNotice:
    company_name: str | None
    title: str
    description: str | None
    skill_tags: list[str] | None
    job_type: str | None
    company_size: str | None
    job_category: list[str] | None
    career_level: str | None
    location: str | None
    salary: str | None
    notice_status: str
    original_url: str
    source: str
    view_count: int
    deadline: date | None


class JobNoticeNormalizer:
    def normalize(self, *, source_name: str, raw_notice: RawJobNotice) -> NormalizedJobNotice:
        if source_name == "wanted":
            return self._normalize_wanted(raw_notice)
        if source_name == "saramin":
            return self._normalize_saramin(raw_notice)
        return self._normalize_default(source_name=source_name, raw_notice=raw_notice)

    def _normalize_wanted(self, raw_notice: RawJobNotice) -> NormalizedJobNotice:
        return self._build_notice(
            source_name="wanted",
            raw_notice=raw_notice,
            skill_tags=self._normalize_distinct_list(raw_notice.skill_tags),
            job_category=self._normalize_distinct_list(raw_notice.job_category),
        )

    def _normalize_saramin(self, raw_notice: RawJobNotice) -> NormalizedJobNotice:
        return self._build_notice(
            source_name="saramin",
            raw_notice=raw_notice,
            skill_tags=self._normalize_distinct_list(raw_notice.skill_tags),
            job_category=self._normalize_distinct_list(raw_notice.job_category),
            location=self._normalize_compact_text(raw_notice.location),
        )

    def _normalize_default(self, *, source_name: str, raw_notice: RawJobNotice) -> NormalizedJobNotice:
        return self._build_notice(source_name=source_name, raw_notice=raw_notice)

    def _build_notice(
        self,
        *,
        source_name: str,
        raw_notice: RawJobNotice,
        company_name: str | None = None,
        title: str | None = None,
        description: str | None = None,
        skill_tags: list[str] | None = None,
        job_type: str | None = None,
        company_size: str | None = None,
        job_category: list[str] | None = None,
        career_level: str | None = None,
        location: str | None = None,
        salary: str | None = None,
    ) -> NormalizedJobNotice:
        return NormalizedJobNotice(
            company_name=company_name if company_name is not None else self._normalize_text(raw_notice.company_name),
            title=title if title is not None else self._normalize_required_text(raw_notice.title, fallback=raw_notice.original_url),
            description=description if description is not None else self._normalize_text(raw_notice.description),
            skill_tags=skill_tags if skill_tags is not None else self._normalize_list(raw_notice.skill_tags),
            job_type=job_type if job_type is not None else self._normalize_text(raw_notice.job_type),
            company_size=company_size if company_size is not None else self._normalize_text(raw_notice.company_size),
            job_category=job_category if job_category is not None else self._normalize_list(raw_notice.job_category),
            career_level=career_level if career_level is not None else self._normalize_text(raw_notice.career_level),
            location=location if location is not None else self._normalize_text(raw_notice.location),
            salary=salary if salary is not None else self._normalize_text(raw_notice.salary),
            notice_status="ACTIVE",
            original_url=self._normalize_required_text(raw_notice.original_url, fallback=source_name),
            source=source_name,
            view_count=0,
            deadline=self._parse_deadline(raw_notice.deadline),
        )

    @staticmethod
    def _normalize_text(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @classmethod
    def _normalize_required_text(cls, value: str | None, *, fallback: str) -> str:
        normalized = cls._normalize_text(value)
        if normalized is not None:
            return normalized
        return fallback.strip()

    @classmethod
    def _normalize_list(cls, values: list[str] | None) -> list[str] | None:
        if values is None:
            return None
        normalized = [
            item
            for item in (cls._normalize_text(value) for value in values)
            if item is not None
        ]
        return normalized or None

    @classmethod
    def _normalize_distinct_list(cls, values: list[str] | None) -> list[str] | None:
        normalized = cls._normalize_list(values)
        if normalized is None:
            return None

        distinct_items: list[str] = []
        seen: set[str] = set()
        for value in normalized:
            lowered = value.casefold()
            if lowered in seen:
                continue
            seen.add(lowered)
            distinct_items.append(value)
        return distinct_items

    @classmethod
    def _normalize_compact_text(cls, value: str | None) -> str | None:
        normalized = cls._normalize_text(value)
        if normalized is None:
            return None
        return " ".join(normalized.split())

    @staticmethod
    def _parse_deadline(value: str | None) -> date | None:
        if value is None:
            return None

        normalized = value.strip()
        if not normalized:
            return None

        for parser in (
            lambda raw: date.fromisoformat(raw),
            lambda raw: datetime.fromisoformat(raw.replace("Z", "+00:00")).date(),
            lambda raw: datetime.strptime(raw, "%Y.%m.%d").date(),
            lambda raw: datetime.strptime(raw, "%Y/%m/%d").date(),
        ):
            try:
                return parser(normalized)
            except ValueError:
                continue
        return None
