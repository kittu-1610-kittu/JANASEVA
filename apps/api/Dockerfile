# syntax=docker/dockerfile:1
# =============================================================================
# JANASEVA OS — FastAPI Multi-stage Dockerfile
# =============================================================================

# ─── Base ────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libmagic1 \
    curl \
    gdal-bin \
    libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PIP_NO_CACHE_DIR=1

# ─── Dependencies ─────────────────────────────────────────────────────────────
FROM base AS deps

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# ─── Development ──────────────────────────────────────────────────────────────
FROM deps AS development
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ─── Production ───────────────────────────────────────────────────────────────
FROM deps AS production
COPY . .
RUN useradd -r -u 1001 appuser && chown -R appuser /app
USER appuser
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
