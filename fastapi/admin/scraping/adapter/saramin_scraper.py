from admin.scraping.adapter.scraper_adapter import RawJobNotice, ScraperAdapter


class SaraminScraper(ScraperAdapter):
    @property
    def source_name(self) -> str:
        return "saramin"

    @property
    def display_name(self) -> str:
        return "사람인"

    def scrape(self) -> list[RawJobNotice]:
        raise NotImplementedError("Saramin scraper implementation will be added in a later phase.")

    def test_connection(self) -> bool:
        raise NotImplementedError("Saramin scraper test flow will be added in a later phase.")
