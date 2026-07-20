import json
import re
import xml.etree.ElementTree as ET
from contextlib import nullcontext
from dataclasses import replace
from time import sleep
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from admin.scraping.adapter.scraper_adapter import RawJobNotice, ScraperAdapter, ScrapingDetailMetrics, get_with_retry
from admin.scraping.exception import ScrapingErrorCode, ScrapingException


class GroupByScraper(ScraperAdapter):
    _BASE_URL = "https://groupby.kr"
    _DEFAULT_HEADERS = {
        "User-Agent": "CareerWaveScraper/1.0 (+https://github.com/ixxveon/career-wave)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    }
    _SITEMAP_PATHS = ("/sitemap.xml", "/server-sitemap.xml")
    _JOB_PATH_MARKERS = (
        "/career",
        "/careers",
        "/recruit",
        "/recruits",
        "/job",
        "/jobs",
        "/position",
        "/positions",
        "/hiring",
    )
    _NON_JOB_PATH_MARKERS = (
        "/blog",
        "/news",
        "/privacy",
        "/terms",
        "/faq",
        "/about",
        "/contact",
        "/login",
        "/signup",
    )

    def __init__(
        self,
        *,
        client: httpx.Client | None = None,
        timeout_seconds: float = 10.0,
        max_items: int = 20,
        request_delay_seconds: float = 0.1,
        max_detail_retries: int = 1,
        retry_backoff_seconds: float = 0.2,
    ) -> None:
        self._client = client
        self._timeout_seconds = timeout_seconds
        self._max_items = max_items
        self._request_delay_seconds = request_delay_seconds
        self._max_detail_retries = max_detail_retries
        self._retry_backoff_seconds = retry_backoff_seconds
        self._detail_metrics = ScrapingDetailMetrics()

    @property
    def source_name(self) -> str:
        return "groupby"

    @property
    def display_name(self) -> str:
        return "GroupBy"

    def scrape(self) -> list[RawJobNotice]:
        self._detail_metrics = ScrapingDetailMetrics()
        with self._client_context() as client:
            notices: list[RawJobNotice] = []
            for notice_url in self._collect_notice_urls(client):
                notice = self._fetch_notice(client, notice_url)
                self._record_detail_outcome(succeeded=notice is not None)
                if notice is None:
                    continue
                notices.append(notice)
                if len(notices) >= self._max_items:
                    break
                self._delay()
            return notices

    @property
    def detail_metrics(self) -> ScrapingDetailMetrics:
        return self._detail_metrics

    def test_connection(self) -> bool:
        try:
            with self._client_context() as client:
                for sitemap_path in self._SITEMAP_PATHS:
                    response = client.get(urljoin(self._BASE_URL, sitemap_path))
                    if response.is_success:
                        return True
        except httpx.HTTPError:
            return False
        return False

    def _client_context(self):
        if self._client is not None:
            return nullcontext(self._client)
        return httpx.Client(
            headers=self._DEFAULT_HEADERS,
            timeout=self._timeout_seconds,
            follow_redirects=True,
        )

    def _collect_notice_urls(self, client: httpx.Client) -> list[str]:
        queue = [urljoin(self._BASE_URL, path) for path in self._SITEMAP_PATHS]
        visited: set[str] = set()
        seen_notice_urls: set[str] = set()
        notice_urls: list[str] = []
        successful_sitemap_count = 0

        while queue and len(notice_urls) < self._max_items:
            sitemap_url = queue.pop(0)
            if sitemap_url in visited:
                continue
            visited.add(sitemap_url)

            response, _ = get_with_retry(
                client,
                sitemap_url,
                timeout_seconds=self._timeout_seconds,
                max_retries=self._max_detail_retries,
                retry_backoff_seconds=self._retry_backoff_seconds,
            )
            if response is None:
                continue
            successful_sitemap_count += 1

            try:
                locations = self._extract_sitemap_locations(response.text)
            except ET.ParseError:
                raise ScrapingException(
                    error_code=ScrapingErrorCode.SCRAPING_EXECUTION_FAILED,
                    message="GroupBy sitemap parsing failed.",
                    detail={"sourceName": self.source_name, "failureStage": "LIST"},
                )
            for loc in locations:
                if not self._is_same_host(loc):
                    continue
                if loc.endswith(".xml"):
                    if loc not in visited:
                        queue.append(loc)
                    continue
                if not self._looks_like_job_url(loc):
                    continue
                if loc in seen_notice_urls:
                    continue
                seen_notice_urls.add(loc)
                notice_urls.append(loc)
                if len(notice_urls) >= self._max_items:
                    break
        if successful_sitemap_count == 0:
            raise ScrapingException(
                error_code=ScrapingErrorCode.SCRAPING_EXECUTION_FAILED,
                message="GroupBy sitemap request failed.",
                detail={"sourceName": self.source_name, "failureStage": "LIST"},
            )
        return notice_urls

    @staticmethod
    def _extract_sitemap_locations(xml_text: str) -> list[str]:
        root = ET.fromstring(xml_text)
        if root.tag.rsplit("}", 1)[-1] not in {"urlset", "sitemapindex"}:
            raise ET.ParseError("Unexpected sitemap root element.")

        locations: list[str] = []
        for element in root.iter():
            if element.tag.rsplit("}", 1)[-1] != "loc":
                continue
            text = GroupByScraper._clean_text(element.text)
            if text:
                locations.append(text)
        return locations

    def _fetch_notice(self, client: httpx.Client, notice_url: str) -> RawJobNotice | None:
        response, metrics = get_with_retry(
            client,
            notice_url,
            timeout_seconds=self._timeout_seconds,
            max_retries=self._max_detail_retries,
            retry_backoff_seconds=self._retry_backoff_seconds,
        )
        self._detail_metrics = replace(
            self._detail_metrics,
            timeout_count=self._detail_metrics.timeout_count + metrics.timeout_count,
            retry_count=self._detail_metrics.retry_count + metrics.retry_count,
        )
        if response is None:
            return None

        soup = BeautifulSoup(response.text, "html.parser")
        job_posting = self._extract_job_posting_schema(soup)

        title = self._clean_text(
            self._schema_text(job_posting, "title")
            or self._meta_content(soup, "property", "og:title")
            or self._selector_text(soup, "h1")
            or (self._clean_text(soup.title.get_text(" ")) if soup.title else None)
        )
        if title is None:
            return None

        return RawJobNotice(
            original_url=notice_url,
            title=title,
            company_name=self._extract_company_name(job_posting, soup),
            company_logo_url=self._extract_company_logo_url(job_posting, soup),
            description=self._extract_description(job_posting, soup),
            skill_tags=self._extract_skill_tags(job_posting, soup),
            job_type=(
                self._schema_text(job_posting, "employmentType")
                or self._find_labeled_value(soup, ("employment type", "job type", "type"))
            ),
            company_size=self._extract_company_size(job_posting, soup),
            job_category=self._extract_job_category(job_posting, soup),
            career_level=self._find_labeled_value(soup, ("experience", "career")),
            location=self._extract_location(job_posting, soup),
            salary=self._find_labeled_value(soup, ("salary", "compensation", "pay")),
            deadline=(
                self._schema_text(job_posting, "validThrough")
                or self._find_labeled_value(soup, ("deadline", "due date", "closing date"))
            ),
        )

    def _record_detail_outcome(self, *, succeeded: bool) -> None:
        self._detail_metrics = replace(
            self._detail_metrics,
            attempted_count=self._detail_metrics.attempted_count + 1,
            succeeded_count=self._detail_metrics.succeeded_count + int(succeeded),
            failed_count=self._detail_metrics.failed_count + int(not succeeded),
        )

    @staticmethod
    def _extract_job_posting_schema(soup: BeautifulSoup) -> dict[str, object] | None:
        for script in soup.select("script[type='application/ld+json']"):
            raw_text = script.string or script.get_text()
            if not raw_text or not raw_text.strip():
                continue
            for item in GroupByScraper._load_json_ld_candidates(raw_text):
                if GroupByScraper._is_job_posting_schema(item):
                    return item
        return None

    @staticmethod
    def _load_json_ld_candidates(raw_text: str) -> list[dict[str, object]]:
        try:
            payload = json.loads(raw_text)
        except ValueError:
            return []

        if isinstance(payload, dict):
            graph = payload.get("@graph")
            if isinstance(graph, list):
                return [item for item in graph if isinstance(item, dict)]
            return [payload]
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]
        return []

    @staticmethod
    def _is_job_posting_schema(item: dict[str, object]) -> bool:
        type_value = item.get("@type")
        if isinstance(type_value, list):
            return any(str(value).lower() == "jobposting" for value in type_value)
        return str(type_value).lower() == "jobposting"

    @staticmethod
    def _schema_text(item: dict[str, object] | None, key: str) -> str | None:
        if not isinstance(item, dict):
            return None
        value = item.get(key)
        if isinstance(value, dict):
            for nested_key in ("name", "value", "@value", "text"):
                nested_value = value.get(nested_key)
                if nested_value is not None:
                    return str(nested_value)
            return None
        if isinstance(value, list):
            items = [GroupByScraper._clean_text(str(entry)) for entry in value]
            normalized = [entry for entry in items if entry]
            return ", ".join(normalized) if normalized else None
        if value is None:
            return None
        return str(value)

    def _extract_company_name(self, job_posting: dict[str, object] | None, soup: BeautifulSoup) -> str | None:
        if isinstance(job_posting, dict):
            hiring_organization = job_posting.get("hiringOrganization")
            if isinstance(hiring_organization, dict):
                company_name = hiring_organization.get("name")
                if company_name:
                    return self._clean_text(str(company_name))
        for selector in (
            "[data-testid='company-name']",
            ".company-name",
            ".company",
            ".organization",
        ):
            text = self._selector_text(soup, selector)
            if text:
                return text
        return self._meta_content(soup, "property", "og:site_name")

    def _extract_company_logo_url(self, job_posting: dict[str, object] | None, soup: BeautifulSoup) -> str | None:
        if isinstance(job_posting, dict):
            hiring_organization = job_posting.get("hiringOrganization")
            if isinstance(hiring_organization, dict):
                logo = hiring_organization.get("logo")
                if isinstance(logo, dict):
                    logo = logo.get("url") or logo.get("contentUrl")
                if isinstance(logo, str) and logo.strip():
                    return urljoin(self._BASE_URL, logo.strip())

        for selector in ("[data-testid='company-logo'] img", ".company-logo img", ".organization-logo img"):
            image = soup.select_one(selector)
            if image is None:
                continue
            value = image.get("data-src") or image.get("src")
            if isinstance(value, str) and value.strip():
                return urljoin(self._BASE_URL, value.strip())
        return None

    def _extract_company_size(self, job_posting: dict[str, object] | None, soup: BeautifulSoup) -> str | None:
        if isinstance(job_posting, dict):
            hiring_organization = job_posting.get("hiringOrganization")
            if isinstance(hiring_organization, dict):
                for key in ("companySize", "size", "employmentSize"):
                    value = self._schema_text(hiring_organization, key)
                    if value:
                        return value
        return self._find_labeled_value(
            soup,
            ("company size", "organization size", "\uae30\uc5c5 \uaddc\ubaa8", "\ud68c\uc0ac \uaddc\ubaa8"),
        )

    def _extract_description(self, job_posting: dict[str, object] | None, soup: BeautifulSoup) -> str | None:
        description = self._schema_text(job_posting, "description")
        if description:
            return self._clean_text(self._strip_html(description))

        description = self._meta_content(soup, "name", "description")
        if description:
            return self._clean_text(description)

        for selector in (
            "[data-testid='job-description']",
            ".job-description",
            ".description",
            "main article",
            "article",
            "main",
        ):
            text = self._selector_text(soup, selector)
            if text and len(text) >= 20:
                return text
        return None

    def _extract_location(self, job_posting: dict[str, object] | None, soup: BeautifulSoup) -> str | None:
        if isinstance(job_posting, dict):
            job_location = job_posting.get("jobLocation")
            if isinstance(job_location, list):
                values = [self._location_text(item) for item in job_location]
                normalized = [value for value in values if value]
                if normalized:
                    return ", ".join(normalized)

            location = self._location_text(job_location)
            if location:
                return location

        return self._find_labeled_value(soup, ("location", "work location", "office"))

    def _extract_skill_tags(self, job_posting: dict[str, object] | None, soup: BeautifulSoup) -> list[str] | None:
        if isinstance(job_posting, dict):
            skills = job_posting.get("skills")
            if isinstance(skills, str):
                tags = self._split_tags(skills)
                if tags:
                    return tags
            if isinstance(skills, list):
                tags = [self._clean_text(str(item)) for item in skills]
                normalized = [tag for tag in tags if tag]
                if normalized:
                    return normalized

        keywords = self._meta_content(soup, "name", "keywords")
        if keywords:
            return self._split_tags(keywords)
        return None

    def _extract_job_category(self, job_posting: dict[str, object] | None, soup: BeautifulSoup) -> list[str] | None:
        occupational_category = self._schema_text(job_posting, "occupationalCategory")
        if occupational_category:
            tags = self._split_tags(occupational_category)
            if tags:
                return tags

        labeled = self._find_labeled_value(soup, ("job category", "category", "role"))
        if labeled:
            return self._split_tags(labeled)
        return None

    @classmethod
    def _location_text(cls, value: object) -> str | None:
        if not isinstance(value, dict):
            return None

        address = value.get("address")
        if isinstance(address, dict):
            parts = [
                cls._clean_text(str(address.get("addressLocality"))) if address.get("addressLocality") else None,
                cls._clean_text(str(address.get("addressRegion"))) if address.get("addressRegion") else None,
                cls._clean_text(str(address.get("streetAddress"))) if address.get("streetAddress") else None,
                cls._clean_text(str(address.get("addressCountry"))) if address.get("addressCountry") else None,
            ]
            normalized = [part for part in parts if part]
            if normalized:
                return " ".join(normalized)

        name = value.get("name")
        return cls._clean_text(str(name)) if name else None

    @classmethod
    def _looks_like_job_url(cls, url: str) -> bool:
        parsed = urlparse(url)
        path = parsed.path.lower()
        if not path or path == "/":
            return False
        if any(marker in path for marker in cls._NON_JOB_PATH_MARKERS):
            return False
        if any(marker in path for marker in cls._JOB_PATH_MARKERS):
            return True
        return bool(
            parsed.query
            and any(marker.strip("/") in parsed.query.lower() for marker in cls._JOB_PATH_MARKERS)
        )

    @staticmethod
    def _is_same_host(url: str) -> bool:
        return urlparse(url).netloc in {"groupby.kr", "www.groupby.kr"}

    @staticmethod
    def _meta_content(soup: BeautifulSoup, attr_name: str, attr_value: str) -> str | None:
        element = soup.find("meta", attrs={attr_name: attr_value})
        if element is None:
            return None
        content = element.get("content")
        return GroupByScraper._clean_text(str(content)) if content else None

    @staticmethod
    def _selector_text(soup: BeautifulSoup, selector: str) -> str | None:
        element = soup.select_one(selector)
        if element is None:
            return None
        return GroupByScraper._clean_text(element.get_text(" "))

    @classmethod
    def _find_labeled_value(cls, soup: BeautifulSoup, labels: tuple[str, ...]) -> str | None:
        normalized_labels = tuple(label.casefold() for label in labels)
        for text in soup.stripped_strings:
            lowered = text.casefold()
            for label in normalized_labels:
                if label not in lowered:
                    continue
                if ":" in text:
                    _, value = text.split(":", 1)
                    cleaned = cls._clean_text(value)
                    if cleaned:
                        return cleaned
                match = re.search(rf"{re.escape(label)}\s*[:\-]?\s*(.+)", lowered, re.IGNORECASE)
                if match:
                    original = text[match.start(1):]
                    cleaned = cls._clean_text(original)
                    if cleaned and cleaned.casefold() != text.casefold():
                        return cleaned
        return None

    @staticmethod
    def _split_tags(value: str) -> list[str] | None:
        parts = [GroupByScraper._clean_text(part) for part in re.split(r"[,/|#\n]+", value)]
        normalized = [part for part in parts if part]
        return normalized or None

    @staticmethod
    def _strip_html(value: str) -> str:
        if "<" not in value:
            return value
        return BeautifulSoup(value, "html.parser").get_text(" ")

    @staticmethod
    def _clean_text(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = " ".join(value.split())
        return normalized or None

    def _delay(self) -> None:
        if self._request_delay_seconds > 0:
            sleep(self._request_delay_seconds)
