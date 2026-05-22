from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler

app = FastAPI(
    title="Career Wave AI & Scraping Engine",
    description="실시간 면접 분석 AI 엔진 및 외부 채용 공고 수집 파이프라인 통합 API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}


# 사용자 AI 엔진 라우터
# from user.api import interview_router
# app.include_router(interview_router.router, prefix="/api/user")

# 어드민 스크래핑 라우터
# from admin.api import scraper_router
# app.include_router(scraper_router.router, prefix="/api/admin")
