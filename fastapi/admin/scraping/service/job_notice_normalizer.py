from dataclasses import dataclass
from datetime import date, datetime, timezone

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
    _DEFAULT_JOB_TYPE = "FULLTIME"
    _DEFAULT_COMPANY_SIZE = None
    _DEFAULT_CAREER_LEVEL = "ANY"

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
        parsed_deadline = self._parse_deadline(raw_notice.deadline)
        return NormalizedJobNotice(
            company_name=company_name if company_name is not None else self._normalize_text(raw_notice.company_name),
            title=title if title is not None else self._normalize_required_text(raw_notice.title, fallback=raw_notice.original_url),
            description=description if description is not None else self._normalize_text(raw_notice.description),
            skill_tags=skill_tags if skill_tags is not None else self._normalize_list(raw_notice.skill_tags),
            job_type=self._normalize_job_type(job_type if job_type is not None else raw_notice.job_type),
            company_size=self._normalize_company_size(company_size if company_size is not None else raw_notice.company_size),
            job_category=job_category if job_category is not None else self._normalize_list(raw_notice.job_category),
            career_level=self._normalize_career_level(career_level if career_level is not None else raw_notice.career_level),
            location=location if location is not None else self._normalize_text(raw_notice.location),
            salary=salary if salary is not None else self._normalize_text(raw_notice.salary),
            notice_status=self._notice_status_from_date(parsed_deadline),
            original_url=self._normalize_required_text(raw_notice.original_url, fallback=source_name),
            source=source_name,
            view_count=0,
            deadline=parsed_deadline,
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

    @classmethod
    def _normalize_job_type(cls, value: str | None) -> str:
        normalized = cls._normalize_token(value)
        if normalized is None:
            return cls._DEFAULT_JOB_TYPE

        if any(marker in normalized for marker in ("INTERN", "INTERNSHIP", "인턴")):
            return "INTERN"
        if any(marker in normalized for marker in ("CONTRACT", "TEMPORARY", "계약", "프리랜서", "위촉")):
            return "CONTRACT"
        if any(marker in normalized for marker in ("FULLTIME", "FULL_TIME", "정규", "정직원")):
            return "FULLTIME"
        return cls._DEFAULT_JOB_TYPE

    @classmethod
    def _normalize_company_size(cls, value: str | None) -> str | None:
        normalized = cls._normalize_token(value)
        if normalized is None:
            return cls._DEFAULT_COMPANY_SIZE

        if any(marker in normalized for marker in ("LARGE", "ENTERPRISE", "대기업")):
            return "LARGE"
        if any(marker in normalized for marker in ("STARTUP", "스타트업", "벤처")):
            return "STARTUP"
        if any(marker in normalized for marker in ("MID_MARKET", "MIDMARKET", "MIDSIZE", "중견", "중견기업")):
            return "MID_MARKET"
        if any(marker in normalized for marker in ("SME", "SMALLMEDIUM", "중소", "중소기업")):
            return "SME"
        return cls._DEFAULT_COMPANY_SIZE

    @classmethod
    def _normalize_career_level(cls, value: str | None) -> str:
        normalized = cls._normalize_token(value)
        if normalized is None:
            return cls._DEFAULT_CAREER_LEVEL

        if any(marker in normalized for marker in ("ANY", "무관", "경력무관", "신입/경력")):
            return "ANY"
        if any(marker in normalized for marker in ("SENIOR", "시니어", "고급", "리드", "책임")):
            return "SENIOR"
        if any(marker in normalized for marker in ("JUNIOR", "주니어", "신입", "초급")):
            return "JUNIOR"

        years = cls._extract_year_numbers(normalized)
        if years:
            return "SENIOR" if max(years) >= 5 else "JUNIOR"
        return cls._DEFAULT_CAREER_LEVEL

    @classmethod
    @staticmethod
    def _notice_status_from_date(parsed_deadline: date | None) -> str:
        if parsed_deadline is None:
            return "ACTIVE"
        return "CLOSED" if parsed_deadline < datetime.now(timezone.utc).date() else "ACTIVE"

    @classmethod
    def _normalize_token(cls, value: str | None) -> str | None:
        normalized = cls._normalize_text(value)
        if normalized is None:
            return None
        return normalized.upper().replace(" ", "").replace("-", "_")

    @staticmethod
    def _extract_year_numbers(value: str) -> list[int]:
        numbers: list[int] = []
        current = ""
        for char in value:
            if char.isdigit():
                current += char
                continue
            if current:
                parsed = int(current)
                if 0 <= parsed <= 50:
                    numbers.append(parsed)
                current = ""
        if current:
            parsed = int(current)
            if 0 <= parsed <= 50:
                numbers.append(parsed)
        return numbers

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
