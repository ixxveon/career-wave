from contextlib import nullcontext
from time import sleep
from urllib.parse import urlparse
from xml.etree import ElementTree

import httpx
from bs4 import BeautifulSoup

from admin.scraping.adapter.scraper_adapter import RawJobNotice, ScraperAdapter


class JumpitScraper(ScraperAdapter):
    _BASE_URL = "https://jumpit.saramin.co.kr"
    _POSITION_SITEMAP_URL = f"{_BASE_URL}/sitemap/sitemap_position_view_1.xml"
    _DETAIL_API_PATH = f"{_BASE_URL}/api/position/{{position_id}}"
    _DEFAULT_HEADERS = {
        "User-Agent": "CareerWaveScraper/1.0 (+https://github.com/ixxveon/career-wave)",
        "Accept": "application/json, text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    }
    _XML_NAMESPACE = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

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
        return "jumpit"

    @property
    def display_name(self) -> str:
        return "Jumpit"

    def scrape(self) -> list[RawJobNotice]:
        try:
            with self._client_context() as client:
                position_urls = self._fetch_position_urls(client)
                notices: list[RawJobNotice] = []
                for index, position_url in enumerate(position_urls):
                    detail = self._fetch_position_detail(client, position_url)
                    if detail is None:
                        continue

                    notice = self._to_raw_notice(position_url=position_url, detail=detail)
                    if notice is None:
                        continue

                    notices.append(notice)
                    if len(notices) >= self._max_items:
                        break
                    if index < len(position_urls) - 1:
                        self._delay()
                return notices
        except (httpx.HTTPError, ElementTree.ParseError):
            return []

    def test_connection(self) -> bool:
        try:
            with self._client_context() as client:
                response = client.get(self._POSITION_SITEMAP_URL)
                response.raise_for_status()
                root = ElementTree.fromstring(response.text)
                return bool(root.findall("sm:url/sm:loc", self._XML_NAMESPACE))
        except (httpx.HTTPError, ElementTree.ParseError):
            return False

    def _client_context(self):
        if self._client is not None:
            return nullcontext(self._client)
        return httpx.Client(
            headers=self._DEFAULT_HEADERS,
            timeout=self._timeout_seconds,
            follow_redirects=True,
        )

    def _fetch_position_urls(self, client: httpx.Client) -> list[str]:
        response = client.get(self._POSITION_SITEMAP_URL)
        response.raise_for_status()

        root = ElementTree.fromstring(response.text)
        urls: list[str] = []
        seen: set[str] = set()
        for loc in root.findall("sm:url/sm:loc", self._XML_NAMESPACE):
            position_url = (loc.text or "").strip()
            if not position_url or "/position/" not in position_url:
                continue
            if position_url in seen:
                continue
            seen.add(position_url)
            urls.append(position_url)
        return urls

    def _fetch_position_detail(self, client: httpx.Client, position_url: str) -> dict | None:
        position_id = self._extract_position_id(position_url)
        if position_id is None:
            return None

        try:
            response = client.get(self._DETAIL_API_PATH.format(position_id=position_id))
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError):
            return self._fetch_position_html_fallback(client, position_url)

        result = payload.get("result") if isinstance(payload, dict) else None
        if isinstance(result, dict):
            return result
        return self._fetch_position_html_fallback(client, position_url)

    def _fetch_position_html_fallback(self, client: httpx.Client, position_url: str) -> dict | None:
        try:
            response = client.get(position_url)
            response.raise_for_status()
        except httpx.HTTPError:
            return None

        soup = BeautifulSoup(response.text, "html.parser")
        title = self._clean_text(
            self._meta_content(soup, "property", "og:title")
            or self._meta_content(soup, "name", "twitter:title")
            or (soup.title.get_text(" ") if soup.title else None)
        )
        description = self._clean_text(
            self._meta_content(soup, "property", "og:description")
            or self._meta_content(soup, "name", "description")
        )

        if title is None:
            return None

        return {
            "title": title,
            "companyName": self._clean_text(
                self._meta_content(soup, "property", "og:site_name")
                or self._first_text(soup, "h2", "h1")
            ),
            "serviceInfo": description,
        }

    @classmethod
    def _to_raw_notice(cls, *, position_url: str, detail: dict) -> RawJobNotice | None:
        title = cls._string_value(detail.get("title"))
        if title is None:
            return None

        return RawJobNotice(
            original_url=position_url,
            title=title,
            company_name=cls._string_value(detail.get("companyName")),
            description=cls._build_description(detail),
            skill_tags=cls._extract_tech_stacks(detail.get("techStacks")),
            job_type=None,
            company_size=cls._extract_company_size(detail.get("tags")),
            job_category=cls._extract_job_categories(detail.get("jobCategories")),
            career_level=cls._extract_career_level(detail),
            location=cls._extract_location(detail),
            salary=None,
            deadline=cls._string_value(detail.get("closedAt")),
        )

    @staticmethod
    def _extract_position_id(position_url: str) -> str | None:
        path = urlparse(position_url).path.rstrip("/")
        if not path:
            return None
        position_id = path.split("/")[-1].strip()
        return position_id or None

    @classmethod
    def _build_description(cls, detail: dict) -> str | None:
        sections = [
            ("serviceInfo", "service"),
            ("responsibility", "responsibility"),
            ("qualifications", "qualifications"),
            ("preferredRequirements", "preferred"),
            ("welfares", "welfares"),
            ("recruitProcess", "recruitProcess"),
        ]
        values: list[str] = []
        for key, label in sections:
            value = cls._string_value(detail.get(key))
            if value is None:
                continue
            values.append(f"[{label}]\n{value}")
        return "\n\n".join(values) or None

    @classmethod
    def _extract_tech_stacks(cls, value) -> list[str] | None:
        if not isinstance(value, list):
            return None

        stacks: list[str] = []
        seen: set[str] = set()
        for item in value:
            stack = None
            if isinstance(item, dict):
                stack = cls._string_value(item.get("stack"))
            else:
                stack = cls._string_value(item)

            if stack is None:
                continue
            lowered = stack.casefold()
            if lowered in seen:
                continue
            seen.add(lowered)
            stacks.append(stack)
        return stacks or None

    @classmethod
    def _extract_job_categories(cls, value) -> list[str] | None:
        if not isinstance(value, list):
            return None
        categories = [
            cls._string_value(item.get("name"))
            for item in value
            if isinstance(item, dict)
        ]
        return [category for category in categories if category] or None

    @classmethod
    def _extract_company_size(cls, value) -> str | None:
        if not isinstance(value, list):
            return None

        candidates: list[str] = []
        for item in value:
            if not isinstance(item, dict):
                continue
            name = cls._string_value(item.get("name"))
            if name is None:
                continue

            candidates.append(name)

        for name in candidates:
            if name in {"스타트업", "중소", "중소기업", "중견", "중견기업", "대기업"}:
                return name

        for name in candidates:
            normalized = name.upper().replace(" ", "")
            if "대기업" in name or "LARGE" in normalized:
                return name
            if "중견" in name or "MID" in normalized:
                return name
            if "중소" in name or "SME" in normalized:
                return name
            if "스타트업" in name or "STARTUP" in normalized:
                return name
        return None

    @classmethod
    def _extract_career_level(cls, detail: dict) -> str | None:
        newcomer = detail.get("newcomer")
        min_career = detail.get("minCareer")
        max_career = detail.get("maxCareer")

        if newcomer is True:
            return "신입"

        min_year = cls._int_value(min_career)
        max_year = cls._int_value(max_career)
        if min_year is None and max_year is None:
            return None
        if min_year is not None and max_year is not None:
            if min_year == 0 and max_year == 0:
                return "신입"
            return f"{min_year}~{max_year}"
        if min_year is not None:
            return f"{min_year}+"
        return f"~{max_year}"

    @classmethod
    def _extract_location(cls, detail: dict) -> str | None:
        location = cls._string_value(detail.get("location"))
        if location is not None:
            return location

        working_places = detail.get("workingPlaces")
        if not isinstance(working_places, list):
            return None

        locations = [
            cls._string_value(item.get("address"))
            for item in working_places
            if isinstance(item, dict)
        ]
        return next((value for value in locations if value), None)

    @staticmethod
    def _meta_content(soup: BeautifulSoup, attr_name: str, attr_value: str) -> str | None:
        tag = soup.find("meta", attrs={attr_name: attr_value})
        if tag is None:
            return None
        content = tag.get("content")
        return str(content) if content else None

    @staticmethod
    def _first_text(soup: BeautifulSoup, *selectors: str) -> str | None:
        for selector in selectors:
            element = soup.select_one(selector)
            if element is not None:
                return element.get_text(" ")
        return None

    @staticmethod
    def _string_value(value) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        return text or None

    @staticmethod
    def _int_value(value) -> int | None:
        if value is None or isinstance(value, bool):
            return None
        if isinstance(value, int):
            return value
        try:
            return int(str(value).strip())
        except ValueError:
            return None

    @classmethod
    def _clean_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = " ".join(value.split())
        return normalized or None

    def _delay(self) -> None:
        if self._request_delay_seconds > 0:
            sleep(self._request_delay_seconds)
