import asyncio

import pytest
import pytest_asyncio

from admin.scraping.schema import ScrapingActionType
from admin.scraping.task.scraping_task import ScrapingTaskResult
from admin.scraping.task import dispatcher


@pytest_asyncio.fixture
async def clean_scraping_tasks():
    await dispatcher.cancel_pending_scraping_tasks()
    yield
    await dispatcher.cancel_pending_scraping_tasks()


def _result() -> ScrapingTaskResult:
    return ScrapingTaskResult(
        source_name="wanted",
        action_type=ScrapingActionType.RUN,
        pipeline_status="SUCCESS",
        total_count=1,
        duration_ms=10,
    )


@pytest.mark.asyncio
async def test_schedule_scraping_task_tracks_task_until_completion(monkeypatch, clean_scraping_tasks):
    started = asyncio.Event()
    release = asyncio.Event()

    async def run_task(source_name: str, action_type: ScrapingActionType) -> ScrapingTaskResult:
        started.set()
        await release.wait()
        return _result()

    monkeypatch.setattr(dispatcher, "_run_scraping_task", run_task)

    dispatcher.schedule_scraping_task("wanted", ScrapingActionType.RUN)
    await started.wait()

    tasks = dispatcher.get_pending_scraping_tasks()
    assert len(tasks) == 1
    assert tasks[0].get_name() == "scraping:run:wanted"

    release.set()
    assert await dispatcher.wait_for_pending_scraping_tasks(timeout=0.1) == ()
    await asyncio.sleep(0)
    assert dispatcher.get_pending_scraping_tasks() == ()


@pytest.mark.asyncio
async def test_wait_for_pending_scraping_tasks_returns_unfinished_tasks(monkeypatch, clean_scraping_tasks):
    release = asyncio.Event()

    async def run_task(source_name: str, action_type: ScrapingActionType) -> ScrapingTaskResult:
        await release.wait()
        return _result()

    monkeypatch.setattr(dispatcher, "_run_scraping_task", run_task)

    dispatcher.schedule_scraping_task("wanted", ScrapingActionType.RUN)

    pending = await dispatcher.wait_for_pending_scraping_tasks(timeout=0)

    assert len(pending) == 1
    assert pending[0].get_name() == "scraping:run:wanted"


@pytest.mark.asyncio
async def test_cancel_pending_scraping_tasks_cleans_up_test_tasks(monkeypatch, clean_scraping_tasks):
    started = asyncio.Event()

    async def run_task(source_name: str, action_type: ScrapingActionType) -> ScrapingTaskResult:
        started.set()
        await asyncio.Event().wait()
        return _result()

    monkeypatch.setattr(dispatcher, "_run_scraping_task", run_task)

    dispatcher.schedule_scraping_task("wanted", ScrapingActionType.RUN)
    await started.wait()
    await dispatcher.cancel_pending_scraping_tasks()

    assert dispatcher.get_pending_scraping_tasks() == ()
