"""
JANASEVA OS — FastAPI Application Entry Point
"""
from __future__ import annotations

import time
import uuid
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request, status
from fastapi.exception_handlers import http_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1 import api_router
from app.core.config import get_settings
from app.core.exceptions import JanasevaException
from app.core.logging import get_logger, setup_logging

setup_logging()
logger = get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    logger.info(
        "JANASEVA OS starting",
        env=settings.app_env,
        demo_mode=settings.seed_demo_data,
        district=settings.demo_district_name,
    )
    yield
    logger.info("JANASEVA OS shutting down.")


app = FastAPI(
    title="JANASEVA OS API",
    description=(
        "AI-assisted district public-service and emergency coordination platform. "
        "⚠️ This is a demonstration prototype with synthetic data."
    ),
    version="1.0.0",
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    lifespan=lifespan,
    openapi_url="/openapi.json" if settings.is_development else None,
)

# ─── CORS ────────────────────────────────────────────────────────────────────
cors_origins = list(settings.allowed_origins)
for origin in [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "https://janaseva-19x2.vercel.app",
]:
    if origin not in cors_origins:
        cors_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request ID + Logging Middleware ─────────────────────────────────────────
@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        request_id=request_id,
        method=request.method,
        path=request.url.path,
    )
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "request completed",
        status_code=response.status_code,
        elapsed_ms=elapsed_ms,
    )
    return response


# ─── Security Headers ─────────────────────────────────────────────────────────
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# ─── Exception Handlers ───────────────────────────────────────────────────────
@app.exception_handler(JanasevaException)
async def janaseva_exception_handler(request: Request, exc: JanasevaException):
    logger.warning("domain exception", error_code=exc.error_code, message=exc.message)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.error_code, "message": exc.message}},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed.",
                "details": exc.errors(),
            }
        },
    )


@app.exception_handler(StarletteHTTPException)
async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": str(exc.status_code), "message": exc.detail}},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("unhandled server exception", error=str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": {"code": "INTERNAL_SERVER_ERROR", "message": "An error occurred while processing the request."}},
    )


# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(api_router)


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"], include_in_schema=False)
async def health():
    return {
        "status": "ok",
        "app": "JANASEVA OS",
        "version": "1.0.0",
        "env": settings.app_env,
        "demo": settings.seed_demo_data,
    }


@app.get("/", include_in_schema=False)
async def root():
    return {
        "message": "JANASEVA OS API",
        "docs": "/docs",
        "health": "/health",
        "notice": "⚠️ This is a demo system with synthetic data. Not a real government authority.",
    }
