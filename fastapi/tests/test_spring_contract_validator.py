import pytest

from admin.scraping.exception import ScrapingErrorCode
from admin.scraping.integration import SpringContractValidator


def test_validate_error_payload_raises_on_missing_fields():
    validator = SpringContractValidator()

    with pytest.raises(AssertionError, match="missing required fields"):
        validator.validate_error_payload(
            {
                "success": False,
                "errorCode": ScrapingErrorCode.SCRAPING_EXECUTION_FAILED.value,
            }
        )


def test_validate_error_payload_accepts_mappable_error_response():
    validator = SpringContractValidator()

    validator.validate_error_payload(
        {
            "success": False,
            "errorCode": ScrapingErrorCode.SCRAPING_EXECUTION_FAILED.value,
            "message": "Scraping execution failed.",
            "detail": {"sourceName": "wanted"},
        }
    )


def test_validate_all_error_code_mappings_passes_for_registered_codes():
    SpringContractValidator().validate_all_error_code_mappings()


def test_validate_fastapi_internal_error_maps_to_scraping_execution_failed():
    SpringContractValidator().validate_fastapi_internal_error_mapping()


def test_validate_discord_alert_policy_raises_when_alert_is_not_implemented():
    validator = SpringContractValidator()

    with pytest.raises(AssertionError, match="DISCORD_ALERT_SEND_FAILED"):
        validator.validate_discord_alert_policy(
            {
                "errorCode": ScrapingErrorCode.DISCORD_ALERT_SEND_FAILED.value,
            }
        )


def test_validate_pipeline_list_response_checks_required_item_fields():
    validator = SpringContractValidator()

    validator.validate_pipeline_list_response(
        {
            "content": [
                {
                    "scrapingPipelineId": 1,
                    "sourceName": "wanted",
                    "displayName": "Wanted",
                    "pipelineStatus": "SUCCESS",
                    "isEnabled": True,
                    "lastStartedAt": None,
                    "lastSuccessAt": None,
                    "lastFailedAt": None,
                    "lastDurationMs": None,
                    "lastTotalCount": None,
                    "lastErrorMessage": None,
                    "createdAt": "2026-06-22T00:00:00Z",
                    "updatedAt": "2026-06-22T00:00:00Z",
                }
            ],
            "page": 1,
            "size": 20,
            "totalElements": 1,
            "totalPages": 1,
        }
    )


def test_validate_pipeline_list_response_raises_when_item_field_is_missing():
    validator = SpringContractValidator()

    with pytest.raises(AssertionError, match="missing required fields"):
        validator.validate_pipeline_list_response(
            {
                "content": [
                    {
                        "scrapingPipelineId": 1,
                        "sourceName": "wanted",
                    }
                ],
                "page": 1,
                "size": 20,
                "totalElements": 1,
                "totalPages": 1,
            }
        )


def test_validate_pipeline_action_response_uses_spring_run_id_contract():
    validator = SpringContractValidator()

    validator.validate_pipeline_action_response(
        {
            "sourceName": "wanted",
            "accepted": True,
            "runId": "run-1",
            "requestedAt": "2026-06-22T00:00:00Z",
        }
    )


def test_validate_pipeline_batch_action_response_uses_spring_message_contract():
    validator = SpringContractValidator()

    validator.validate_pipeline_batch_action_response(
        {
            "actionType": "RUN",
            "requestedCount": 1,
            "acceptedCount": 1,
            "results": [
                {
                    "sourceName": "wanted",
                    "accepted": True,
                    "message": "RUN action accepted. pipelineStatus=RUNNING",
                }
            ],
            "requestedAt": "2026-06-22T00:00:00Z",
        }
    )
