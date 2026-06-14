from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def source_marker_from_signature(signature: dict[str, Any], *, key: str) -> dict[str, Any]:
    return {
        key: {
            "path": signature["path"],
            "size_bytes": signature["size_bytes"],
            "sha256": signature["sha256"],
        }
    }


def read_marker(marker_path: Path) -> dict[str, Any]:
    if not marker_path.exists():
        return {}
    try:
        return json.loads(marker_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def marker_matches(marker_path: Path, expected_marker: dict[str, Any]) -> bool:
    return read_marker(marker_path) == expected_marker


def write_marker(marker_path: Path, marker: dict[str, Any]) -> None:
    marker_path.parent.mkdir(parents=True, exist_ok=True)
    marker_path.write_text(json.dumps(marker, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
