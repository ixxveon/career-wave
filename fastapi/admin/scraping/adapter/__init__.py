from admin.scraping.adapter.jumpit_scraper import JumpitScraper
from admin.scraping.adapter.scraper_adapter import RawJobNotice, ScraperAdapter
from admin.scraping.adapter.saramin_scraper import SaraminScraper
from admin.scraping.adapter.source_registry import (
    SUPPORTED_SOURCE_REGISTRY,
    SourceRegistryEntry,
    get_source_registry_entry,
    is_supported_source,
    require_source_registry_entry,
)
from admin.scraping.adapter.wanted_scraper import WantedScraper

__all__ = [
    "JumpitScraper",
    "RawJobNotice",
    "SaraminScraper",
    "ScraperAdapter",
    "SUPPORTED_SOURCE_REGISTRY",
    "SourceRegistryEntry",
    "WantedScraper",
    "get_source_registry_entry",
    "is_supported_source",
    "require_source_registry_entry",
]
