import logging

from core.redis import get_redis

_LOG = logging.getLogger(__name__)
_JOB_NOTICE_CACHE_NAMES = (
    "jobNoticeFilterOptions",
    "jobNoticeStats",
    "jobNoticeListCount",
    "jobNoticeList",
)


async def invalidate_job_notice_caches() -> None:
    """Clear Spring Redis caches after FastAPI persists scraped notices."""
    try:
        redis = await get_redis()
        deleted_count = 0
        for cache_name in _JOB_NOTICE_CACHE_NAMES:
            keys = [key async for key in redis.scan_iter(match=f"{cache_name}::*")]
            if keys:
                deleted_count += await redis.delete(*keys)
        _LOG.info("[scraping] Job notice caches invalidated: deleted=%s", deleted_count)
    except Exception as error:
        # Cache invalidation must not roll back a successfully persisted scraping run.
        _LOG.warning("[scraping] Job notice cache invalidation failed: %s", error)
