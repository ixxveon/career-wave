from datetime import datetime, timezone

import pytest

from admin.scraping.exception import ScrapingErrorCode, ScrapingException
from admin.scraping.repository import ScrapingPipelineRecord
from admin.scraping.schema import (
    PipelineActionRequest,
    PipelineBatchActionRequest,
    ScrapingActionType,
)
from admin.scraping.service import ActionService, BatchActionAggregation, BatchActionService


def _pipeline_record(*, source_name: str = "wanted", pipeline_status: str = "IDLE") -> ScrapingPipelineRecord:
    now = datetime.now(timezone.utc)
    return ScrapingPipelineRecord(
        scraping_pipeline_id=1,
        source_name=source_name,
        display_name=source_name.title(),
        pipeline_status=pipeline_status,
        is_enabled=True,
        last_started_at=None,
        last_success_at=None,
        last_failed_at=None,
        last_duration_ms=None,
        last_total_count=None,
        last_error_message=None,
        created_at=now,
        updated_at=now,
    )


class _DummyPipelineRepository:
    def __init__(self, pipelines: dict[str, ScrapingPipelineRecord]) -> None:
        self._pipelines = pipelines

    def find_by_source_name(self, source_name: str) -> ScrapingPipelineRecord | None:
        return self._pipelines.get(source_name)


def test_action_service_accepts_run_request_for_idle_pipeline():
    service = ActionService(
        _DummyPipelineRepository({"wanted": _pipeline_record(source_name="wanted", pipeline_status="IDLE")})
    )

    result = service.request_action(
        source_name="wanted",
        action_type=ScrapingActionType.RUN,
        request=PipelineActionRequest(requestedBy="admin-service"),
    )

    assert result.source_name == "wanted"
    assert result.pipeline_status == "IDLE"


def test_action_service_rejects_retry_when_pipeline_status_is_not_success_or_failed():
    service = ActionService(
        _DummyPipelineRepository({"wanted": _pipeline_record(source_name="wanted", pipeline_status="IDLE")})
    )

    with pytest.raises(ScrapingException) as exc_info:
        service.request_action(
            source_name="wanted",
            action_type=ScrapingActionType.RETRY,
            request=PipelineActionRequest(requestedBy="admin-service"),
        )

    assert exc_info.value.error_code == ScrapingErrorCode.SCRAPING_INVALID_REQUEST
    assert exc_info.value.detail == {
        "field": "pipelineStatus",
        "sourceName": "wanted",
        "pipelineStatus": "IDLE",
    }


def test_action_service_accepts_test_request_for_failed_pipeline():
    service = ActionService(
        _DummyPipelineRepository({"saramin": _pipeline_record(source_name="saramin", pipeline_status="FAILED")})
    )

    result = service.request_action(
        source_name="saramin",
        action_type=ScrapingActionType.TEST,
        request=PipelineActionRequest(requestedBy="admin-service"),
    )

    assert result.source_name == "saramin"
    assert result.pipeline_status == "FAILED"


def test_action_service_rejects_request_for_running_pipeline():
    service = ActionService(
        _DummyPipelineRepository({"wanted": _pipeline_record(source_name="wanted", pipeline_status="RUNNING")})
    )

    with pytest.raises(ScrapingException) as exc_info:
        service.request_action(
            source_name="wanted",
            action_type=ScrapingActionType.RUN,
            request=PipelineActionRequest(requestedBy="admin-service"),
        )

    assert exc_info.value.error_code == ScrapingErrorCode.SCRAPING_ALREADY_RUNNING
    assert exc_info.value.detail == {
        "sourceName": "wanted",
        "pipelineStatus": "RUNNING",
    }


@pytest.mark.parametrize("action_type", [ScrapingActionType.RETRY, ScrapingActionType.TEST])
def test_action_service_rejects_retry_and_test_for_running_pipeline(action_type: ScrapingActionType):
    service = ActionService(
        _DummyPipelineRepository({"wanted": _pipeline_record(source_name="wanted", pipeline_status="RUNNING")})
    )

    with pytest.raises(ScrapingException) as exc_info:
        service.request_action(
            source_name="wanted",
            action_type=action_type,
            request=PipelineActionRequest(requestedBy="admin-service"),
        )

    assert exc_info.value.error_code == ScrapingErrorCode.SCRAPING_ALREADY_RUNNING
    assert exc_info.value.detail == {
        "sourceName": "wanted",
        "pipelineStatus": "RUNNING",
    }


