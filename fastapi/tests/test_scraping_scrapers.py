import httpx

from admin.scraping.adapter import SaraminScraper, WantedScraper


def test_wanted_scraper_maps_api_jobs_to_raw_job_notices():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/v4/jobs":
            return httpx.Response(
                200,
                json={
                    "data": [
                        {
                            "id": 123,
                            "position": "Backend Engineer",
                            "company": {"name": "Career Wave"},
                            "address": {"country": "Korea", "location": "Seoul"},
                            "skills": [{"title": "Python"}, {"title": "FastAPI"}],
                            "category_tags": [{"title": "Server"}],
                            "annual_from": 3,
                            "reward": 1000000,
                            "due_time": "2026-12-31",
                        }
                    ]
                },
            )
        if request.url.path == "/api/v4/jobs/123":
            return httpx.Response(
                200,
                json={
                    "job": {
                        "detail": {
                            "intro": "Career Wave intro.",
                            "main_tasks": "Build scraping pipelines.",
                            "requirements": "Python experience.",
                        },
                        "skill_tags": [{"title": "Python"}, {"title": "FastAPI"}],
                        "company": {"industry_name": "IT"},
                        "address": {"full_location": "Seoul Gangnam"},
                        "reward": {"formatted_total": "100만원"},
                        "annual_from": 3,
                        "annual_to": 7,
                        "due_time": "2026-12-31",
                    }
                },
            )
        return httpx.Response(404)

    client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url="https://www.wanted.co.kr",
    )
    scraper = WantedScraper(client=client, request_delay_seconds=0)

    notices = scraper.scrape()

    assert len(notices) == 1
    assert notices[0].original_url == "https://www.wanted.co.kr/wd/123"
    assert notices[0].title == "Backend Engineer"
    assert notices[0].company_name == "Career Wave"
    assert "[소개]\nCareer Wave intro." in notices[0].description
    assert "[주요업무]\nBuild scraping pipelines." in notices[0].description
    assert "[자격요건]\nPython experience." in notices[0].description
    assert notices[0].skill_tags == ["Python", "FastAPI"]
    assert notices[0].job_category == ["IT"]
    assert notices[0].career_level == "3~7"
    assert notices[0].location == "Seoul Gangnam"
    assert notices[0].salary == "100만원"
    assert notices[0].deadline == "2026-12-31"


def test_wanted_scraper_test_connection_returns_false_on_request_error():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("timeout", request=request)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    scraper = WantedScraper(client=client)

    assert scraper.test_connection() is False


def test_wanted_scraper_keeps_html_fallback_after_sparse_detail_payload():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/v4/jobs":
            return httpx.Response(
                200,
                json={"data": [{"id": 123, "position": "Backend Engineer", "company": {"name": "Career Wave"}}]},
            )
        if request.url.path == "/api/v4/jobs/123":
            return httpx.Response(200, json={"job": {"skill_tags": [{"title": "Python"}]}})
        if request.url.path == "/wd/123":
            return httpx.Response(200, text="<html><section>Fallback description.</section></html>")
        return httpx.Response(404)

    client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url="https://www.wanted.co.kr",
    )
    scraper = WantedScraper(client=client, request_delay_seconds=0)

    notices = scraper.scrape()

    assert len(notices) == 1
    assert notices[0].description == "Fallback description."
    assert notices[0].skill_tags == ["Python"]


def test_wanted_scraper_returns_empty_list_for_invalid_list_payload():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="<html>not json</html>")

    client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url="https://www.wanted.co.kr",
    )
    scraper = WantedScraper(client=client, request_delay_seconds=0)

    assert scraper.scrape() == []


def test_wanted_scraper_maps_list_based_skill_tags_without_detail_payload():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/v4/jobs":
            return httpx.Response(
                200,
                json={
                    "data": [
                        {
                            "id": 123,
                            "position": "Backend Engineer",
                            "company": {"name": "Career Wave"},
                            "intro": "List description.",
                            "skills": [{"title": "Python"}, {"title": "FastAPI"}],
                        }
                    ]
                },
            )
        if request.url.path == "/api/v4/jobs/123":
            return httpx.Response(404)
        return httpx.Response(404)

    client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url="https://www.wanted.co.kr",
    )
    scraper = WantedScraper(client=client, request_delay_seconds=0)

    notices = scraper.scrape()

    assert len(notices) == 1
    assert notices[0].skill_tags == ["Python", "FastAPI"]


def test_saramin_scraper_maps_search_html_to_raw_job_notices():
    search_html = """
    <html>
      <div class="item_recruit">
        <div class="corp_name"><a>Career Wave</a></div>
        <h2 class="job_tit">
          <a href="/zf_user/jobs/relay/view?rec_idx=456">Python Backend</a>
        </h2>
        <div class="job_condition">
          <span>서울 강남구</span>
          <span>경력 3년 이상</span>
          <span>정규직</span>
          <span>면접후 결정</span>
        </div>
        <div class="job_sector">
          <a>Python</a>
          <a>Django</a>
        </div>
        <div class="job_date"><span class="date">2026.12.31</span></div>
      </div>
    </html>
    """
    detail_html = "<html><div class='user_content'>Develop user job notice features.</div></html>"

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/zf_user/search/get-recruit-list":
            return httpx.Response(200, json={"count": "1", "innerHTML": search_html})
        if request.url.path == "/zf_user/jobs/relay/view":
            return httpx.Response(200, text=detail_html)
        return httpx.Response(404)

    client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url="https://www.saramin.co.kr",
    )
    scraper = SaraminScraper(client=client, request_delay_seconds=0)

    notices = scraper.scrape()

    assert len(notices) == 1
    assert notices[0].original_url == "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=456"
    assert notices[0].title == "Python Backend"
    assert notices[0].company_name == "Career Wave"
    assert notices[0].description == "Develop user job notice features."
    assert notices[0].skill_tags == ["Python", "Django"]
    assert notices[0].job_type == "정규직"
    assert notices[0].career_level == "경력 3년 이상"
    assert notices[0].location == "서울 강남구"
    assert notices[0].salary == "면접후 결정"
    assert notices[0].deadline == "2026.12.31"


def test_saramin_scraper_test_connection_returns_false_for_forbidden_response():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(403)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    scraper = SaraminScraper(client=client)

    assert scraper.test_connection() is False


def test_saramin_scraper_returns_empty_list_for_invalid_json_payload():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="<html>not json</html>")

    client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url="https://www.saramin.co.kr",
    )
    scraper = SaraminScraper(client=client, request_delay_seconds=0)

    assert scraper.scrape() == []
