#!/usr/bin/env python3
"""Validate that checked-in data/CATALOG artifacts match live inputs."""
from __future__ import annotations

import json
from pathlib import Path
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from tools.build_data_catalog import (
    CATALOG_MD_PATH,
    CATALOG_PATH,
    build_catalog_markdown,
    build_catalog_payload,
)


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def summarize_empty_hash_refs(entries: list[dict]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        if "hashRef" not in entry:
            continue
        if str(entry.get("hashRef") or "").strip():
            continue
        role = str(entry.get("role") or "<missing-role>").strip() or "<missing-role>"
        counts[role] = counts.get(role, 0) + 1
    return dict(sorted(counts.items()))


def main() -> None:
    if not CATALOG_PATH.exists():
        raise SystemExit(f"Missing catalog JSON: {CATALOG_PATH}")
    if not CATALOG_MD_PATH.exists():
        raise SystemExit(f"Missing catalog Markdown: {CATALOG_MD_PATH}")

    checked_in_payload = json.loads(_read_text(CATALOG_PATH))
    expected_payload = build_catalog_payload()
    checked_in_markdown = _read_text(CATALOG_MD_PATH)
    expected_markdown = build_catalog_markdown(expected_payload)

    failures: list[str] = []
    if checked_in_payload != expected_payload:
        failures.append("data/CATALOG.json is stale. Run `python tools/build_data_catalog.py`.")
    if checked_in_markdown != expected_markdown:
        failures.append("data/CATALOG.md is stale. Run `python tools/build_data_catalog.py`.")

    entries = checked_in_payload.get("entries")
    if not isinstance(entries, list) or not entries:
        failures.append("data/CATALOG.json must contain a non-empty `entries` list.")
    else:
        seen_keys: set[str] = set()
        seen_urls: set[str] = set()
        for entry in entries:
            if not isinstance(entry, dict):
                failures.append("Every catalog entry must be a JSON object.")
                continue
            missing = [
                field for field in (
                    "key",
                    "url",
                    "role",
                    "format",
                    "schemaRef",
                    "hashRef",
                    "owner",
                    "cachePolicy",
                    "sourceId",
                )
                if field not in entry
            ]
            if missing:
                failures.append(f"Catalog entry `{entry}` is missing fields: {missing}")
                continue
            key = str(entry.get("key") or "").strip()
            url = str(entry.get("url") or "").strip()
            if not key:
                failures.append("Catalog entry key must be non-empty.")
            if not url:
                failures.append(f"Catalog entry `{key or '<empty>'}` url must be non-empty.")
            if key in seen_keys:
                failures.append(f"Duplicate catalog key: {key}")
            if url in seen_urls:
                failures.append(f"Duplicate catalog url: {url}")
            seen_keys.add(key)
            seen_urls.add(url)

    if failures:
        for failure in failures:
            print(failure, file=sys.stderr)
        raise SystemExit(1)

    empty_hash_ref_counts = summarize_empty_hash_refs(entries)
    if empty_hash_ref_counts:
        counts_text = ", ".join(f"{role}={count}" for role, count in empty_hash_ref_counts.items())
        print(f"[data-catalog] WARNING: empty hashRef coverage by role: {counts_text}")

    print(f"[data-catalog] OK: {len(entries)} entries validated.")


if __name__ == "__main__":
    main()
