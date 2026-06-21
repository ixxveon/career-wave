from admin.scraping.adapter.scraper_adapter import RawJobNotice, ScraperAdapter


class WantedScraper(ScraperAdapter):
    @property
    def source_name(self) -> str:
        return "wanted"

    @property
    def display_name(self) -> str:
        return "원티드"

    def scrape(self) -> list[RawJobNotice]:
        raise NotImplementedError("Wanted scraper implementation will be added in a later phase.")

    def test_connection(self) -> bool:
        raise NotImplementedError("Wanted scraper test flow will be added in a later phase.")
