from admin.scraping.repository.scraping_pipeline_repository import (
    ScrapingPipelineRecord,
    ScrapingPipelineRepository,
    scraping_pipelines_table,
)
from admin.scraping.repository.job_notice_repository import (
    JobNoticeRecord,
    JobNoticeRepository,
    job_notices_table,
)
from admin.scraping.repository.scraping_log_repository import (
    ScrapingLogPageRecord,
    ScrapingLogRecord,
    ScrapingLogRepository,
    scraping_logs_table,
)

__all__ = [
    "JobNoticeRecord",
    "JobNoticeRepository",
    "ScrapingLogPageRecord",
    "ScrapingLogRecord",
    "ScrapingLogRepository",
    "ScrapingPipelineRecord",
    "ScrapingPipelineRepository",
    "job_notices_table",
    "scraping_logs_table",
    "scraping_pipelines_table",
]
