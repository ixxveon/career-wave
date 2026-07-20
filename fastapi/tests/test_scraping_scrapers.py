import pytest
import httpx

from admin.scraping.adapter import GroupByScraper, JumpitScraper, SaraminScraper, WantedScraper
from admin.scraping.exception import ScrapingErrorCode, ScrapingException


def test_groupby_scraper_maps_sitemap_and_job_posting_html_to_raw_job_notices():
    sitemap_index_xml = """
    <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <sitemap>
        <loc>https://groupby.kr/server-sitemap.xml</loc>
      </sitemap>
    </sitemapindex>
    """
    urlset_xml = """
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://groupby.kr/careers/backend-engineer</loc></url>
      <url><loc>https://groupby.kr/blog/hello</loc></url>
    </urlset>
    """
    job_html = """
    <html>
      <head>
        <meta name="keywords" content="Python, FastAPI, Backend" />
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "JobPosting",
          "title": "Backend Engineer",
          "description": "<p>Build reliable admin scraping pipelines.</p>",
          "validThrough": "2026-12-31",
          "employmentType": "FULL_TIME",
          "occupationalCategory": "Backend, Platform",
          "skills": "Python, FastAPI",
          "jobLocation": {
            "@type": "Place",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Seoul",
              "addressRegion": "Gangnam"
            }
          },
          "hiringOrganization": {
            "@type": "Organization",
            "name": "Career Wave",
            "logo": "https://cdn.example.com/groupby-logo.png",
            "companySize": "STARTUP"
          }
        }
        </script>
      </head>
      <body>
        <main>
          <h1>Backend Engineer</h1>
        </main>
      </body>
    </html>
    """

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/sitemap.xml":
            return httpx.Response(200, text=sitemap_index_xml)
        if request.url.path == "/server-sitemap.xml":
            return httpx.Response(200, text=urlset_xml)
        if request.url.path == "/careers/backend-engineer":
            return httpx.Response(200, text=job_html)
        return httpx.Response(404)

    client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url="https://groupby.kr",
    )
    scraper = GroupByScraper(client=client, request_delay_seconds=0)

    notices = scraper.scrape()

    assert len(notices) == 1
    assert notices[0].original_url == "https://groupby.kr/careers/backend-engineer"
    assert notices[0].title == "Backend Engineer"
    assert notices[0].company_name == "Career Wave"
    assert notices[0].company_logo_url == "https://cdn.example.com/groupby-logo.png"
    assert notices[0].company_size == "STARTUP"
    assert notices[0].description == "Build reliable admin scraping pipelines."
    assert notices[0].skill_tags == ["Python", "FastAPI"]
    assert notices[0].job_type == "FULL_TIME"
    assert notices[0].job_category == ["Backend", "Platform"]
    assert notices[0].location == "Seoul Gangnam"
    assert notices[0].deadline == "2026-12-31"


def test_groupby_scraper_falls_back_to_meta_and_html_content_when_schema_missing():
    urlset_xml = """
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://groupby.kr/jobs/frontend-engineer</loc></url>
    </urlset>
    """
    html = """
    <html>
      <head>
        <meta property="og:title" content="Frontend Engineer" />
        <meta name="description" content="Build web interfaces." />
      </head>
      <body>
        <div>Location: Seoul</div>
        <div>Deadline: 2026-11-30</div>
        <article>Build web interfaces.</article>
      </body>
    </html>
    """

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path in ("/sitemap.xml", "/server-sitemap.xml"):
            return httpx.Response(200, text=urlset_xml)
        if request.url.path == "/jobs/frontend-engineer":
            return httpx.Response(200, text=html)
        return httpx.Response(404)

    client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url="https://groupby.kr",
    )
    scraper = GroupByScraper(client=client, request_delay_seconds=0)

    notices = scraper.scrape()

    assert len(notices) == 1
    assert notices[0].title == "Frontend Engineer"
    assert notices[0].description == "Build web interfaces."
    assert notices[0].location == "Seoul"
    assert notices[0].deadline == "2026-11-30"


def test_groupby_scraper_test_connection_returns_false_on_request_error():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("timeout", request=request)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    scraper = GroupByScraper(client=client)

    assert scraper.test_connection() is False


