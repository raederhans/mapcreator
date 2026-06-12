from __future__ import annotations

import hashlib
from ipaddress import ip_address
import json
import re
from pathlib import Path
import sqlite3
from urllib.parse import unquote, urlparse

from .errors import BackendError
from .security import hash_password, now_token, verify_password
from .storage import ProjectStorage
from .store import BackendStore, utc_iso, utc_now


USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,32}$")
SAVE_VISIBILITY_PUBLIC = "public"
SAVE_VISIBILITY_PRIVATE = "private"
USER_ROLE_ADMIN = "admin"
USER_ROLE_MODERATOR = "moderator"
USER_ROLE_MEMBER = "member"
USER_STATUS_ACTIVE = "active"
USER_STATUS_BANNED = "banned"
SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60
UNSAFE_IMAGE_URL_CHARS = {"'", "\"", "`", "(", ")", "<", ">", "\\"}
SHARED_PROJECT_FIELD_ALLOWLIST = (
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
    "appearancePresets",
    "intensityFields",
    "recentColors",
    "layerVisibility",
    "styleConfig",
    "transportWorkbenchUi",
    "transportCountryOverlayState",
    "exportWorkbenchUi",
    "scenario",
    "releasableBoundaryVariantByTag",
    "timestamp",
)


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
            role = USER_ROLE_ADMIN if self._user_count(connection) == 0 else USER_ROLE_MEMBER
            try:
                connection.execute(
                    """
                    INSERT INTO users (id, username, display_name, password_hash, role, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (user_id, username, display_name, hash_password(password), role, USER_STATUS_ACTIVE, utc_iso()),
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
            if str(user["status"]) == USER_STATUS_BANNED:
                raise BackendError("account_banned", "This account is banned.", status=403)
            return self._create_session_response(connection, str(user["id"]))

    def logout(self, session_id: str, csrf_token: str) -> None:
        with self.store.connect() as connection:
            self._require_session(connection, session_id, csrf_token)
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
            image_url = self._normalize_image_url(payload.get("imageUrl"))
            save_id = now_token()
            project_hash = self._project_hash(project)
            now = utc_iso()
            connection.execute(
                """
                INSERT INTO saves (
                  id, owner_user_id, title, description, project_hash,
                  visibility, comments_enabled, image_url, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    save_id,
                    session["user"]["id"],
                    title,
                    description,
                    project_hash,
                    SAVE_VISIBILITY_PRIVATE,
                    1,
                    image_url,
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
            if row["owner_user_id"] != session["user"]["id"]:
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
                SELECT saves.*, users.username, users.display_name,
                       COUNT(DISTINCT comments.id) AS comment_count,
                       COUNT(DISTINCT reports.id) AS open_report_count
                FROM saves
                JOIN users ON users.id = saves.owner_user_id
                LEFT JOIN comments ON comments.save_id = saves.id AND comments.status = 'visible'
                LEFT JOIN reports ON reports.save_id = saves.id AND reports.status = 'open'
                WHERE saves.visibility = ?
                GROUP BY saves.id
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
            save = self._load_public_save_row(connection, save_id)
            if not int(save["comments_enabled"]):
                raise BackendError("comments_closed", "Comments are closed for this save.", status=403)
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

    def admin_overview(self, session_id: str) -> dict[str, object]:
        with self.store.connect() as connection:
            self._require_staff_session(connection, session_id)
            stats = self._admin_stats(connection)
            users = connection.execute(
                """
                SELECT users.id, users.username, users.display_name, users.role, users.status, users.created_at,
                       COUNT(DISTINCT saves.id) AS save_count
                FROM users
                LEFT JOIN saves ON saves.owner_user_id = users.id
                GROUP BY users.id
                ORDER BY users.created_at DESC
                LIMIT 50
                """
            ).fetchall()
            saves = connection.execute(
                """
                SELECT saves.*, users.username, users.display_name,
                       COUNT(DISTINCT comments.id) AS comment_count,
                       COUNT(DISTINCT reports.id) AS open_report_count
                FROM saves
                JOIN users ON users.id = saves.owner_user_id
                LEFT JOIN comments ON comments.save_id = saves.id AND comments.status = 'visible'
                LEFT JOIN reports ON reports.save_id = saves.id AND reports.status = 'open'
                GROUP BY saves.id
                ORDER BY saves.updated_at DESC
                LIMIT 100
                """
            ).fetchall()
            reports = connection.execute(
                """
                SELECT reports.*, saves.title AS save_title, saves.visibility AS save_visibility,
                       reporter.username AS reporter_username,
                       reporter.display_name AS reporter_display_name,
                       owner.username AS owner_username,
                       owner.display_name AS owner_display_name
                FROM reports
                JOIN saves ON saves.id = reports.save_id
                JOIN users AS reporter ON reporter.id = reports.reporter_user_id
                JOIN users AS owner ON owner.id = saves.owner_user_id
                ORDER BY reports.created_at DESC
                LIMIT 100
                """
            ).fetchall()
            comments = connection.execute(
                """
                SELECT comments.*, saves.title AS save_title,
                       users.username, users.display_name
                FROM comments
                JOIN saves ON saves.id = comments.save_id
                JOIN users ON users.id = comments.user_id
                ORDER BY comments.created_at DESC
                LIMIT 100
                """
            ).fetchall()
            return {
                "stats": stats,
                "users": [self._admin_user_payload(row) for row in users],
                "saves": [self._admin_save_payload(row) for row in saves],
                "reports": [self._admin_report_payload(row) for row in reports],
                "comments": [self._admin_comment_payload(row) for row in comments],
                "activity": self._admin_activity(connection),
            }

    def admin_get_save(self, session_id: str, save_id: str) -> dict[str, object]:
        with self.store.connect() as connection:
            self._require_staff_session(connection, session_id)
            row = self._load_admin_save_row(connection, save_id)
            payload = self._admin_save_payload(row)
            payload["project"] = self._read_project_payload(save_id)
            return payload

    def admin_review_report(self, session_id: str, csrf_token: str, report_id: str) -> dict[str, object]:
        with self.store.connect() as connection:
            self._require_staff_session(connection, session_id, csrf_token)
            report = connection.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
            if report is None:
                raise BackendError("report_not_found", "Report was not found.", status=404)
            connection.execute("UPDATE reports SET status = 'reviewed' WHERE id = ?", (report_id,))
            refreshed = connection.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
            return {"report": self._report_payload(refreshed)}

    def admin_set_save_visibility(
        self,
        session_id: str,
        csrf_token: str,
        save_id: str,
        payload: dict[str, object],
    ) -> dict[str, object]:
        with self.store.connect() as connection:
            self._require_staff_session(connection, session_id, csrf_token)
            self._load_save_row(connection, save_id)
            visibility = str(payload.get("visibility") or "").strip().lower()
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
            row = connection.execute(
                """
                SELECT saves.*, users.username, users.display_name
                FROM saves
                JOIN users ON users.id = saves.owner_user_id
                WHERE saves.id = ?
                """,
                (save_id,),
            ).fetchone()
            return {"save": self._save_payload(row, include_owner=True)}

    def admin_set_save_comments(
        self,
        session_id: str,
        csrf_token: str,
        save_id: str,
        payload: dict[str, object],
    ) -> dict[str, object]:
        with self.store.connect() as connection:
            self._require_staff_session(connection, session_id, csrf_token)
            self._load_save_row(connection, save_id)
            enabled = self._normalize_bool(payload.get("enabled"))
            connection.execute(
                "UPDATE saves SET comments_enabled = ?, updated_at = ? WHERE id = ?",
                (1 if enabled else 0, utc_iso(), save_id),
            )
            return {"save": self._load_admin_save(connection, save_id)}

    def admin_set_save_image(
        self,
        session_id: str,
        csrf_token: str,
        save_id: str,
        payload: dict[str, object],
    ) -> dict[str, object]:
        with self.store.connect() as connection:
            self._require_staff_session(connection, session_id, csrf_token)
            self._load_save_row(connection, save_id)
            image_url = self._normalize_image_url(payload.get("imageUrl"))
            connection.execute(
                "UPDATE saves SET image_url = ?, updated_at = ? WHERE id = ?",
                (image_url, utc_iso(), save_id),
            )
            return {"save": self._load_admin_save(connection, save_id)}

    def admin_hide_comment(self, session_id: str, csrf_token: str, comment_id: str) -> dict[str, object]:
        with self.store.connect() as connection:
            self._require_staff_session(connection, session_id, csrf_token)
            comment = connection.execute("SELECT * FROM comments WHERE id = ?", (comment_id,)).fetchone()
            if comment is None:
                raise BackendError("comment_not_found", "Comment was not found.", status=404)
            connection.execute("UPDATE comments SET status = 'hidden' WHERE id = ?", (comment_id,))
            refreshed = connection.execute("SELECT * FROM comments WHERE id = ?", (comment_id,)).fetchone()
            return {"comment": self._comment_payload(refreshed)}

    def admin_update_user(self, session_id: str, csrf_token: str, user_id: str, payload: dict[str, object]) -> dict[str, object]:
        with self.store.connect() as connection:
            admin_session = self._require_admin_session(connection, session_id, csrf_token)
            user = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            if user is None:
                raise BackendError("user_not_found", "User was not found.", status=404)
            updates: list[str] = []
            values: list[object] = []
            if "role" in payload:
                role = self._normalize_role(payload.get("role"))
                updates.append("role = ?")
                values.append(role)
            if "status" in payload:
                status = self._normalize_user_status(payload.get("status"))
                if user_id == admin_session["user"]["id"] and status == USER_STATUS_BANNED:
                    raise BackendError("cannot_ban_self", "Administrators cannot ban their own active session.", status=400)
                updates.append("status = ?")
                values.append(status)
            if not updates:
                raise BackendError("invalid_user_update", "User update must include role or status.", status=400)
            values.append(user_id)
            connection.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", values)
            if self._active_admin_count(connection) < 1:
                raise BackendError("cannot_remove_last_admin", "At least one active administrator is required.", status=400)
            updated = connection.execute(
                """
                SELECT users.id, users.username, users.display_name, users.role, users.status, users.created_at,
                       COUNT(DISTINCT saves.id) AS save_count
                FROM users
                LEFT JOIN saves ON saves.owner_user_id = users.id
                WHERE users.id = ?
                GROUP BY users.id
                """,
                (user_id,),
            ).fetchone()
            return {"user": self._admin_user_payload(updated)}

    def admin_seed_demo(self, session_id: str, csrf_token: str) -> dict[str, object]:
        with self.store.connect() as connection:
            session = self._require_admin_session(connection, session_id, csrf_token)
            created: list[dict[str, object]] = []
            demo_rows = [
                ("demo_cartographer", "制图师示例", "高山边境设定", "把山脉作为天然边界，附带铁路节点。", "/backend/assets/demo-mountain.svg"),
                ("demo_moderator", "社区版主示例", "群岛贸易航线", "海峡、港口和补给线的共享方案。", "/backend/assets/demo-islands.svg"),
                ("demo_player", "玩家示例", "东部平原战役", "适合多人对战的平原推进存档。", "/backend/assets/demo-plains.svg"),
            ]
            now = utc_iso()
            for username, display_name, title, description, image_url in demo_rows:
                user = connection.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
                if user is None:
                    user_id = now_token()
                    connection.execute(
                        """
                        INSERT INTO users (id, username, display_name, password_hash, role, status, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            user_id,
                            username,
                            display_name,
                            hash_password(now_token()),
                            USER_ROLE_MEMBER,
                            USER_STATUS_ACTIVE,
                            now,
                        ),
                    )
                else:
                    user_id = str(user["id"])
                existing = connection.execute(
                    "SELECT * FROM saves WHERE owner_user_id = ? AND title = ?",
                    (user_id, title),
                ).fetchone()
                if existing is not None:
                    created.append(self._save_payload(existing, include_owner=False))
                    continue
                save_id = now_token()
                project = {
                    "schemaVersion": 21,
                    "paintMode": "visual",
                    "mapSemanticMode": "scenario",
                    "scenario": {"id": username},
                    "timestamp": now,
                }
                connection.execute(
                    """
                    INSERT INTO saves (
                      id, owner_user_id, title, description, project_hash,
                      visibility, comments_enabled, image_url, created_at, updated_at, published_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
                    """,
                    (
                        save_id,
                        user_id,
                        title,
                        description,
                        self._project_hash(project),
                        SAVE_VISIBILITY_PUBLIC,
                        image_url,
                        now,
                        now,
                        now,
                    ),
                )
                self.storage.write_project(save_id, project)
                connection.execute(
                    """
                    INSERT INTO comments (id, save_id, user_id, body, status, created_at)
                    VALUES (?, ?, ?, ?, 'visible', ?)
                    """,
                    (now_token(), save_id, session["user"]["id"], "已通过初始内容巡检。", now),
                )
                created.append(self._save_payload(self._load_save_row(connection, save_id), include_owner=False))
            return {"created": created}

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
            SELECT sessions.*, users.username, users.display_name, users.role, users.status
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.id = ?
            """,
            (session_id,),
        ).fetchone()
        if row is None or str(row["expires_at"]) <= utc_iso(utc_now()):
            raise BackendError("auth_required", "Login is required.", status=401)
        if str(row["status"]) == USER_STATUS_BANNED:
            raise BackendError("account_banned", "This account is banned.", status=403)
        return {
            "user": {
                "id": str(row["user_id"]),
                "username": str(row["username"]),
                "displayName": str(row["display_name"]),
                "role": str(row["role"]),
                "status": str(row["status"]),
            },
            "csrfToken": str(row["csrf_token"]),
        }

    def _require_session(self, connection, session_id: str, csrf_token: str) -> dict[str, object]:
        session = self._load_session(connection, session_id)
        if not csrf_token or csrf_token != session["csrfToken"]:
            raise BackendError("invalid_csrf", "CSRF token is missing or invalid.", status=403)
        return session

    def _require_admin_session(self, connection, session_id: str, csrf_token: str | None = None) -> dict[str, object]:
        session = self._load_session(connection, session_id)
        if csrf_token is not None and (not csrf_token or csrf_token != session["csrfToken"]):
            raise BackendError("invalid_csrf", "CSRF token is missing or invalid.", status=403)
        if session["user"].get("role") != USER_ROLE_ADMIN:
            raise BackendError("admin_required", "Administrator access is required.", status=403)
        return session

    def _require_staff_session(self, connection, session_id: str, csrf_token: str | None = None) -> dict[str, object]:
        session = self._load_session(connection, session_id)
        if csrf_token is not None and (not csrf_token or csrf_token != session["csrfToken"]):
            raise BackendError("invalid_csrf", "CSRF token is missing or invalid.", status=403)
        if session["user"].get("role") not in {USER_ROLE_ADMIN, USER_ROLE_MODERATOR}:
            raise BackendError("admin_required", "Administrator access is required.", status=403)
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
            "commentsEnabled": bool(int(row["comments_enabled"])) if "comments_enabled" in row.keys() else True,
            "imageUrl": self._safe_payload_image_url(str(row["image_url"] or "")) if "image_url" in row.keys() else "",
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
            "status": str(row["status"]) if "status" in row.keys() else "visible",
            "createdAt": str(row["created_at"]),
            "author": {
                "id": str(row["user_id"]),
                "username": str(row["username"]) if "username" in row.keys() else "",
                "displayName": str(row["display_name"]) if "display_name" in row.keys() else "",
            },
        }

    def _report_payload(self, row) -> dict[str, object]:
        return {
            "id": str(row["id"]),
            "saveId": str(row["save_id"]),
            "reason": str(row["reason"]),
            "details": str(row["details"] or ""),
            "status": str(row["status"]),
            "createdAt": str(row["created_at"]),
        }

    def _admin_user_payload(self, row) -> dict[str, object]:
        return {
            "id": str(row["id"]),
            "username": str(row["username"]),
            "displayName": str(row["display_name"]),
            "role": str(row["role"]),
            "status": str(row["status"]),
            "createdAt": str(row["created_at"]),
            "saveCount": int(row["save_count"] or 0),
        }

    def _admin_save_payload(self, row) -> dict[str, object]:
        payload = self._save_payload(row, include_owner=True)
        payload["commentCount"] = int(row["comment_count"] or 0)
        payload["openReportCount"] = int(row["open_report_count"] or 0)
        return payload

    def _admin_comment_payload(self, row) -> dict[str, object]:
        payload = self._comment_payload(row)
        payload["save"] = {
            "id": str(row["save_id"]),
            "title": str(row["save_title"]),
        }
        return payload

    def _admin_report_payload(self, row) -> dict[str, object]:
        payload = self._report_payload(row)
        payload["save"] = {
            "id": str(row["save_id"]),
            "title": str(row["save_title"]),
            "visibility": str(row["save_visibility"]),
            "owner": {
                "username": str(row["owner_username"]),
                "displayName": str(row["owner_display_name"]),
            },
        }
        payload["reporter"] = {
            "username": str(row["reporter_username"]),
            "displayName": str(row["reporter_display_name"]),
        }
        return payload

    def _admin_stats(self, connection) -> dict[str, int]:
        return {
            "users": int(connection.execute("SELECT COUNT(*) AS count FROM users").fetchone()["count"]),
            "saves": int(connection.execute("SELECT COUNT(*) AS count FROM saves").fetchone()["count"]),
            "publicSaves": int(
                connection.execute(
                    "SELECT COUNT(*) AS count FROM saves WHERE visibility = ?",
                    (SAVE_VISIBILITY_PUBLIC,),
                ).fetchone()["count"]
            ),
            "openReports": int(
                connection.execute("SELECT COUNT(*) AS count FROM reports WHERE status = 'open'").fetchone()["count"]
            ),
            "comments": int(connection.execute("SELECT COUNT(*) AS count FROM comments").fetchone()["count"]),
            "bannedUsers": int(
                connection.execute(
                    "SELECT COUNT(*) AS count FROM users WHERE status = ?",
                    (USER_STATUS_BANNED,),
                ).fetchone()["count"]
            ),
        }

    def _admin_activity(self, connection) -> list[dict[str, object]]:
        save_rows = connection.execute(
            """
            SELECT 'save' AS type, saves.id, saves.title AS label, saves.updated_at AS created_at,
                   users.display_name AS actor
            FROM saves
            JOIN users ON users.id = saves.owner_user_id
            ORDER BY saves.updated_at DESC
            LIMIT 8
            """
        ).fetchall()
        comment_rows = connection.execute(
            """
            SELECT 'comment' AS type, comments.id, saves.title AS label, comments.created_at AS created_at,
                   users.display_name AS actor
            FROM comments
            JOIN saves ON saves.id = comments.save_id
            JOIN users ON users.id = comments.user_id
            ORDER BY comments.created_at DESC
            LIMIT 8
            """
        ).fetchall()
        report_rows = connection.execute(
            """
            SELECT 'report' AS type, reports.id, saves.title AS label, reports.created_at AS created_at,
                   users.display_name AS actor
            FROM reports
            JOIN saves ON saves.id = reports.save_id
            JOIN users ON users.id = reports.reporter_user_id
            ORDER BY reports.created_at DESC
            LIMIT 8
            """
        ).fetchall()
        rows = sorted(
            [*save_rows, *comment_rows, *report_rows],
            key=lambda row: str(row["created_at"]),
            reverse=True,
        )[:16]
        return [
            {
                "type": str(row["type"]),
                "id": str(row["id"]),
                "label": str(row["label"]),
                "actor": str(row["actor"]),
                "createdAt": str(row["created_at"]),
            }
            for row in rows
        ]

    def _load_admin_save(self, connection, save_id: str) -> dict[str, object]:
        return self._admin_save_payload(self._load_admin_save_row(connection, save_id))

    def _load_admin_save_row(self, connection, save_id: str):
        row = connection.execute(
            """
            SELECT saves.*, users.username, users.display_name,
                   COUNT(DISTINCT comments.id) AS comment_count,
                   COUNT(DISTINCT reports.id) AS open_report_count
            FROM saves
            JOIN users ON users.id = saves.owner_user_id
            LEFT JOIN comments ON comments.save_id = saves.id AND comments.status = 'visible'
            LEFT JOIN reports ON reports.save_id = saves.id AND reports.status = 'open'
            WHERE saves.id = ?
            GROUP BY saves.id
            """,
            (save_id,),
        ).fetchone()
        if row is None:
            raise BackendError("save_not_found", "Save was not found.", status=404)
        return row

    def _user_count(self, connection) -> int:
        return int(connection.execute("SELECT COUNT(*) AS count FROM users").fetchone()["count"])

    def _active_admin_count(self, connection) -> int:
        row = connection.execute(
            "SELECT COUNT(*) AS count FROM users WHERE role = ? AND status = ?",
            (USER_ROLE_ADMIN, USER_STATUS_ACTIVE),
        ).fetchone()
        return int(row["count"])

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

    def _normalize_bool(self, value: object) -> bool:
        if isinstance(value, bool):
            return value
        raise BackendError("invalid_boolean", "Expected a boolean value.", status=400)

    def _normalize_role(self, value: object) -> str:
        role = self._normalize_text_field(
            value,
            code="invalid_role",
            message="Role is not supported.",
        ).lower()
        if role not in {USER_ROLE_MEMBER, USER_ROLE_MODERATOR, USER_ROLE_ADMIN}:
            raise BackendError("invalid_role", "Role is not supported.", status=400)
        return role

    def _normalize_user_status(self, value: object) -> str:
        status = self._normalize_text_field(
            value,
            code="invalid_user_status",
            message="User status is not supported.",
        ).lower()
        if status not in {USER_STATUS_ACTIVE, USER_STATUS_BANNED}:
            raise BackendError("invalid_user_status", "User status is not supported.", status=400)
        return status

    def _normalize_image_url(self, value: object) -> str:
        image_url = self._normalize_text_field(
            value,
            code="invalid_image_url",
            message="Image URL must be a local path or URL within 300 characters.",
            allow_missing=True,
        )
        if len(image_url) > 300:
            raise BackendError("invalid_image_url", "Image URL must be a local path or URL within 300 characters.", status=400)
        if image_url and not self._is_allowed_image_url(image_url):
            raise BackendError("invalid_image_url", "Image URL must be a local path or URL within 300 characters.", status=400)
        return image_url

    def _is_allowed_image_url(self, image_url: str) -> bool:
        if self._has_unsafe_image_url_chars(image_url):
            return False
        if image_url.startswith("/"):
            return not image_url.startswith("//") and not self._has_unsafe_image_url_chars(unquote(image_url))
        parsed = urlparse(image_url)
        if parsed.scheme not in {"http", "https"} or not self._is_loopback_image_host(parsed.hostname):
            return False
        if self._has_unsafe_image_url_chars(unquote(parsed.netloc)):
            return False
        try:
            parsed.port
        except ValueError:
            return False
        resource = f"{parsed.path}?{parsed.query}#{parsed.fragment}"
        if self._has_unsafe_image_url_chars(unquote(resource)):
            return False
        return bool(parsed.netloc)

    def _safe_payload_image_url(self, image_url: str) -> str:
        if not image_url:
            return ""
        return image_url if self._is_allowed_image_url(image_url) else ""

    def _has_unsafe_image_url_chars(self, value: str) -> bool:
        return any(ord(char) < 32 or ord(char) == 127 or char in UNSAFE_IMAGE_URL_CHARS for char in value)

    def _is_loopback_image_host(self, hostname: str | None) -> bool:
        if not hostname:
            return False
        host = hostname.rstrip(".").lower()
        if host == "localhost":
            return True
        try:
            return ip_address(host).is_loopback
        except ValueError:
            return False
