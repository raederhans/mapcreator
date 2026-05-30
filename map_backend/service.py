from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
import sqlite3

from .errors import BackendError
from .security import hash_password, now_token, verify_password
from .storage import ProjectStorage
from .store import BackendStore, utc_iso, utc_now


USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,32}$")
SAVE_VISIBILITY_PUBLIC = "public"
SAVE_VISIBILITY_PRIVATE = "private"
SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60
SHARED_PROJECT_FIELD_ALLOWLIST = {
    "schemaVersion",
    "countryBaseColors",
    "featureOverrides",
    "sovereignBaseColors",
    "visualOverrides",
    "waterRegionOverrides",
    "specialZoneLayers",
    "sovereigntyByFeatureId",
    "mapSemanticMode",
    "paintMode",
    "interactionGranularity",
    "batchFillScope",
    "activeSovereignCode",
    "activePaletteId",
    "specialZoneMembershipBrushMode",
    "specialZones",
    "parentBordersVisible",
    "parentBorderEnabledByCountry",
    "manualSpecialZones",
    "annotationView",
    "operationalLines",
    "operationGraphics",
    "unitCounters",
    "customPresets",
    "recentColors",
    "layerVisibility",
    "styleConfig",
    "transportWorkbenchUi",
    "transportCountryOverlayState",
    "exportWorkbenchUi",
    "scenario",
    "releasableBoundaryVariantByTag",
    "timestamp",
}


