from collections.abc import Iterable
from contextlib import nullcontext
from time import sleep
from typing import Any

import httpx
from bs4 import BeautifulSoup

from admin.scraping.adapter.scraper_adapter import RawJobNotice, ScraperAdapter


class WantedScraper(ScraperAdapter):
    _BASE_URL = "https://www.wanted.co.kr"
    _LIST_API_URL = f"{_BASE_URL}/api/v4/jobs"
    _DEFAULT_HEADERS = {
        "User-Agent": "CareerWaveScraper/1.0 (+https://github.com/ixxveon/career-wave)",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    }

    def __init__(
        self,
        *,
        client: httpx.Client | None = None,
        timeout_seconds: float = 10.0,
        max_items: int = 20,
        request_delay_seconds: float = 0.1,
    ) -> None:
        self._client = client
        self._timeout_seconds = timeout_seconds
        self._max_items = max_items
        self._request_delay_seconds = request_delay_seconds

    @property
    def source_name(self) -> str:
        return "wanted"

    @property
    def display_name(self) -> str:
        return "Wanted"

    def scrape(self) -> list[RawJobNotice]:
        with self._client_context() as client:
            payload = self._fetch_job_list(client)
            notices: list[RawJobNotice] = []
            for item in self._iter_jobs(payload):
                notice = self._to_raw_notice(item)
                if notice is None:
                    continue

                detail = self._fetch_job_detail(client, item)
                if detail is not None:
                    notice = self._merge_detail(notice, detail)
                if notice.description is None:
                    description = self._fetch_html_description(client, notice.original_url)
                    if description:
                        notice = self._copy_notice(notice, description=description)

                notices.append(notice)
                if len(notices) >= self._max_items:
                    break
                self._delay()
            return notices

    def test_connection(self) -> bool:
        try:
            with self._client_context() as client:
                response = client.get(
                    self._LIST_API_URL,
                    params=self._list_params(limit=1, offset=0),
                )
                return response.is_success
        except httpx.HTTPError:
            return False

    def _client_context(self):
        if self._client is not None:
            return nullcontext(self._client)
        return httpx.Client(
            headers=self._DEFAULT_HEADERS,
            timeout=self._timeout_seconds,
            follow_redirects=True,
        )

    def _fetch_job_list(self, client: httpx.Client) -> dict[str, Any]:
        response = client.get(
            self._LIST_API_URL,
            params=self._list_params(limit=self._max_items, offset=0),
        )
        response.raise_for_status()
        try:
            payload = response.json()
        except ValueError:
            return {}
        return payload if isinstance(payload, dict) else {}

    @staticmethod
    def _list_params(*, limit: int, offset: int) -> dict[str, str | int]:
        return {
            "country": "kr",
            "job_sort": "job.latest_order",
            "locations": "all",
            "years": -1,
            "limit": limit,
            "offset": offset,
        }

    def _fetch_job_detail(self, client: httpx.Client, item: dict[str, Any]) -> dict[str, Any] | None:
        job_id = self._first(item, "id", "job_id", "position_id")
        if job_id is None:
            return None

        try:
            response = client.get(f"{self._BASE_URL}/api/v4/jobs/{job_id}")
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError):
            return None

        job = payload.get("job") if isinstance(payload, dict) else None
        return job if isinstance(job, dict) else None

    def _fetch_html_description(self, client: httpx.Client, original_url: str) -> str | None:
        try:
            response = client.get(original_url)
            response.raise_for_status()
        except httpx.HTTPError:
            return None

        soup = BeautifulSoup(response.text, "html.parser")
        for selector in (
            "[data-testid='JobDescription']",
            "section.JobDescription",
            "div.JobDescription",
            "article",
        ):
            element = soup.select_one(selector)
            text = self._clean_text(element.get_text(" ")) if element else None
            if text:
                return text
        return self._clean_text(soup.get_text(" "))

    def _merge_detail(self, notice: RawJobNotice, detail: dict[str, Any]) -> RawJobNotice:
        return self._copy_notice(
            notice,
            description=self._description(detail) or notice.description,
            skill_tags=self._string_list(detail.get("skill_tags")) or notice.skill_tags,
            job_category=(
                self._string_list(detail.get("category_tags"))
                or self._company_industry(detail)
                or notice.job_category
            ),
            career_level=self._career_level(detail) or notice.career_level,
            location=self._location(detail) or notice.location,
            salary=self._reward(detail) or notice.salary,
            deadline=self._first(detail, "due_time", "deadline", "end_time") or notice.deadline,
            company_logo_url=self._company_logo_url(detail) or notice.company_logo_url,
        )

    def _iter_jobs(self, payload: dict[str, Any]) -> Iterable[dict[str, Any]]:
        candidates = payload.get("data")
        if isinstance(candidates, dict):
            for key in ("jobs", "positions", "items"):
                nested = candidates.get(key)
                if isinstance(nested, list):
                    candidates = nested
                    break
        if not isinstance(candidates, list):
            return []
        return [item for item in candidates if isinstance(item, dict)]

    def _to_raw_notice(self, item: dict[str, Any]) -> RawJobNotice | None:
        job_id = self._first(item, "id", "job_id", "position_id")
        title = self._first(item, "position", "title", "name")
        company = self._company_name(item)

        if job_id is None or title is None:
            return None

        return RawJobNotice(
            original_url=f"{self._BASE_URL}/wd/{job_id}",
            title=title,
            company_name=company,
            company_logo_url=self._company_logo_url(item),
            description=self._first(item, "intro", "description"),
            skill_tags=self._string_list(item.get("skills") or item.get("skill_tags") or item.get("tags")),
            job_type=self._first(item, "job_type"),
            company_size=self._first(item, "company_size"),
            job_category=self._company_industry(item)
            or self._string_list(item.get("category_tags") or item.get("job_category") or item.get("categories")),
            career_level=self._career_level(item) or self._first(item, "career", "career_level"),
            location=self._location(item),
            salary=self._reward(item) or self._first(item, "salary"),
            deadline=self._first(item, "due_time", "deadline", "end_time"),
        )

    @staticmethod
    def _company_name(item: dict[str, Any]) -> str | None:
        company = item.get("company")
        if isinstance(company, dict):
            value = company.get("name") or company.get("title")
            return str(value) if value is not None else None
        value = item.get("company_name") or item.get("companyName")
        return str(value) if value is not None else None

    @staticmethod
    def _company_logo_url(item: dict[str, Any]) -> str | None:
        company = item.get("company")
        if not isinstance(company, dict):
            return None
        for key in ("logo_img", "logo_url", "logoUrl", "image_url", "imageUrl", "image"):
            value = company.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return None

    @staticmethod
    def _location(item: dict[str, Any]) -> str | None:
        address = item.get("address")
        if isinstance(address, dict):
            full_location = address.get("full_location")
            if full_location:
                return str(full_location)
            values = [
                address.get("country"),
                address.get("location"),
                address.get("district"),
            ]
            text = " ".join(str(value) for value in values if value)
            return text or None
        value = item.get("location") or item.get("address")
        return str(value) if value is not None else None

    @staticmethod
    def _description(item: dict[str, Any]) -> str | None:
        detail = item.get("detail")
        if isinstance(detail, str):
            return detail
        if isinstance(detail, dict):
            sections = [
                ("intro", "소개"),
                ("main_tasks", "주요업무"),
                ("requirements", "자격요건"),
                ("preferred_points", "우대사항"),
                ("benefits", "혜택 및 복지"),
            ]
            values = [
                f"[{label}]\n{value}"
                for key, label in sections
                if (value := detail.get(key))
            ]
            return "\n\n".join(str(value) for value in values) or None
        return None

    @staticmethod
    def _company_industry(item: dict[str, Any]) -> list[str] | None:
        company = item.get("company")
        if not isinstance(company, dict):
            return None
        industry_name = company.get("industry_name")
        return [str(industry_name)] if industry_name else None

    @staticmethod
    def _career_level(item: dict[str, Any]) -> str | None:
        experience_from_years = item.get("annual_from")
        experience_to_years = item.get("annual_to")
        if experience_from_years is None and experience_to_years is None:
            return None
        if experience_from_years is not None and experience_to_years is not None:
            return f"{experience_from_years}~{experience_to_years}"
        if experience_from_years is not None:
            return f"{experience_from_years}+"
        return f"~{experience_to_years}"

    @staticmethod
    def _reward(item: dict[str, Any]) -> str | None:
        reward = item.get("reward")
        if isinstance(reward, dict):
            value = reward.get("formatted_total") or reward.get("total")
            return str(value) if value is not None else None
        return str(reward) if reward is not None else None

    @staticmethod
    def _copy_notice(
        notice: RawJobNotice,
        *,
        description: str | None = None,
        skill_tags: list[str] | None = None,
        job_category: list[str] | None = None,
        career_level: str | None = None,
        location: str | None = None,
        salary: str | None = None,
        deadline: str | None = None,
        company_logo_url: str | None = None,
    ) -> RawJobNotice:
        return RawJobNotice(
            original_url=notice.original_url,
            title=notice.title,
            company_name=notice.company_name,
            company_logo_url=company_logo_url if company_logo_url is not None else notice.company_logo_url,
            description=description if description is not None else notice.description,
            skill_tags=skill_tags if skill_tags is not None else notice.skill_tags,
            job_type=notice.job_type,
            company_size=notice.company_size,
            job_category=job_category if job_category is not None else notice.job_category,
            career_level=career_level if career_level is not None else notice.career_level,
            location=location if location is not None else notice.location,
            salary=salary if salary is not None else notice.salary,
            deadline=deadline if deadline is not None else notice.deadline,
        )

    @staticmethod
    def _first(item: dict[str, Any], *keys: str) -> str | None:
        for key in keys:
            value = item.get(key)
            if value is None or value == "":
                continue
            if isinstance(value, (dict, list)):
                continue
            return str(value)
        return None

    @staticmethod
    def _string_list(value: Any) -> list[str] | None:
        if value is None:
            return None
        if isinstance(value, list):
            items: list[str] = []
            for item in value:
                if isinstance(item, dict):
                    text = item.get("title") or item.get("name") or item.get("label")
                else:
                    text = item
                if text:
                    items.append(str(text))
            return items or None
        return [str(value)]

    @staticmethod
    def _clean_text(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = " ".join(value.split())
        return normalized or None

    def _delay(self) -> None:
        if self._request_delay_seconds > 0:
            sleep(self._request_delay_seconds)
