from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
import re

from .errors import BackendError
from .security import (
    SESSION_COOKIE_NAME,
    build_session_cookie,
    expire_session_cookie,
    read_cookie,
)
from .service import BackendService, SESSION_MAX_AGE_SECONDS


SAVE_ROUTE_RE = re.compile(r"^/api/backend/saves/(?P<save_id>[A-Za-z0-9_-]+)(?P<suffix>/export|/publish)?$")
COMMUNITY_ROUTE_RE = re.compile(
    r"^/api/backend/community/saves/(?P<save_id>[A-Za-z0-9_-]+)(?P<suffix>/download|/comments|/reports)?$"
)


@dataclass
class BackendResponse:
    status: int
    payload: dict[str, object]
    headers: list[tuple[str, str]] = field(default_factory=list)


def handle_backend_request(
    method: str,
    route: str,
    *,
    headers: dict[str, str],
    payload: dict[str, object] | None,
    root: Path,
) -> BackendResponse | None:
    if not route.startswith("/api/backend/"):
        return None
    service = BackendService(root)
    request_payload = payload or {}
    session_id = read_cookie(_read_header(headers, "Cookie"), SESSION_COOKIE_NAME)
    csrf_token = _read_header(headers, "X-MapCreator-CSRF")

    try:
        if method == "POST" and route == "/api/backend/auth/register":
            body = service.register(request_payload)
            session_id = str(body.pop("sessionId"))
            return _session_response(201, body, session_id)
        if method == "POST" and route == "/api/backend/auth/login":
            body = service.login(request_payload)
            session_id = str(body.pop("sessionId"))
            return _session_response(200, body, session_id)
        if method == "POST" and route == "/api/backend/auth/logout":
            service.logout(session_id, csrf_token)
            return BackendResponse(200, {"ok": True}, [("Set-Cookie", expire_session_cookie())])
        if method == "GET" and route == "/api/backend/auth/me":
            return BackendResponse(200, service.current_session(session_id))

        if method == "POST" and route == "/api/backend/saves":
            return BackendResponse(201, {"save": service.create_save(session_id, csrf_token, request_payload)})
        if method == "GET" and route == "/api/backend/saves":
            return BackendResponse(200, service.list_my_saves(session_id))

        save_match = SAVE_ROUTE_RE.fullmatch(route)
        if save_match:
            save_id = save_match.group("save_id")
            suffix = save_match.group("suffix") or ""
            if method == "GET" and suffix == "":
                return BackendResponse(200, {"save": service.get_save(session_id, save_id)})
            if method == "GET" and suffix == "/export":
                return BackendResponse(200, service.export_save(session_id, save_id))
            if method == "POST" and suffix == "/publish":
                return BackendResponse(200, {"save": service.publish_save(session_id, csrf_token, save_id, request_payload)})

        if method == "GET" and route == "/api/backend/community/saves":
            return BackendResponse(200, service.list_community_saves())

        community_match = COMMUNITY_ROUTE_RE.fullmatch(route)
        if community_match:
            save_id = community_match.group("save_id")
            suffix = community_match.group("suffix") or ""
            if method == "GET" and suffix == "":
                return BackendResponse(200, {"save": service.get_community_save(save_id)})
            if method == "GET" and suffix == "/download":
                return BackendResponse(200, service.download_community_save(save_id))
            if method == "POST" and suffix == "/comments":
                return BackendResponse(201, service.add_comment(session_id, csrf_token, save_id, request_payload))
            if method == "POST" and suffix == "/reports":
                return BackendResponse(201, service.report_save(session_id, csrf_token, save_id, request_payload))
    except BackendError as error:
        return BackendResponse(
            error.status,
            {
                "ok": False,
                "code": error.code,
                "message": error.message,
                "details": error.details,
            },
        )

    return BackendResponse(
        404,
        {
            "ok": False,
            "code": "not_found",
            "message": f"Unknown backend route: {route}",
        },
    )


def _session_response(status: int, payload: dict[str, object], session_id: str) -> BackendResponse:
    return BackendResponse(
        status,
        payload,
        [("Set-Cookie", build_session_cookie(session_id, max_age=SESSION_MAX_AGE_SECONDS))],
    )


def _read_header(headers: object, name: str) -> str:
    try:
        value = headers.get(name)  # type: ignore[attr-defined]
    except AttributeError:
        value = None
    if value:
        return str(value)
    expected = name.lower()
    try:
        items = headers.items()  # type: ignore[attr-defined]
    except AttributeError:
        return ""
    for key, candidate in items:
        if str(key).lower() == expected:
            return str(candidate or "")
    return ""
