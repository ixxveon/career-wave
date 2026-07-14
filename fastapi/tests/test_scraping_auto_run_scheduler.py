import asyncio

from admin.scraping.scheduler import ScrapingAutoRunScheduler
from admin.scraping.schema import ScrapingActionType


def test_auto_run_scheduler_dispatches_claimed_sources_as_run_tasks():
    scheduled: list[tuple[str, ScrapingActionType]] = []
    scheduler = ScrapingAutoRunScheduler(
        claim_due_pipelines=lambda: ["wanted", "saramin"],
        schedule_task=lambda source_name, action_type: scheduled.append((source_name, action_type)),
    )

    dispatched_count = asyncio.run(scheduler.run_due_pipelines())

    assert dispatched_count == 2
    assert scheduled == [
        ("wanted", ScrapingActionType.RUN),
        ("saramin", ScrapingActionType.RUN),
    ]


def test_auto_run_scheduler_skips_task_dispatch_when_nothing_is_due():
    scheduled: list[tuple[str, ScrapingActionType]] = []
    scheduler = ScrapingAutoRunScheduler(
        claim_due_pipelines=lambda: [],
        schedule_task=lambda source_name, action_type: scheduled.append((source_name, action_type)),
    )

    dispatched_count = asyncio.run(scheduler.run_due_pipelines())

    assert dispatched_count == 0
    assert scheduled == []
