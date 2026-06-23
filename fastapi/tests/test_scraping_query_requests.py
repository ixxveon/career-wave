import pytest
from pydantic import ValidationError

from admin.scraping.exception import ScrapingErrorCode, ScrapingException
from admin.scraping.schema import (
    PipelineListQueryRequest,
    PipelineLogQueryRequest,
    PipelineSummaryQueryRequest,
    ScrapingPipelineStatusType,
    ScrapingStatusType,
)
from admin.scraping.service import PipelineQueryService


class _DummyPipelineRepository:
    def find_pipelines(self, **kwargs):
        return kwargs

    def aggregate_summary(self):
        return {"ok": True}

    def find_by_source_name(self, source_name: str):
        return {"sourceName": source_name}


class _DummyLogRepository:
    def find_logs(self, **kwargs):
        return kwargs


def _create_query_service() -> PipelineQueryService:
    return PipelineQueryService(
        scraping_pipeline_repository=_DummyPipelineRepository(),
        scraping_log_repository=_DummyLogRepository(),
    )


def test_pipeline_list_query_request_matches_get_query_parameter_contract():
    request = PipelineListQueryRequest.model_validate(
        {
            "keyword": "python",
            "status": "RUNNING",
            "page": 1,
            "size": 20,
        }
    )

    assert request.model_dump(by_alias=True) == {
        "keyword": "python",
        "status": "RUNNING",
        "page": 1,
        "size": 20,
    }
    assert request.status == ScrapingPipelineStatusType.RUNNING


def test_pipeline_log_query_request_matches_get_query_parameter_contract():
    request = PipelineLogQueryRequest.model_validate(
        {
            "sourceName": "wanted",
            "status": "FAILED",
            "page": 2,
            "size": 50,
        }
    )

    assert request.model_dump(by_alias=True) == {
        "sourceName": "wanted",
        "status": "FAILED",
        "page": 2,
        "size": 50,
    }
    assert request.source_name == "wanted"
    assert request.status == ScrapingStatusType.FAILED


def test_pipeline_summary_query_request_accepts_empty_query_contract():
    request = PipelineSummaryQueryRequest.model_validate({})

    assert request.model_dump(by_alias=True) == {}


@pytest.mark.parametrize(
    ("payload", "field"),
    [
        ({"page": 0, "size": 20}, "page"),
        ({"page": 1, "size": 0}, "size"),
    ],
)
def test_pipeline_list_query_request_rejects_invalid_pagination(payload: dict, field: str):
    with pytest.raises(ValidationError) as exc_info:
        PipelineListQueryRequest.model_validate(payload)

    assert field in str(exc_info.value)


@pytest.mark.parametrize(
    ("payload", "field"),
    [
        ({"page": 0, "size": 20}, "page"),
        ({"page": 1, "size": 0}, "size"),
    ],
)
def test_pipeline_log_query_request_rejects_invalid_pagination(payload: dict, field: str):
    with pytest.raises(ValidationError) as exc_info:
        PipelineLogQueryRequest.model_validate(payload)

    assert field in str(exc_info.value)


def test_pipeline_query_service_rejects_non_positive_page_for_list_query():
    service = _create_query_service()

    request = PipelineListQueryRequest.model_construct(
        keyword=None,
        status=None,
        page=0,
        size=20,
    )

    with pytest.raises(ScrapingException) as exc_info:
        service.get_pipelines(request)

    assert exc_info.value.error_code == ScrapingErrorCode.SCRAPING_INVALID_REQUEST
    assert exc_info.value.detail == {"field": "page"}


def test_pipeline_query_service_rejects_non_positive_size_for_log_query():
    service = _create_query_service()

    with pytest.raises(ScrapingException) as exc_info:
        service.get_pipeline_logs(
            source_name="wanted",
            status="SUCCESS",
            page=1,
            size=0,
        )

    assert exc_info.value.error_code == ScrapingErrorCode.SCRAPING_INVALID_REQUEST
    assert exc_info.value.detail == {"field": "size"}