def test_batch_action_service_validates_source_names_and_rejects_duplicates():
    action_service = ActionService(
        _DummyPipelineRepository({"wanted": _pipeline_record(source_name="wanted", pipeline_status="SUCCESS")})
    )
    service = BatchActionService(action_service)

    request = PipelineBatchActionRequest(
        actionType=ScrapingActionType.RETRY,
        sourceNames=["wanted", "wanted"],
        requestedBy="admin-service",
    )

    with pytest.raises(ScrapingException) as exc_info:
        service.validate_source_names(request)

    assert exc_info.value.error_code == ScrapingErrorCode.SCRAPING_INVALID_REQUEST
    assert exc_info.value.detail == {
        "field": "sourceNames",
        "index": 1,
        "sourceName": "wanted",
    }


def test_batch_action_service_aggregates_accept_and_reject_results():
    action_service = ActionService(
        _DummyPipelineRepository(
            {
                "wanted": _pipeline_record(source_name="wanted", pipeline_status="SUCCESS"),
                "saramin": _pipeline_record(source_name="saramin", pipeline_status="RUNNING"),
            }
        )
    )
    service = BatchActionService(action_service)

    aggregation = service.aggregate_results(
        action_type=ScrapingActionType.RETRY,
        source_names=["wanted", "saramin"],
        requested_by="admin-service",
    )

    assert aggregation == BatchActionAggregation(
        requested_count=2,
        accepted_count=1,
        results=[
            service.aggregate_results(
                action_type=ScrapingActionType.RETRY,
                source_names=["wanted"],
                requested_by="admin-service",
            ).results[0],
            service.aggregate_results(
                action_type=ScrapingActionType.RETRY,
                source_names=["saramin"],
                requested_by="admin-service",
            ).results[0],
        ],
    )
    assert aggregation.results[0].source_name == "wanted"
    assert aggregation.results[0].accepted is True
    assert aggregation.results[0].pipeline_status == "SUCCESS"
    assert aggregation.results[1].source_name == "saramin"
    assert aggregation.results[1].accepted is False
    assert aggregation.results[1].pipeline_status == "RUNNING"


def test_batch_action_service_maps_batch_response_contract():
    action_service = ActionService(
        _DummyPipelineRepository({"wanted": _pipeline_record(source_name="wanted", pipeline_status="SUCCESS")})
    )
    service = BatchActionService(action_service)

    response = service.to_response(
        action_type=ScrapingActionType.RUN,
        aggregation=BatchActionAggregation(
            requested_count=2,
            accepted_count=1,
            results=[
                service.aggregate_results(
                    action_type=ScrapingActionType.RUN,
                    source_names=["wanted"],
                    requested_by="admin-service",
                ).results[0],
                service.aggregate_results(
                    action_type=ScrapingActionType.RUN,
                    source_names=["wanted"],
                    requested_by="admin-service",
                ).results[0],
            ],
        ),
    )

    payload = response.model_dump(mode="json", by_alias=True)
    assert payload["actionType"] == "RUN"
    assert payload["requestedCount"] == 2
    assert payload["acceptedCount"] == 1
    assert len(payload["results"]) == 2
    assert {"sourceName", "accepted", "pipelineStatus"} == set(payload["results"][0].keys())
    assert "requestedAt" in payload


def test_batch_action_service_marks_running_pipeline_as_rejected_result():
    action_service = ActionService(
        _DummyPipelineRepository({"wanted": _pipeline_record(source_name="wanted", pipeline_status="RUNNING")})
    )
    service = BatchActionService(action_service)

    aggregation = service.aggregate_results(
        action_type=ScrapingActionType.TEST,
        source_names=["wanted"],
        requested_by="admin-service",
    )

    assert aggregation.requested_count == 1
    assert aggregation.accepted_count == 0
    assert aggregation.results[0].source_name == "wanted"
    assert aggregation.results[0].accepted is False
    assert aggregation.results[0].pipeline_status == "RUNNING"
