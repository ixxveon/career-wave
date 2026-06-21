# FastAPI Testing

## Python runtime

Use Python 3.12 for the FastAPI pytest suite.

Python 3.14 can require source builds for pinned native dependencies such as
`pydantic-core` or `psycopg2-binary`. On Windows, those builds can fail when
Visual C++ build tools or PostgreSQL client binaries are not installed.

## Setup

```bash
cd fastapi
python -m pip install -r requirements.txt
```

## aiMetrics verification

```bash
cd fastapi
python -m pytest tests -k ai_metrics
```

For isolated service tests:

```bash
cd fastapi
python -m pytest --noconftest tests/test_ai_metrics_service.py
```