def test_groupby_scraper_raises_for_invalid_sitemap_response_format():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="<html>not a sitemap</html>")

    client = httpx.Client(transport=httpx.MockTransport(handler), base_url="https://groupby.kr")
    scraper = GroupByScraper(client=client, request_delay_seconds=0)

    with pytest.raises(ScrapingException) as exc_info:
        scraper.scrape()

    assert exc_info.value.error_code == ScrapingErrorCode.SCRAPING_EXECUTION_FAILED
    assert exc_info.value.detail["failureStage"] == "LIST"


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
                            "company": {"name": "Career Wave", "logo_url": "https://cdn.example.com/wanted-logo.png"},
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
    assert notices[0].company_logo_url == "https://cdn.example.com/wanted-logo.png"
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


def test_wanted_scraper_raises_for_invalid_list_payload():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="<html>not json</html>")

    client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url="https://www.wanted.co.kr",
    )
    scraper = WantedScraper(client=client, request_delay_seconds=0)

    with pytest.raises(ScrapingException) as exc_info:
        scraper.scrape()

    assert exc_info.value.error_code == ScrapingErrorCode.SCRAPING_EXECUTION_FAILED
    assert exc_info.value.detail["failureStage"] == "LIST"


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


def test_wanted_scraper_retries_timeout_before_detail_request_succeeds():
    detail_request_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal detail_request_count
        if request.url.path == "/api/v4/jobs":
            return httpx.Response(
                200,
                json={"data": [{"id": 123, "position": "Backend Engineer", "company": {"name": "Career Wave"}}]},
            )
        if request.url.path == "/api/v4/jobs/123":
            detail_request_count += 1
            if detail_request_count == 1:
                raise httpx.ReadTimeout("timeout", request=request)
            return httpx.Response(200, json={"job": {"detail": "Detailed job description."}})
        return httpx.Response(404)

    client = httpx.Client(transport=httpx.MockTransport(handler), base_url="https://www.wanted.co.kr")
    scraper = WantedScraper(
        client=client,
        request_delay_seconds=0,
        retry_backoff_seconds=0,
    )

    notices = scraper.scrape()

    assert notices[0].description == "Detailed job description."
    assert scraper.detail_metrics.attempted_count == 1
    assert scraper.detail_metrics.succeeded_count == 1
    assert scraper.detail_metrics.timeout_count == 1
    assert scraper.detail_metrics.retry_count == 1


@pytest.mark.parametrize("failure", ["connect_error", "read_error", 429, 500])
def test_wanted_scraper_retries_transient_detail_failures(failure: str | int):
    detail_request_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal detail_request_count
        if request.url.path == "/api/v4/jobs":
            return httpx.Response(
                200,
                json={"data": [{"id": 123, "position": "Backend Engineer", "company": {"name": "Career Wave"}}]},
            )
        if request.url.path == "/api/v4/jobs/123":
            detail_request_count += 1
            if detail_request_count == 1:
                if failure == "connect_error":
                    raise httpx.ConnectError("connection failed", request=request)
                if failure == "read_error":
                    raise httpx.ReadError("connection reset", request=request)
                return httpx.Response(failure)
            return httpx.Response(200, json={"job": {"detail": "Detailed job description."}})
        return httpx.Response(404)

    client = httpx.Client(transport=httpx.MockTransport(handler), base_url="https://www.wanted.co.kr")
    scraper = WantedScraper(
        client=client,
        request_delay_seconds=0,
        retry_backoff_seconds=0,
    )

    notices = scraper.scrape()

    assert notices[0].description == "Detailed job description."
    assert detail_request_count == 2
    assert scraper.detail_metrics.retry_count == 1


def test_wanted_scraper_records_failed_detail_metrics_when_api_and_fallback_timeout():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/v4/jobs":
            return httpx.Response(
                200,
                json={"data": [{"id": 123, "position": "Backend Engineer", "company": {"name": "Career Wave"}}]},
            )
        raise httpx.ReadTimeout("timeout", request=request)

    client = httpx.Client(transport=httpx.MockTransport(handler), base_url="https://www.wanted.co.kr")
    scraper = WantedScraper(
        client=client,
        request_delay_seconds=0,
        retry_backoff_seconds=0,
    )

    notices = scraper.scrape()

    assert notices == []
    assert scraper.detail_metrics.attempted_count == 1
    assert scraper.detail_metrics.succeeded_count == 0
    assert scraper.detail_metrics.failed_count == 1
    assert scraper.detail_metrics.timeout_count == 4
    assert scraper.detail_metrics.retry_count == 2


