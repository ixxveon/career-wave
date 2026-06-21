from admin.scraping.adapter import RawJobNotice, ScraperAdapter, require_source_registry_entry
from admin.scraping.exception import ScrapingErrorCode, ScrapingException
from admin.scraping.schema import ScrapingActionType


class PipelineRunnerService:
    def __init__(self, scrapers: list[ScraperAdapter]) -> None:
        self._scrapers = {scraper.source_name: scraper for scraper in scrapers}

    def run(self, source_name: str) -> list[RawJobNotice]:
        scraper = self._require_scraper(source_name)
        return scraper.scrape()

    def retry(self, source_name: str) -> list[RawJobNotice]:
        return self.run(source_name)

    def test(self, source_name: str) -> bool:
        scraper = self._require_scraper(source_name)
        return scraper.test_connection()

    def dispatch(self, *, action_type: ScrapingActionType, source_name: str) -> object:
        if action_type == ScrapingActionType.RUN:
            return self.run(source_name)
        if action_type == ScrapingActionType.RETRY:
            return self.retry(source_name)
        if action_type == ScrapingActionType.TEST:
            return self.test(source_name)
        raise NotImplementedError("Unsupported scraping action type.")

    def _require_scraper(self, source_name: str) -> ScraperAdapter:
        entry = require_source_registry_entry(source_name)
        scraper = self._scrapers.get(entry.source_name)
        if scraper is None:
            raise ScrapingException(
                error_code=ScrapingErrorCode.FASTAPI_INTERNAL_ERROR,
                message="Scraping scraper adapter resolution failed.",
                detail={"sourceName": source_name},
            )
        return scraper
