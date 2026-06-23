from admin.scraping.exception import ScrapingErrorCode


class SpringContractValidator:
    """Validates FastAPI response contracts expected by Spring Boot."""

    DISCORD_ALERT_IMPLEMENTED = False

    PIPELINE_PAGE_FIELDS = {"content", "page", "size", "totalElements", "totalPages"}
    PIPELINE_ITEM_FIELDS = {
        "scrapingPipelineId",
        "sourceName",
        "displayName",
        "pipelineStatus",
        "isEnabled",
        "lastStartedAt",
        "lastSuccessAt",
        "lastFailedAt",
        "lastDurationMs",
        "lastTotalCount",
        "lastErrorMessage",
        "createdAt",
        "updatedAt",
    }
    PIPELINE_SUMMARY_FIELDS = {
        "totalCount",
        "idleCount",
        "runningCount",
        "successCount",
        "failedCount",
        "enabledCount",
        "disabledCount",
    }
    SCRAPING_LOG_PAGE_FIELDS = {"content", "page", "size", "totalElements", "totalPages"}
    SCRAPING_LOG_ITEM_FIELDS = {
        "scrapingLogId",
        "scrapingPipelineId",
        "sourceName",
        "targetSite",
        "scrapingStatus",
        "totalCount",
        "errorMessage",
        "executedAt",
    }
    PIPELINE_ACTION_FIELDS = {"sourceName", "accepted", "pipelineStatus", "requestedAt"}
    PIPELINE_BATCH_ACTION_FIELDS = {
        "actionType",
        "requestedCount",
        "acceptedCount",
        "results",
        "requestedAt",
    }
    PIPELINE_BATCH_ACTION_ITEM_FIELDS = {"sourceName", "accepted", "pipelineStatus"}

    ERROR_CODE_MAPPING = {
        ScrapingErrorCode.SCRAPING_PIPELINE_NOT_FOUND.value: "SCRAPING_PIPELINE_NOT_FOUND",
        ScrapingErrorCode.SCRAPING_SOURCE_NOT_FOUND.value: "SCRAPING_SOURCE_NOT_FOUND",
        ScrapingErrorCode.SCRAPING_ALREADY_RUNNING.value: "SCRAPING_ALREADY_RUNNING",
        ScrapingErrorCode.SCRAPING_EXECUTION_FAILED.value: "SCRAPING_EXECUTION_FAILED",
        ScrapingErrorCode.SCRAPING_TEST_FAILED.value: "SCRAPING_TEST_FAILED",
        ScrapingErrorCode.FASTAPI_INTERNAL_ERROR.value: "SCRAPING_EXECUTION_FAILED",
        ScrapingErrorCode.DISCORD_ALERT_SEND_FAILED.value: "SCRAPING_EXECUTION_FAILED",
    }

    def validate_success_payload(self, payload: dict, required_fields: set[str]) -> None:
        missing_fields = required_fields.difference(payload.keys())
        if missing_fields:
            raise AssertionError(
                f"FastAPI success payload is missing required fields: {sorted(missing_fields)}"
            )

    def validate_error_payload(self, payload: dict) -> None:
        required_fields = {"success", "errorCode", "message", "detail"}
        missing_fields = required_fields.difference(payload.keys())
        if missing_fields:
            raise AssertionError(
                f"FastAPI error payload is missing required fields: {sorted(missing_fields)}"
            )

        if payload["success"] is not False:
            raise AssertionError("FastAPI error payload must set success=false.")

        error_code = payload["errorCode"]
        if error_code not in self.ERROR_CODE_MAPPING:
            raise AssertionError(f"Unsupported FastAPI errorCode for Spring mapping: {error_code}")

    def validate_error_code_mapping(self, fastapi_error_code: str) -> str:
        spring_error_code = self.ERROR_CODE_MAPPING.get(fastapi_error_code)
        if spring_error_code is None:
            raise AssertionError(
                f"FastAPI errorCode is not mappable to Spring errorCode: {fastapi_error_code}"
            )
        return spring_error_code

    def validate_all_error_code_mappings(self) -> None:
        for fastapi_error_code in self.ERROR_CODE_MAPPING:
            self.validate_error_code_mapping(fastapi_error_code)

    def validate_fastapi_internal_error_mapping(self) -> None:
        spring_error_code = self.validate_error_code_mapping(
            ScrapingErrorCode.FASTAPI_INTERNAL_ERROR.value
        )
        if spring_error_code != ScrapingErrorCode.SCRAPING_EXECUTION_FAILED.value:
            raise AssertionError(
                "FASTAPI_INTERNAL_ERROR must map to SCRAPING_EXECUTION_FAILED for Spring."
            )

    def validate_discord_alert_policy(self, payload: dict | None = None) -> None:
        if self.DISCORD_ALERT_IMPLEMENTED:
            return

        if payload is None:
            return

        if payload.get("errorCode") == ScrapingErrorCode.DISCORD_ALERT_SEND_FAILED.value:
            raise AssertionError(
                "DISCORD_ALERT_SEND_FAILED must not be emitted while alert sending is disabled."
            )

    def validate_pipeline_list_response(self, payload: dict) -> None:
        self.validate_success_payload(payload, self.PIPELINE_PAGE_FIELDS)
        self._validate_items(
            payload=payload,
            key="content",
            required_fields=self.PIPELINE_ITEM_FIELDS,
        )

    def validate_pipeline_summary_response(self, payload: dict) -> None:
        self.validate_success_payload(payload, self.PIPELINE_SUMMARY_FIELDS)

    def validate_pipeline_detail_response(self, payload: dict) -> None:
        self.validate_success_payload(payload, self.PIPELINE_ITEM_FIELDS)

    def validate_pipeline_logs_response(self, payload: dict) -> None:
        self.validate_success_payload(payload, self.SCRAPING_LOG_PAGE_FIELDS)
        self._validate_items(
            payload=payload,
            key="content",
            required_fields=self.SCRAPING_LOG_ITEM_FIELDS,
        )

    def validate_pipeline_action_response(self, payload: dict) -> None:
        self.validate_success_payload(payload, self.PIPELINE_ACTION_FIELDS)

    def validate_pipeline_batch_action_response(self, payload: dict) -> None:
        self.validate_success_payload(payload, self.PIPELINE_BATCH_ACTION_FIELDS)
        self._validate_items(
            payload=payload,
            key="results",
            required_fields=self.PIPELINE_BATCH_ACTION_ITEM_FIELDS,
        )

    def _validate_items(self, *, payload: dict, key: str, required_fields: set[str]) -> None:
        items = payload.get(key)
        if not isinstance(items, list):
            raise AssertionError(f"FastAPI payload field '{key}' must be a list.")

        for item in items:
            if not isinstance(item, dict):
                raise AssertionError(f"FastAPI payload field '{key}' must contain object items.")
            missing_fields = required_fields.difference(item.keys())
            if missing_fields:
                raise AssertionError(
                    f"FastAPI payload item is missing required fields: {sorted(missing_fields)}"
                )
