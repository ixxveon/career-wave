from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler

app = FastAPI(
    title="Career Wave Scraping Engine",
    description="외부 채용 공고 수집 및 가공 파이프라인 API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

scheduler = AsyncIOScheduler()


@app.on_event("startup")
async def startup():
    scheduler.start()


@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown()


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/api/scrape/run", tags=["scraping"])
async def run_scrape_now():
    """수동으로 전체 크롤링 파이프라인을 즉시 실행합니다."""
    from pipeline.runner import run_pipeline
    await run_pipeline()
    return {"message": "크롤링 파이프라인 실행 완료"}
