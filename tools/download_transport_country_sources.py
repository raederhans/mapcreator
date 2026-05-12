#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

import requests

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from map_builder.transport_country_real_source_contracts import COUNTRY_SOURCE_SPECS, DEFAULT_SOURCE_CACHE_ROOT

HEADERS = {"User-Agent": "Mozilla/5.0 transport-country-source-cache/1.0"}


def download(url: str, path: Path, *, timeout: int = 120) -> dict:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.stat().st_size > 0:
        return {"status": "cached", "path": path.as_posix(), "size_bytes": path.stat().st_size}
    tmp = path.with_suffix(path.suffix + ".part")
    with requests.get(url, headers=HEADERS, stream=True, timeout=(30, timeout), allow_redirects=True) as response:
        response.raise_for_status()
        total = int(response.headers.get("content-length") or 0)
        done = 0
        last = time.monotonic()
        with tmp.open("wb") as handle:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if not chunk:
                    continue
                handle.write(chunk)
                done += len(chunk)
                now = time.monotonic()
                if now - last >= 10:
                    suffix = f"/{total}" if total else ""
                    print(f"[download] {path.name}: {done}{suffix} bytes", flush=True)
                    last = now
    tmp.replace(path)
    return {"status": "downloaded", "path": path.as_posix(), "size_bytes": path.stat().st_size}


def main() -> int:
    results = []
    for spec in COUNTRY_SOURCE_SPECS.values():
        for source in spec.sources:
            path = DEFAULT_SOURCE_CACHE_ROOT / spec.cache_subdir / source.filename
            print(f"[download] {spec.pack_id}/{source.id} -> {path}", flush=True)
            try:
                result = download(source.url, path)
            except Exception as exc:
                result = {"status": "failed", "path": path.as_posix(), "url": source.url, "error": repr(exc)}
                print(f"[download] FAILED {spec.pack_id}/{source.id}: {exc!r}", flush=True)
            results.append({"pack_id": spec.pack_id, "source_id": source.id, **result})
    report_path = PROJECT_ROOT / ".runtime" / "reports" / "generated" / "transport-country-source-downloads.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    failed = [r for r in results if r.get("status") == "failed"]
    print(f"[download] complete: {len(results)-len(failed)} ok, {len(failed)} failed; report={report_path}", flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
