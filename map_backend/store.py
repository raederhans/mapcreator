from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sqlite3


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_iso(value: datetime | None = None) -> str:
    return (value or utc_now()).isoformat()


class BackendStore:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.db_path = root / ".runtime" / "backend" / "mapcreator_backend.sqlite"

    @contextmanager
    def connect(self):
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA journal_mode = WAL")
        self._ensure_schema(connection)
        try:
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def _ensure_schema(self, connection: sqlite3.Connection) -> None:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              username TEXT NOT NULL UNIQUE,
              display_name TEXT NOT NULL,
              password_hash TEXT NOT NULL,
              role TEXT NOT NULL DEFAULT 'member',
              status TEXT NOT NULL DEFAULT 'active',
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sessions (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              csrf_token TEXT NOT NULL,
              created_at TEXT NOT NULL,
              expires_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS saves (
              id TEXT PRIMARY KEY,
              owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              title TEXT NOT NULL,
              description TEXT NOT NULL DEFAULT '',
              project_hash TEXT NOT NULL,
              visibility TEXT NOT NULL DEFAULT 'private',
              comments_enabled INTEGER NOT NULL DEFAULT 1,
              image_url TEXT NOT NULL DEFAULT '',
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              published_at TEXT
            );

            CREATE TABLE IF NOT EXISTS comments (
              id TEXT PRIMARY KEY,
              save_id TEXT NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
              user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              body TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'visible',
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS reports (
              id TEXT PRIMARY KEY,
              save_id TEXT NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
              reporter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              reason TEXT NOT NULL,
              details TEXT NOT NULL DEFAULT '',
              status TEXT NOT NULL DEFAULT 'open',
              created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
            CREATE INDEX IF NOT EXISTS idx_saves_owner ON saves(owner_user_id);
            CREATE INDEX IF NOT EXISTS idx_saves_visibility ON saves(visibility, published_at);
            CREATE INDEX IF NOT EXISTS idx_comments_save ON comments(save_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_reports_save ON reports(save_id, status);
            """
        )
        self._ensure_column(
            connection,
            "users",
            "role",
            "TEXT NOT NULL DEFAULT 'member'",
        )
        self._ensure_column(
            connection,
            "users",
            "status",
            "TEXT NOT NULL DEFAULT 'active'",
        )
        self._ensure_column(
            connection,
            "saves",
            "comments_enabled",
            "INTEGER NOT NULL DEFAULT 1",
        )
        self._ensure_column(
            connection,
            "saves",
            "image_url",
            "TEXT NOT NULL DEFAULT ''",
        )
        self._ensure_first_user_admin(connection)

    def session_expiry(self) -> str:
        return utc_iso(utc_now() + timedelta(days=7))

    def _ensure_column(
        self,
        connection: sqlite3.Connection,
        table: str,
        column: str,
        definition: str,
    ) -> None:
        columns = {
            str(row["name"])
            for row in connection.execute(f"PRAGMA table_info({table})").fetchall()
        }
        if column not in columns:
            connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")

    def _ensure_first_user_admin(self, connection: sqlite3.Connection) -> None:
        admin_count = connection.execute(
            "SELECT COUNT(*) AS count FROM users WHERE role = 'admin'"
        ).fetchone()["count"]
        if admin_count:
            return
        first_user = connection.execute(
            "SELECT id FROM users ORDER BY created_at ASC LIMIT 1"
        ).fetchone()
        if first_user is not None:
            connection.execute("UPDATE users SET role = 'admin' WHERE id = ?", (first_user["id"],))
