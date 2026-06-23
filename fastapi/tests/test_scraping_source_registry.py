import pytest

from admin.scraping.adapter import (
    SUPPORTED_SOURCE_REGISTRY,
    get_source_registry_entry,
    is_supported_source,
    require_source_registry_entry,
)
from admin.scraping.exception import ScrapingErrorCode, ScrapingException


def test_supported_source_registry_contains_only_wanted_and_saramin():
    assert set(SUPPORTED_SOURCE_REGISTRY.keys()) == {"wanted", "saramin"}

    assert SUPPORTED_SOURCE_REGISTRY["wanted"].display_name == "Wanted"
    assert SUPPORTED_SOURCE_REGISTRY["wanted"].adapter_name == "wanted_scraper"

    assert SUPPORTED_SOURCE_REGISTRY["saramin"].display_name == "Saramin"
    assert SUPPORTED_SOURCE_REGISTRY["saramin"].adapter_name == "saramin_scraper"


@pytest.mark.parametrize("source_name", ["wanted", "saramin"])
def test_is_supported_source_returns_true_for_registered_sources(source_name: str):
    assert is_supported_source(source_name) is True


@pytest.mark.parametrize("source_name", ["jobkorea", "jumpit", "", "Wanted"])
def test_is_supported_source_returns_false_for_unregistered_sources(source_name: str):
    assert is_supported_source(source_name) is False


def test_get_source_registry_entry_returns_entry_for_registered_source():
    entry = get_source_registry_entry("wanted")

    assert entry is not None
    assert entry.source_name == "wanted"
    assert entry.display_name == "Wanted"
    assert entry.adapter_name == "wanted_scraper"


def test_get_source_registry_entry_returns_none_for_unregistered_source():
    assert get_source_registry_entry("jobkorea") is None


def test_require_source_registry_entry_returns_registered_entry():
    entry = require_source_registry_entry("saramin")

    assert entry.source_name == "saramin"
    assert entry.display_name == "Saramin"
    assert entry.adapter_name == "saramin_scraper"


def test_require_source_registry_entry_raises_source_not_found_for_unregistered_source():
    with pytest.raises(ScrapingException) as exc_info:
        require_source_registry_entry("jobkorea")

    assert exc_info.value.error_code == ScrapingErrorCode.SCRAPING_SOURCE_NOT_FOUND
    assert exc_info.value.detail == {"sourceName": "jobkorea"}