def test_saramin_scraper_maps_search_html_to_raw_job_notices():
    search_html = """
    <html>
      <div class="item_recruit">
        <div class="corp_logo"><img src="//cdn.example.com/saramin-logo.png" /></div>
        <div class="corp_detail">\uc911\uc18c\uae30\uc5c5</div>
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
    ajax_detail_html = """
    <html>
      <div class="wrap_jv_cont">
        <section class="jv_cont">Develop user job notice features.</section>
      </div>
    </html>
    """
    shell_html = "<html><div id='content'>로그인 회원가입 메뉴 홈 채용정보 포지션 제안 TOP</div></html>"

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/zf_user/search/get-recruit-list":
            return httpx.Response(200, json={"count": "1", "innerHTML": search_html})
        if request.url.path == "/zf_user/jobs/relay/view-ajax":
            assert request.url.params["rec_idx"] == "456"
            return httpx.Response(200, text=ajax_detail_html)
        if request.url.path == "/zf_user/jobs/relay/view":
            return httpx.Response(200, text=shell_html)
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
    assert notices[0].company_logo_url == "https://cdn.example.com/saramin-logo.png"
    assert notices[0].company_size == "\uc911\uc18c\uae30\uc5c5"
    assert notices[0].description == "Develop user job notice features."
    assert notices[0].skill_tags == ["Python", "Django"]
    assert notices[0].job_type == "정규직"
    assert notices[0].career_level == "경력 3년 이상"
    assert notices[0].location == "서울 강남구"
    assert notices[0].salary == "면접후 결정"
    assert notices[0].deadline == "2026.12.31"


def test_saramin_scraper_does_not_store_shell_content_when_ajax_detail_missing():
    search_html = """
    <html>
      <div class="item_recruit">
        <div class="corp_name"><a>Career Wave</a></div>
        <h2 class="job_tit">
          <a href="/zf_user/jobs/relay/view?rec_idx=789">Python Backend</a>
        </h2>
      </div>
    </html>
    """
    shell_html = "<html><div id='content'>로그인 회원가입 메뉴 홈 채용정보 포지션 제안 TOP</div></html>"

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/zf_user/search/get-recruit-list":
            return httpx.Response(200, json={"count": "1", "innerHTML": search_html})
        if request.url.path == "/zf_user/jobs/relay/view-ajax":
            return httpx.Response(404)
        if request.url.path == "/zf_user/jobs/relay/view":
            return httpx.Response(200, text=shell_html)
        return httpx.Response(404)

    client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url="https://www.saramin.co.kr",
    )
    scraper = SaraminScraper(client=client, request_delay_seconds=0)

    notices = scraper.scrape()

    assert notices == []
    assert scraper.detail_metrics.attempted_count == 1
    assert scraper.detail_metrics.failed_count == 1


def test_saramin_scraper_does_not_store_long_shell_content():
    shell_content = " ".join(SaraminScraper._SHELL_CONTENT_MARKERS) + " " + ("menu " * 80)

    assert SaraminScraper._is_valid_description(shell_content) is False


def test_saramin_scraper_test_connection_returns_false_for_forbidden_response():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(403)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    scraper = SaraminScraper(client=client)

    assert scraper.test_connection() is False


def test_saramin_scraper_raises_for_invalid_list_json_payload():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="<html>not json</html>")

    client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url="https://www.saramin.co.kr",
    )
    scraper = SaraminScraper(client=client, request_delay_seconds=0)

    with pytest.raises(ScrapingException) as exc_info:
        scraper.scrape()

    assert exc_info.value.error_code == ScrapingErrorCode.SCRAPING_EXECUTION_FAILED
    assert exc_info.value.detail["failureStage"] == "LIST"


def test_jumpit_scraper_maps_positions_api_and_detail_api_to_raw_job_notices():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/positions":
            return httpx.Response(
                200,
                json={"result": {"positions": [{"id": 54365723}, {"id": 54397427}]}},
            )
        if request.url.path == "/api/position/54365723":
            return httpx.Response(
                200,
                json={
                    "result": {
                        "id": 54365723,
                        "title": "Backend Platform Engineer",
                        "companyName": "Career Wave",
                        "companyLogoUrl": "https://cdn.example.com/jumpit-logo.png",
                        "techStacks": [{"stack": "Python"}, {"stack": "FastAPI"}, {"stack": "Python"}],
                        "serviceInfo": "Build internal platforms.",
                        "responsibility": "Operate scraping services.",
                        "qualifications": "3+ years backend experience.",
                        "preferredRequirements": "Search infra experience.",
                        "welfares": "Lunch support.",
                        "recruitProcess": "Document -> Interview",
                        "newcomer": False,
                        "minCareer": 3,
                        "maxCareer": 8,
                        "closedAt": "2026-12-31 23:59:59",
                        "location": "Seoul Gangnam",
                        "jobCategories": [{"id": 1, "name": "Backend"}],
                        "tags": [{"id": "com_131", "name": "스타트업"}],
                    }
                },
            )
        if request.url.path == "/api/position/54397427":
            return httpx.Response(
                200,
                json={
                    "result": {
                        "id": 54397427,
                        "title": "Frontend Engineer",
                        "companyName": "Career Wave 2",
                    }
                },
            )
        return httpx.Response(404)

    client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url="https://jumpit.saramin.co.kr",
    )
    scraper = JumpitScraper(client=client, request_delay_seconds=0)

    notices = scraper.scrape()

    assert len(notices) == 2
    assert notices[0].original_url == "https://jumpit.saramin.co.kr/position/54365723"
    assert notices[0].title == "Backend Platform Engineer"
    assert notices[0].company_name == "Career Wave"
    assert notices[0].company_logo_url == "https://cdn.example.com/jumpit-logo.png"
    assert "[service]\nBuild internal platforms." in notices[0].description
    assert "[responsibility]\nOperate scraping services." in notices[0].description
    assert notices[0].skill_tags == ["Python", "FastAPI"]
    assert notices[0].company_size == "스타트업"
    assert notices[0].job_category == ["Backend"]
    assert notices[0].career_level == "3~8"
    assert notices[0].location == "Seoul Gangnam"
    assert notices[0].deadline == "2026-12-31 23:59:59"
    assert notices[1].title == "Frontend Engineer"


def test_jumpit_scraper_uses_html_fallback_when_detail_api_fails():
    html = """
    <html>
      <head>
        <meta property="og:title" content="Jumpit Platform Engineer" />
        <meta name="description" content="Fallback detail description." />
      </head>
      <body><h1>Jumpit Platform Engineer</h1></body>
    </html>
    """

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/positions":
            return httpx.Response(200, json={"result": {"positions": [{"id": 54365723}]}})
        if request.url.path == "/api/position/54365723":
            return httpx.Response(500)
        if request.url.path == "/position/54365723":
            return httpx.Response(200, text=html)
        return httpx.Response(404)

    client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url="https://jumpit.saramin.co.kr",
    )
    scraper = JumpitScraper(client=client, request_delay_seconds=0)

    notices = scraper.scrape()

    assert len(notices) == 1
    assert notices[0].title == "Jumpit Platform Engineer"
    assert notices[0].description == "[service]\nFallback detail description."


def test_jumpit_scraper_delays_between_positions_after_failed_detail(monkeypatch):
    request_paths: list[str] = []
    delays: list[float] = []

    def handler(request: httpx.Request) -> httpx.Response:
        request_paths.append(request.url.path)
        if request.url.path == "/api/positions":
            return httpx.Response(200, json={"result": {"positions": [{"id": 111}, {"id": 222}]}})
        if request.url.path == "/api/position/111":
            return httpx.Response(500)
        if request.url.path == "/position/111":
            return httpx.Response(404)
        if request.url.path == "/api/position/222":
            return httpx.Response(200, json={"result": {"id": 222, "title": "Second", "companyName": "Career Wave"}})
        return httpx.Response(404)

    monkeypatch.setattr("admin.scraping.adapter.jumpit_scraper.sleep", delays.append)
    client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url="https://jumpit.saramin.co.kr",
    )
    scraper = JumpitScraper(client=client, request_delay_seconds=0.1)

    notices = scraper.scrape()

    assert len(notices) == 1
    assert notices[0].title == "Second"
    assert delays == [0.1]
    assert request_paths.index("/api/position/222") > request_paths.index("/position/111")


def test_jumpit_scraper_raises_for_invalid_positions_payload():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="<html>not xml</html>")

    client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url="https://jumpit.saramin.co.kr",
    )
    scraper = JumpitScraper(client=client, request_delay_seconds=0)

    with pytest.raises(ScrapingException) as exc_info:
        scraper.scrape()

    assert exc_info.value.error_code == ScrapingErrorCode.SCRAPING_EXECUTION_FAILED
    assert exc_info.value.detail["failureStage"] == "LIST"


def test_jumpit_scraper_test_connection_returns_false_on_request_error():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("timeout", request=request)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    scraper = JumpitScraper(client=client)

    assert scraper.test_connection() is False
