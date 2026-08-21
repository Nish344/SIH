from __future__ import annotations

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from dashboard.auth import create_session_token, verify_password, verify_session_token
from dashboard.config import Settings, load_settings
from dashboard.data import load_payload

def create_app(settings: Settings | None = None) -> FastAPI:
    if settings is None:
        settings = load_settings()

    app = FastAPI()
    app.state.settings = settings

    limiter = Limiter(key_func=lambda request: request.client.host or "unknown")
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    def get_settings() -> Settings:
        return app.state.settings

    async def require_session(
        request: Request, settings: Settings = Depends(get_settings)
    ) -> None:
        token = request.cookies.get(settings.cookie_name)
        if not token or not verify_session_token(
            token, settings.session_secret, settings.session_max_age_s
        ):
            raise HTTPException(status_code=401, detail="unauthorized")

    @app.get("/api/health")
    @limiter.limit("60/minute")
    async def health(request: Request) -> dict:
        return {"ok": True}

    @app.post("/login")
    @limiter.limit("5/minute")
    async def login(
        request: Request,
        settings: Settings = Depends(get_settings),
    ) -> Response:
        content_length = request.headers.get("content-length")
        if content_length is not None:
            try:
                if int(content_length) > 1024:
                    raise HTTPException(
                        status_code=413, detail="request entity too large"
                    )
            except ValueError:
                raise HTTPException(status_code=400, detail="invalid content-length")
        body = await request.json()
        if not isinstance(body, dict):
            raise HTTPException(status_code=400, detail="invalid request body")
        password = body.get("password", "")
        if not verify_password(password, settings.password):
            raise HTTPException(status_code=401, detail="invalid credentials")
        token = create_session_token(settings.session_secret, settings.session_max_age_s)
        response = Response(status_code=204)
        response.set_cookie(
            key=settings.cookie_name,
            value=token,
            httponly=True,
            samesite="lax",
            secure=request.url.scheme == "https",
            max_age=settings.session_max_age_s,
        )
        return response

    @app.post("/logout")
    @limiter.limit("60/minute")
    async def logout(
        request: Request,
        settings: Settings = Depends(get_settings),
    ) -> Response:
        response = Response(status_code=204)
        response.delete_cookie(
            key=settings.cookie_name,
            httponly=True,
            samesite="lax",
            secure=request.url.scheme == "https",
        )
        return response

    @app.get("/api/ps")
    @limiter.limit("60/minute")
    async def api_ps(
        request: Request,
        settings: Settings = Depends(get_settings),
        _: None = Depends(require_session),
    ) -> dict:
        try:
            return load_payload(settings.data_path)
        except (FileNotFoundError, ValueError):
            raise HTTPException(status_code=503, detail="scrape_data_unavailable")

    return app
