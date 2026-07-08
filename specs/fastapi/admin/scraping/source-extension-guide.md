# Admin Scraping Source Extension Guide

This guide defines the minimum steps for adding a new job-board source after the
Wanted/Saramin scraping pipeline is in place.

## Scope

Use this guide when adding sources such as `jobkorea`, `jumpit`, or
`programmers`.

A new source is complete only when these surfaces are updated together:

- FastAPI source registry
- Scraper adapter implementation and exports
- Pipeline runner registration
- Job notice normalization
- `scraping_pipelines` seed or migration
- Unit tests and contract checks

## Naming Contract

Use one stable lowercase source key everywhere.

Example:

```text
source_name: jobkorea
display_name: JobKorea
adapter_name: jobkorea_scraper
adapter file: fastapi/admin/scraping/adapter/jobkorea_scraper.py
adapter class: JobKoreaScraper
pipeline seed source_name: jobkorea
job_notices.source: jobkorea
```

Rules:

- `source_name` must be lowercase and stable. Do not change it after data is saved.
- `adapter_name` must match the adapter module name and end with `_scraper`.
- `display_name` is user-facing and should be short.
- The same `source_name` must be used in registry, scraper, pipeline seed, logs,
  and saved job notices.

## Registry

Update `fastapi/admin/scraping/adapter/source_registry.py`.

```python
SUPPORTED_SOURCE_REGISTRY["jobkorea"] = SourceRegistryEntry(
    source_name="jobkorea",
    display_name="JobKorea",
    adapter_name="jobkorea_scraper",
)
```

Keep registry entries in sync with `scraping_pipelines` seed data. If a source
exists in one place but not the other, action requests can be accepted by one
layer and fail in another.

## Adapter

Create a file under `fastapi/admin/scraping/adapter/`.

Each adapter must implement `ScraperAdapter`:

- `source_name`
- `display_name`
- `scrape() -> list[RawJobNotice]`
- `test_connection() -> bool`

Recommended adapter constructor:

```python
def __init__(
    self,
    *,
    client: httpx.Client | None = None,
    timeout_seconds: float = 10.0,
    max_items: int = 20,
    request_delay_seconds: float = 0.1,
) -> None:
    ...
```

Implementation requirements:

- Use `httpx.Client` injection so tests can use `httpx.MockTransport`.
- Set a clear timeout and bounded `max_items`.
- Respect robots.txt, site terms, and request-rate limits before enabling.
- Return `RawJobNotice` with at least `original_url` and `title`.
- Prefer stable JSON APIs when available. If parsing HTML, keep selectors small
  and covered by tests.
- `test_connection()` should return `False` on request/parsing errors and should
  not save notices.

## Exports And Runner Registration

Update `fastapi/admin/scraping/adapter/__init__.py`:

- import the new adapter class
- add it to `__all__`

After the background runner wiring is merged, update the runner registration
where `PipelineRunnerService` is instantiated:

```python
PipelineRunnerService(
    [
        WantedScraper(),
        SaraminScraper(),
        JobKoreaScraper(),
    ]
)
```

The registry and runner list must contain the same enabled sources.

## Normalizer

Update `fastapi/admin/scraping/service/job_notice_normalizer.py`.

If the default normalizer is enough, no source-specific method is required. Add a
source-specific method only when the source has unique field semantics.

Example:

```python
def normalize(self, *, source_name: str, raw_notice: RawJobNotice) -> NormalizedJobNotice:
    if source_name == "jobkorea":
        return self._normalize_jobkorea(raw_notice)
```

All saved enum-like fields must remain compatible with the Spring user job
notice enums:

- `job_type`: `FULLTIME`, `INTERN`, `CONTRACT`
- `company_size`: `STARTUP`, `SME`, `MID_MARKET`, `LARGE`
- `career_level`: `JUNIOR`, `SENIOR`, `ANY`
- `notice_status`: `ACTIVE`, `CLOSED`

Unknown values must use the project fallback policy instead of saving raw site
strings.

## Pipeline Seed Or Migration

Add a row to the database seed or migration for `scraping_pipelines`.

Required values:

```text
source_name = <source key>
display_name = <display name>
pipeline_status = IDLE
is_enabled = true
last_started_at = null
last_success_at = null
last_failed_at = null
last_duration_ms = null
last_total_count = null
last_error_message = null
```

The seed must be idempotent. Do not create duplicate rows when the seed runs
more than once.

## Test Checklist

Add or update tests for each new source:

- Source registry contains the new source.
- Registry naming rules still pass.
- Unknown source still raises `SCRAPING_SOURCE_NOT_FOUND`.
- Adapter maps sample site response to `RawJobNotice`.
- Adapter `test_connection()` returns `True` for success and `False` for request
  failure.
- Normalizer output is Spring enum compatible.
- Pipeline runner can dispatch the new source.
- Pipeline seed contains the same source key as the registry.
- TEST action does not save `job_notices`.

Use `httpx.MockTransport` for adapter tests. Do not depend on live external
sites in unit tests.

## Pull Request Checklist

Before opening a PR for a new source:

- [ ] Registry entry added.
- [ ] Adapter file and class added.
- [ ] Adapter exported from `adapter/__init__.py`.
- [ ] Runner registration updated.
- [ ] Normalizer coverage checked.
- [ ] Pipeline seed or migration added.
- [ ] Tests added or updated.
- [ ] robots.txt, terms, and request-rate limits reviewed.
- [ ] Local compile/test results recorded in the PR body.
