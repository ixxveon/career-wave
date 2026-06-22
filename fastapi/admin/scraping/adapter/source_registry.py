from dataclasses import dataclass

from admin.scraping.exception import ScrapingErrorCode, ScrapingException


@dataclass(frozen=True)
class SourceRegistryEntry:
    source_name: str
    display_name: str
    adapter_name: str


SUPPORTED_SOURCE_REGISTRY: dict[str, SourceRegistryEntry] = {
    "wanted": SourceRegistryEntry(
        source_name="wanted",
        display_name="Wanted",
        adapter_name="wanted_scraper",
    ),
    "saramin": SourceRegistryEntry(
        source_name="saramin",
        display_name="Saramin",
        adapter_name="saramin_scraper",
    ),
}


def is_supported_source(source_name: str) -> bool:
    return source_name in SUPPORTED_SOURCE_REGISTRY


def get_source_registry_entry(source_name: str) -> SourceRegistryEntry | None:
    return SUPPORTED_SOURCE_REGISTRY.get(source_name)


def require_source_registry_entry(source_name: str) -> SourceRegistryEntry:
    entry = get_source_registry_entry(source_name)
    if entry is None:
        raise ScrapingException(
            error_code=ScrapingErrorCode.SCRAPING_SOURCE_NOT_FOUND,
            detail={"sourceName": source_name},
        )
    return entry
