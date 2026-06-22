from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class RawJobNotice:
    original_url: str
    title: str
    company_name: str | None = None
    description: str | None = None
    skill_tags: list[str] | None = None
    job_type: str | None = None
    company_size: str | None = None
    job_category: list[str] | None = None
    career_level: str | None = None
    location: str | None = None
    salary: str | None = None
    deadline: str | None = None


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

    @abstractmethod
    def test_connection(self) -> bool:
        raise NotImplementedError