class BackendService:
    def __init__(self, root: Path) -> None:
        self.store = BackendStore(root)
        self.storage = ProjectStorage(root)

    def register(self, payload: dict[str, object]) -> dict[str, object]:
        username = self._normalize_username(payload.get("username"))
        password = self._normalize_password(payload.get("password"))
        raw_display_name = payload.get("displayName")
        display_name = self._normalize_display_name(
            raw_display_name if raw_display_name is not None and raw_display_name != "" else username
        )
        user_id = now_token()
        with self.store.connect() as connection:
            try:
                connection.execute(
                    """
                    INSERT INTO users (id, username, display_name, password_hash, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (user_id, username, display_name, hash_password(password), utc_iso()),
                )
            except sqlite3.IntegrityError as exc:
                raise BackendError("username_taken", "Username is already registered.", status=409) from exc
            return self._create_session_response(connection, user_id)

    def login(self, payload: dict[str, object]) -> dict[str, object]:
        username = self._normalize_username(payload.get("username"))
        password = self._normalize_password(payload.get("password"))
        with self.store.connect() as connection:
            user = connection.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
            if user is None or not verify_password(password, str(user["password_hash"])):
                raise BackendError("invalid_credentials", "Username or password is incorrect.", status=401)
            return self._create_session_response(connection, str(user["id"]))

    def logout(self, session_id: str) -> None:
        if not session_id:
            return
        with self.store.connect() as connection:
            connection.execute("DELETE FROM sessions WHERE id = ?", (session_id,))

    def current_session(self, session_id: str) -> dict[str, object]:
        with self.store.connect() as connection:
            return self._load_session(connection, session_id)

    def create_save(self, session_id: str, csrf_token: str, payload: dict[str, object]) -> dict[str, object]:
        with self.store.connect() as connection:
            session = self._require_session(connection, session_id, csrf_token)
            project = self._normalize_project(payload.get("project"))
            title = self._normalize_title(payload.get("title"))
            description = self._normalize_description(payload.get("description"))
            save_id = now_token()
            project_hash = self._project_hash(project)
            now = utc_iso()
            connection.execute(
                """
                INSERT INTO saves (
                  id, owner_user_id, title, description, project_hash,
                  visibility, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    save_id,
                    session["user"]["id"],
                    title,
                    description,
                    project_hash,
                    SAVE_VISIBILITY_PRIVATE,
                    now,
                    now,
                ),
            )
            self.storage.write_project(save_id, project)
            return self._save_payload(
                connection.execute("SELECT * FROM saves WHERE id = ?", (save_id,)).fetchone(),
                include_owner=True,
            )

    def list_my_saves(self, session_id: str) -> dict[str, object]:
        with self.store.connect() as connection:
            session = self._load_session(connection, session_id)
            rows = connection.execute(
                """
                SELECT * FROM saves
                WHERE owner_user_id = ?
                ORDER BY updated_at DESC
                """,
                (session["user"]["id"],),
            ).fetchall()
            return {"saves": [self._save_payload(row, include_owner=True) for row in rows]}

    def get_save(self, session_id: str, save_id: str) -> dict[str, object]:
        with self.store.connect() as connection:
            session = self._load_session(connection, session_id)
            row = self._load_save_row(connection, save_id)
            if row["owner_user_id"] != session["user"]["id"] and row["visibility"] != SAVE_VISIBILITY_PUBLIC:
                raise BackendError("save_not_found", "Save was not found.", status=404)
            payload = self._save_payload(row, include_owner=True)
            payload["project"] = self._read_project_payload(save_id)
            return payload

    def export_save(self, session_id: str, save_id: str) -> dict[str, object]:
        return {
            "save": self.get_save(session_id, save_id),
            "filename": f"mapcreator-save-{save_id[:8]}.json",
        }

    def publish_save(self, session_id: str, csrf_token: str, save_id: str, payload: dict[str, object]) -> dict[str, object]:
        with self.store.connect() as connection:
            session = self._require_session(connection, session_id, csrf_token)
            row = self._load_save_row(connection, save_id)
            if row["owner_user_id"] != session["user"]["id"]:
                raise BackendError("save_not_found", "Save was not found.", status=404)
            visibility = str(payload.get("visibility") or SAVE_VISIBILITY_PUBLIC).strip().lower()
            if visibility not in {SAVE_VISIBILITY_PUBLIC, SAVE_VISIBILITY_PRIVATE}:
                raise BackendError("invalid_visibility", "Visibility must be public or private.", status=400)
            published_at = utc_iso() if visibility == SAVE_VISIBILITY_PUBLIC else None
            connection.execute(
                """
                UPDATE saves
                SET visibility = ?, published_at = ?, updated_at = ?
                WHERE id = ?
                """,
                (visibility, published_at, utc_iso(), save_id),
            )
            return self._save_payload(self._load_save_row(connection, save_id), include_owner=True)

    def list_community_saves(self) -> dict[str, object]:
        with self.store.connect() as connection:
            rows = connection.execute(
                """
                SELECT saves.*, users.username, users.display_name
                FROM saves
                JOIN users ON users.id = saves.owner_user_id
                WHERE saves.visibility = ?
                ORDER BY saves.published_at DESC, saves.updated_at DESC
                LIMIT 50
                """,
                (SAVE_VISIBILITY_PUBLIC,),
            ).fetchall()
            return {"saves": [self._save_payload(row, include_owner=True) for row in rows]}

    def get_community_save(self, save_id: str) -> dict[str, object]:
        with self.store.connect() as connection:
            row = self._load_public_save_row(connection, save_id)
            comments = connection.execute(
                """
                SELECT comments.*, users.username, users.display_name
                FROM comments
                JOIN users ON users.id = comments.user_id
                WHERE comments.save_id = ? AND comments.status = 'visible'
                ORDER BY comments.created_at ASC
                """,
                (save_id,),
            ).fetchall()
            payload = self._save_payload(row, include_owner=True)
            payload["comments"] = [self._comment_payload(comment) for comment in comments]
            return payload

    def download_community_save(self, save_id: str) -> dict[str, object]:
        save = self.get_community_save(save_id)
        save["project"] = self._share_project_payload(self._read_project_payload(save_id))
        return {
            "save": save,
            "filename": f"community-mapcreator-save-{save_id[:8]}.json",
        }

    def add_comment(self, session_id: str, csrf_token: str, save_id: str, payload: dict[str, object]) -> dict[str, object]:
        body = self._normalize_comment(payload.get("body"))
        with self.store.connect() as connection:
            session = self._require_session(connection, session_id, csrf_token)
            self._load_public_save_row(connection, save_id)
            comment_id = now_token()
            connection.execute(
                """
                INSERT INTO comments (id, save_id, user_id, body, status, created_at)
                VALUES (?, ?, ?, ?, 'visible', ?)
                """,
                (comment_id, save_id, session["user"]["id"], body, utc_iso()),
            )
            comment = connection.execute(
                """
                SELECT comments.*, users.username, users.display_name
                FROM comments
                JOIN users ON users.id = comments.user_id
                WHERE comments.id = ?
                """,
                (comment_id,),
            ).fetchone()
            return {"comment": self._comment_payload(comment)}

    def report_save(self, session_id: str, csrf_token: str, save_id: str, payload: dict[str, object]) -> dict[str, object]:
        reason = self._normalize_report_reason(payload.get("reason"))
        details = self._normalize_description(payload.get("details"))
        with self.store.connect() as connection:
            session = self._require_session(connection, session_id, csrf_token)
            self._load_public_save_row(connection, save_id)
            report_id = now_token()
            connection.execute(
                """
                INSERT INTO reports (id, save_id, reporter_user_id, reason, details, status, created_at)
                VALUES (?, ?, ?, ?, ?, 'open', ?)
                """,
                (report_id, save_id, session["user"]["id"], reason, details, utc_iso()),
            )
            return {
                "report": {
                    "id": report_id,
                    "saveId": save_id,
                    "reason": reason,
                    "status": "open",
                }
            }

    def _create_session_response(self, connection, user_id: str) -> dict[str, object]:
        session_id = now_token()
        csrf_token = now_token()
        connection.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
        connection.execute(
            """
            INSERT INTO sessions (id, user_id, csrf_token, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (session_id, user_id, csrf_token, utc_iso(), self.store.session_expiry()),
        )
        session = self._load_session(connection, session_id)
        session["sessionId"] = session_id
        return session

    def _load_session(self, connection, session_id: str) -> dict[str, object]:
        if not session_id:
            raise BackendError("auth_required", "Login is required.", status=401)
        row = connection.execute(
            """
            SELECT sessions.*, users.username, users.display_name
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.id = ?
            """,
            (session_id,),
        ).fetchone()
        if row is None or str(row["expires_at"]) <= utc_iso(utc_now()):
            raise BackendError("auth_required", "Login is required.", status=401)
        return {
            "user": {
                "id": str(row["user_id"]),
                "username": str(row["username"]),
                "displayName": str(row["display_name"]),
            },
            "csrfToken": str(row["csrf_token"]),
        }

    def _require_session(self, connection, session_id: str, csrf_token: str) -> dict[str, object]:
        session = self._load_session(connection, session_id)
        if not csrf_token or csrf_token != session["csrfToken"]:
            raise BackendError("invalid_csrf", "CSRF token is missing or invalid.", status=403)
        return session

    def _load_save_row(self, connection, save_id: str):
        row = connection.execute("SELECT * FROM saves WHERE id = ?", (save_id,)).fetchone()
        if row is None:
            raise BackendError("save_not_found", "Save was not found.", status=404)
        return row

    def _load_public_save_row(self, connection, save_id: str):
        row = connection.execute(
            """
            SELECT saves.*, users.username, users.display_name
            FROM saves
            JOIN users ON users.id = saves.owner_user_id
            WHERE saves.id = ? AND saves.visibility = ?
            """,
            (save_id, SAVE_VISIBILITY_PUBLIC),
        ).fetchone()
        if row is None:
            raise BackendError("save_not_found", "Save was not found.", status=404)
        return row

    def _read_project_payload(self, save_id: str) -> dict[str, object]:
        try:
            return self.storage.read_project(save_id)
        except (FileNotFoundError, json.JSONDecodeError, ValueError) as exc:
            raise BackendError(
                "save_payload_unavailable",
                "The saved project payload is unavailable or corrupt.",
                status=500,
            ) from exc

    def _save_payload(self, row, *, include_owner: bool) -> dict[str, object]:
        payload = {
            "id": str(row["id"]),
            "title": str(row["title"]),
            "description": str(row["description"] or ""),
            "projectHash": str(row["project_hash"]),
            "visibility": str(row["visibility"]),
            "createdAt": str(row["created_at"]),
            "updatedAt": str(row["updated_at"]),
            "publishedAt": row["published_at"],
        }
        if include_owner:
            payload["owner"] = {
                "id": str(row["owner_user_id"]),
                "username": str(row["username"]) if "username" in row.keys() else "",
                "displayName": str(row["display_name"]) if "display_name" in row.keys() else "",
            }
        return payload

    def _comment_payload(self, row) -> dict[str, object]:
        return {
            "id": str(row["id"]),
            "saveId": str(row["save_id"]),
            "body": str(row["body"]),
            "createdAt": str(row["created_at"]),
            "author": {
                "id": str(row["user_id"]),
                "username": str(row["username"]),
                "displayName": str(row["display_name"]),
            },
        }

    def _project_hash(self, payload: dict[str, object]) -> str:
        encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()

    def _share_project_payload(self, payload: dict[str, object]) -> dict[str, object]:
        # Public community downloads keep the importable project contract while dropping local-only/private runtime fields.
        return {
            key: payload[key]
            for key in SHARED_PROJECT_FIELD_ALLOWLIST
            if key in payload
        }

    def _normalize_text_field(
        self,
        value: object,
        *,
        code: str,
        message: str,
        allow_missing: bool = False,
        trim: bool = True,
    ) -> str:
        if value is None and allow_missing:
            return ""
        if not isinstance(value, str):
            raise BackendError(code, message, status=400)
        return value.strip() if trim else value

    def _normalize_project(self, value: object) -> dict[str, object]:
        if not isinstance(value, dict):
            raise BackendError("invalid_project", "Project payload must be a JSON object.", status=400)
        if "schemaVersion" not in value:
            raise BackendError("invalid_project", "Project payload must include schemaVersion.", status=400)
        return value

    def _normalize_username(self, value: object) -> str:
        username = self._normalize_text_field(
            value,
            code="invalid_username",
            message="Username must be 3-32 letters, numbers, or underscores.",
        ).lower()
        if not USERNAME_RE.fullmatch(username):
            raise BackendError("invalid_username", "Username must be 3-32 letters, numbers, or underscores.", status=400)
        return username

    def _normalize_password(self, value: object) -> str:
        password = self._normalize_text_field(
            value,
            code="invalid_password",
            message="Password must be at least 8 characters.",
            trim=False,
        )
        if len(password) < 8:
            raise BackendError("invalid_password", "Password must be at least 8 characters.", status=400)
        return password

    def _normalize_display_name(self, value: object) -> str:
        display_name = self._normalize_text_field(
            value,
            code="invalid_display_name",
            message="Display name is required and must fit within 80 characters.",
        )
        if not display_name or len(display_name) > 80:
            raise BackendError("invalid_display_name", "Display name is required and must fit within 80 characters.", status=400)
        return display_name

    def _normalize_title(self, value: object) -> str:
        title = self._normalize_text_field(
            value,
            code="invalid_title",
            message="Title is required and must fit within 120 characters.",
        )
        if not title or len(title) > 120:
            raise BackendError("invalid_title", "Title is required and must fit within 120 characters.", status=400)
        return title

    def _normalize_description(self, value: object) -> str:
        description = self._normalize_text_field(
            value,
            code="invalid_description",
            message="Description must fit within 500 characters.",
            allow_missing=True,
        )
        if len(description) > 500:
            raise BackendError("invalid_description", "Description must fit within 500 characters.", status=400)
        return description

    def _normalize_comment(self, value: object) -> str:
        body = self._normalize_text_field(
            value,
            code="invalid_comment",
            message="Comment is required and must fit within 1000 characters.",
        )
        if not body or len(body) > 1000:
            raise BackendError("invalid_comment", "Comment is required and must fit within 1000 characters.", status=400)
        return body

    def _normalize_report_reason(self, value: object) -> str:
        reason = self._normalize_text_field(
            value,
            code="invalid_report_reason",
            message="Report reason is not supported.",
        ).lower()
        allowed = {"spam", "abuse", "copyright", "unsafe", "other"}
        if reason not in allowed:
            raise BackendError("invalid_report_reason", "Report reason is not supported.", status=400)
        return reason
