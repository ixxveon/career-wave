from abc import ABC, abstractmethod
from dataclasses import dataclass
from time import monotonic, sleep

import httpx


@dataclass(frozen=True)
class RawJobNotice:
    original_url: str
    title: str
    company_name: str | None = None
    company_logo_url: str | None = None
    description: str | None = None
    skill_tags: list[str] | None = None
    job_type: str | None = None
    company_size: str | None = None
    job_category: list[str] | None = None
    career_level: str | None = None
    location: str | None = None
    salary: str | None = None
    deadline: str | None = None


@dataclass(frozen=True)
class ScrapingDetailMetrics:
    attempted_count: int = 0
    succeeded_count: int = 0
    failed_count: int = 0
    timeout_count: int = 0
    retry_count: int = 0


@dataclass(frozen=True)
class ScrapingRequestMetrics:
    timeout_count: int = 0
    retry_count: int = 0


def get_with_retry(
    client: httpx.Client,
    url: str,
    *,
    timeout_seconds: float,
    max_retries: int,
    retry_backoff_seconds: float,
    params: dict[str, object] | None = None,
) -> tuple[httpx.Response | None, ScrapingRequestMetrics]:
    """Execute an external GET request with the shared scraping retry policy."""
    metrics = ScrapingRequestMetrics()
    deadline = monotonic() + timeout_seconds

    for attempt in range(max_retries + 1):
        remaining_seconds = deadline - monotonic()
        if remaining_seconds <= 0:
            return None, metrics

        try:
            response = client.get(url, params=params, timeout=remaining_seconds)
        except httpx.TimeoutException:
            metrics = ScrapingRequestMetrics(
                timeout_count=metrics.timeout_count + 1,
                retry_count=metrics.retry_count,
            )
        except httpx.TransportError:
            response = None
        else:
            if response.status_code != 429 and response.status_code < 500:
                try:
                    response.raise_for_status()
                except httpx.HTTPError:
                    return None, metrics
                return response, metrics

        if attempt >= max_retries or deadline - monotonic() <= 0:
            return None, metrics
        metrics = ScrapingRequestMetrics(
            timeout_count=metrics.timeout_count,
            retry_count=metrics.retry_count + 1,
        )
        sleep(min(retry_backoff_seconds, max(deadline - monotonic(), 0)))

    return None, metrics


class ScraperAdapter(ABC):
    @property
    @abstractmethod
    def source_name(self) -> str:
        raise NotImplementedError

    @property
    @abstractmethod
    def display_name(self) -> str:
        raise NotImplementedError

    @abstractmethod
    def scrape(self) -> list[RawJobNotice]:
        raise NotImplementedError

    @property
    def detail_metrics(self) -> ScrapingDetailMetrics:
        return ScrapingDetailMetrics()

    @abstractmethod
    def test_connection(self) -> bool:
        raise NotImplementedError
