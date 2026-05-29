from __future__ import annotations

import json
from pathlib import Path

from map_builder.io.writers import write_text_atomic


class ProjectStorage:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.base_dir = root / ".runtime" / "backend" / "saves"

    def _project_path(self, save_id: str) -> Path:
        safe_id = "".join(ch for ch in save_id if ch.isalnum() or ch in {"-", "_"})
        if safe_id != save_id or not safe_id:
            raise ValueError("invalid save id")
        return self.base_dir / f"{safe_id}.json"

    def write_project(self, save_id: str, payload: dict[str, object]) -> None:
        self.base_dir.mkdir(parents=True, exist_ok=True)
        text = f"{json.dumps(payload, ensure_ascii=False, indent=2)}\n"
        write_text_atomic(self._project_path(save_id), text, encoding="utf-8")

    def read_project(self, save_id: str) -> dict[str, object]:
        path = self._project_path(save_id)
        payload = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("stored project payload must be a JSON object")
        return payload
