from contextlib import nullcontext
from time import sleep
from urllib.parse import parse_qs, urljoin, urlparse

import httpx
from bs4 import BeautifulSoup
from bs4.element import Tag

from admin.scraping.adapter.scraper_adapter import RawJobNotice, ScraperAdapter


class SaraminScraper(ScraperAdapter):
    _BASE_URL = "https://www.saramin.co.kr"
    _LIST_API_URL = f"{_BASE_URL}/zf_user/search/get-recruit-list"
    _DETAIL_AJAX_PATH = "/zf_user/jobs/relay/view-ajax"
    _SHELL_CONTENT_MARKERS = (
        "로그인 회원가입 메뉴",
        "홈 채용정보",
        "포지션 제안",
        "TOP",
    )
    _DEFAULT_HEADERS = {
        "User-Agent": "CareerWaveScraper/1.0 (+https://github.com/ixxveon/career-wave)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    }

    def __init__(
        self,
        *,
        client: httpx.Client | None = None,
        timeout_seconds: float = 10.0,
        max_items: int = 20,
        request_delay_seconds: float = 0.1,
        keyword: str = "python",
    ) -> None:
        self._client = client
        self._timeout_seconds = timeout_seconds
        self._max_items = max_items
        self._request_delay_seconds = request_delay_seconds
        self._keyword = keyword

    @property
    def source_name(self) -> str:
        return "saramin"

    @property
    def display_name(self) -> str:
        return "Saramin"

    def scrape(self) -> list[RawJobNotice]:
        with self._client_context() as client:
            response = client.get(
                self._LIST_API_URL,
                params=self._search_params(),
            )
            response.raise_for_status()
            try:
                payload = response.json()
            except ValueError:
                return []
            inner_html = payload.get("innerHTML") if isinstance(payload, dict) else None

            soup = BeautifulSoup(inner_html or "", "html.parser")
            notices: list[RawJobNotice] = []
            for item in soup.select("div.item_recruit, div.item_recruit_list, li.item_recruit"):
                notice = self._to_raw_notice(item)
                if notice is None:
                    continue

                description = self._fetch_description(client, notice.original_url)
                if description:
                    notice = RawJobNotice(
                        original_url=notice.original_url,
                        title=notice.title,
                        company_name=notice.company_name,
                        company_logo_url=notice.company_logo_url,
                        description=description,
                        skill_tags=notice.skill_tags,
                        job_type=notice.job_type,
                        company_size=notice.company_size,
                        job_category=notice.job_category,
                        career_level=notice.career_level,
                        location=notice.location,
                        salary=notice.salary,
                        deadline=notice.deadline,
                    )

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
                    params=self._search_params(page_count=1),
                )
                return response.is_success
        except (httpx.HTTPError, ValueError):
            return False

    def _client_context(self):
        if self._client is not None:
            return nullcontext(self._client)
        return httpx.Client(
            headers=self._DEFAULT_HEADERS,
            timeout=self._timeout_seconds,
            follow_redirects=True,
        )

    def _search_params(self, *, page_count: int | None = None) -> dict[str, str | int]:
        return {
            "searchType": "search",
            "searchword": self._keyword,
            "recruitPage": 1,
            "recruitSort": "relation",
            "recruitPageCount": page_count or self._max_items,
            "mainSearch": "n",
        }

    def _to_raw_notice(self, item: Tag) -> RawJobNotice | None:
        title_link = item.select_one(".job_tit a, a.str_tit, a[href*='/zf_user/jobs/relay/view']")
        title = self._clean_text(title_link.get_text(" ")) if title_link else None
        href = title_link.get("href") if title_link else None
        if not title or not href:
            return None

        conditions = [
            self._clean_text(element.get_text(" "))
            for element in item.select(".job_condition span, .job_meta span")
        ]
        conditions = [condition for condition in conditions if condition]

        sectors = [
            self._clean_text(element.get_text(" "))
            for element in item.select(".job_sector a, .job_sector span, .job_sector em")
        ]
        sectors = [sector for sector in sectors if sector]

        company = self._clean_text(
            self._first_text(item, ".corp_name a", ".corp_name", ".company_nm", ".area_corp strong")
        )
        deadline = self._clean_text(self._first_text(item, ".job_date .date", ".job_date", ".date"))
        salary = self._pick_condition(conditions, ("만원", "연봉", "급여", "면접후"))

        return RawJobNotice(
            original_url=urljoin(self._BASE_URL, str(href)),
            title=title,
            company_name=company,
            company_logo_url=self._extract_company_logo_url(item),
            description=None,
            skill_tags=sectors or None,
            company_size=self._extract_company_size(item, conditions),
            job_type=self._pick_condition(conditions, ("정규직", "계약직", "인턴", "프리랜서")),
            job_category=sectors or None,
            career_level=self._pick_condition(conditions, ("경력", "신입")),
            location=conditions[0] if conditions else None,
            salary=salary,
            deadline=deadline,
        )

    def _extract_company_logo_url(self, item: Tag) -> str | None:
        for selector in (".corp_logo img", ".company_logo img", ".logo img", "img.corp_logo"):
            image = item.select_one(selector)
            if image is None:
                continue
            value = image.get("data-src") or image.get("src")
            if isinstance(value, str) and value.strip():
                return urljoin(self._BASE_URL, value.strip())
        return None

    def _extract_company_size(self, item: Tag, conditions: list[str]) -> str | None:
        candidates = [
            *conditions,
            self._first_text(item, ".corp_info", ".corp_detail", ".corp_name", ".company_nm"),
        ]
        for candidate in candidates:
            normalized = self._clean_text(candidate)
            if normalized is None:
                continue
            if any(marker in normalized for marker in ("\ub300\uae30\uc5c5", "\uc911\uacac", "\uc911\uc18c", "\uc2a4\ud0c0\ud2b8\uc5c5", "\ubca4\ucc98")):
                return normalized
        return None

    def _fetch_description(self, client: httpx.Client, original_url: str) -> str | None:
        rec_idx = self._extract_rec_idx(original_url)
        if rec_idx is not None:
            ajax_description = self._fetch_ajax_description(client, rec_idx)
            if ajax_description:
                return ajax_description

        try:
            response = client.get(original_url)
            response.raise_for_status()
        except httpx.HTTPError:
            return None

        soup = BeautifulSoup(response.text, "html.parser")
        for selector in (
            ".user_content",
            ".cont_recruit",
            ".wrap_jv_cont",
            ".jv_cont",
        ):
            element = soup.select_one(selector)
            text = self._clean_text(element.get_text(" ")) if element else None
            if self._is_valid_description(text):
                return text
        return None

    def _fetch_ajax_description(self, client: httpx.Client, rec_idx: str) -> str | None:
        try:
            response = client.get(
                urljoin(self._BASE_URL, self._DETAIL_AJAX_PATH),
                params={"rec_idx": rec_idx},
            )
            response.raise_for_status()
        except httpx.HTTPError:
            return None

        soup = BeautifulSoup(response.text, "html.parser")
        for selector in (
            ".wrap_jv_cont",
            ".jv_cont",
            ".user_content",
            ".cont_recruit",
            "#jvContainer",
        ):
            element = soup.select_one(selector)
            text = self._clean_text(element.get_text(" ")) if element else None
            if self._is_valid_description(text):
                return text
        return None

    @staticmethod
    def _extract_rec_idx(original_url: str) -> str | None:
        rec_idx_values = parse_qs(urlparse(original_url).query).get("rec_idx")
        if not rec_idx_values:
            return None
        rec_idx = rec_idx_values[0].strip()
        return rec_idx or None

    @classmethod
    def _is_valid_description(cls, value: str | None) -> bool:
        if value is None:
            return False
        shell_marker_count = sum(marker in value for marker in cls._SHELL_CONTENT_MARKERS)
        if shell_marker_count >= 2:
            return False
        return True

    @staticmethod
    def _first_text(item: Tag, *selectors: str) -> str | None:
        for selector in selectors:
            element = item.select_one(selector)
            if element is not None:
                return element.get_text(" ")
        return None

    @staticmethod
    def _pick_condition(conditions: list[str], markers: tuple[str, ...]) -> str | None:
        for condition in conditions:
            if any(marker in condition for marker in markers):
                return condition
        return None

    @staticmethod
    def _clean_text(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = " ".join(value.split())
        return normalized or None

    def _delay(self) -> None:
        if self._request_delay_seconds > 0:
            sleep(self._request_delay_seconds)
