from admin.scraping.task.dispatcher import schedule_scraping_task
from admin.scraping.task.scraping_task import ScrapingTask, ScrapingTaskResult

__all__ = ["ScrapingTask", "ScrapingTaskResult", "schedule_scraping_task"]
