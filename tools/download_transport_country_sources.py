#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
import time
import argparse
import hashlib
from pathlib import Path

import requests

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from map_builder.transport_country_real_source_contracts import COUNTRY_SOURCE_SPECS, DEFAULT_SOURCE_CACHE_ROOT

HEADERS = {
    "User-Agent": "Mozilla/5.0 transport-country-source-cache/1.0",
    "Accept-Encoding": "identity",
}
OVERPASS_HEADERS = {"User-Agent": "transport-workbench-source-cache/1.0"}
MAX_WFS_PAGES = 10000


def content_range_total(header: str | None) -> int:
    if not header:
        return 0
    match = re.search(r"/(\d+)\s*$", header)
    return int(match.group(1)) if match else 0


def download(url: str, path: Path, *, timeout: int = 120) -> dict:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.stat().st_size > 0:
        return {"status": "cached", "path": path.as_posix(), "size_bytes": path.stat().st_size}
    tmp = path.with_suffix(path.suffix + ".part")
    resume_size = tmp.stat().st_size if tmp.exists() else 0
    request_headers = dict(HEADERS)
    if resume_size > 0:
        request_headers["Range"] = f"bytes={resume_size}-"
    with requests.get(url, headers=request_headers, stream=True, timeout=(30, timeout), allow_redirects=True) as response:
        if resume_size > 0 and response.status_code == 416:
            total = content_range_total(response.headers.get("Content-Range"))
            if total == resume_size:
                tmp.replace(path)
                return {"status": "downloaded", "path": path.as_posix(), "size_bytes": path.stat().st_size}
            raise requests.RequestException(f"Range resume rejected at {resume_size} bytes")
        response.raise_for_status()
        append_mode = resume_size > 0 and response.status_code == 206
        if resume_size > 0 and not append_mode:
            print(f"[download] {path.name}: server ignored resume; restarting from byte 0", flush=True)
            tmp.unlink(missing_ok=True)
            resume_size = 0
        length = int(response.headers.get("content-length") or 0)
        range_total = content_range_total(response.headers.get("Content-Range"))
        total = range_total or ((resume_size + length) if append_mode and length else length)
        done = resume_size
        last = time.monotonic()
        with tmp.open("ab" if append_mode else "wb") as handle:
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
    actual = tmp.stat().st_size
    if total and actual != total:
        raise OSError(f"Download size mismatch for {path.name}: expected {total}, got {actual}")
    tmp.replace(path)
    return {"status": "downloaded", "path": path.as_posix(), "size_bytes": path.stat().st_size}


def download_arcgis_geojson(url: str, path: Path, query_params: dict[str, str], *, timeout: int = 120) -> dict:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.stat().st_size > 0:
        return {"status": "cached", "path": path.as_posix(), "size_bytes": path.stat().st_size}
    page_size = int(query_params.get("resultRecordCount") or 2000)
    count_params = {
        "where": query_params.get("where", "1=1"),
        "returnGeometry": "false",
        "returnCountOnly": "true",
        "f": "json",
    }
    with requests.get(f"{url.rstrip('/')}/query", headers=HEADERS, params=count_params, timeout=(30, timeout), allow_redirects=True) as response:
        response.raise_for_status()
        count_payload = response.json()
    expected_count = int(count_payload.get("count") or 0)
    all_features: list[dict] = []
    properties: dict = {}
    offset = 0
    while True:
        params = {**query_params, "resultOffset": str(offset), "resultRecordCount": str(page_size)}
        with requests.get(f"{url.rstrip('/')}/query", headers=HEADERS, params=params, timeout=(30, timeout), allow_redirects=True) as response:
            response.raise_for_status()
            payload = response.json()
        features = payload.get("features") or []
        if not features:
            break
        all_features.extend(features)
        if not properties:
            properties = payload.get("properties") or {}
        print(f"[download] {path.name}: {len(all_features)} ArcGIS features", flush=True)
        if expected_count and len(all_features) >= expected_count:
            break
        if not expected_count and len(features) < page_size:
            break
        offset += len(features)
    if not all_features:
        raise RuntimeError(f"ArcGIS query returned no features for {url}")
    if expected_count and len(all_features) != expected_count:
        raise RuntimeError(f"ArcGIS query returned {len(all_features)} features for {url}; expected {expected_count}")
    output = {"type": "FeatureCollection", "properties": properties, "features": all_features}
    tmp = path.with_suffix(path.suffix + ".part")
    tmp.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    tmp.replace(path)
    return {"status": "downloaded", "path": path.as_posix(), "size_bytes": path.stat().st_size, "feature_count": len(all_features)}


def download_wfs_geojson(url: str, path: Path, query_params: dict[str, str], *, timeout: int = 120) -> dict:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.stat().st_size > 0:
        return {"status": "cached", "path": path.as_posix(), "size_bytes": path.stat().st_size}
    page_size = int(query_params.get("COUNT") or query_params.get("count") or 5000)
    all_features: list[dict] = []
    properties: dict = {}
    page_signatures: set[str] = set()
    start_index = 0
    expected_count = 0
    pages = 0
    while True:
        pages += 1
        if pages > MAX_WFS_PAGES:
            raise RuntimeError(f"WFS query exceeded {MAX_WFS_PAGES} pages for {url}")
        params = {**query_params, "STARTINDEX": str(start_index), "COUNT": str(page_size)}
        with requests.get(url, headers=HEADERS, params=params, timeout=(30, timeout), allow_redirects=True) as response:
            response.raise_for_status()
            payload = response.json()
        features = payload.get("features") or []
        if not properties:
            properties = {key: payload.get(key) for key in ("numberMatched", "timeStamp", "crs") if key in payload}
        if not expected_count:
            try:
                expected_count = int(payload.get("numberMatched") or payload.get("totalFeatures") or 0)
            except (TypeError, ValueError):
                expected_count = 0
        if not features:
            break
        page_signature = hashlib.sha256(json.dumps(features, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()
        if page_signature in page_signatures:
            raise RuntimeError(f"WFS query repeated a page at STARTINDEX={start_index} for {url}")
        page_signatures.add(page_signature)
        all_features.extend(features)
        print(f"[download] {path.name}: {len(all_features)} WFS features", flush=True)
        if expected_count and len(all_features) >= expected_count:
            break
        if len(features) < page_size and not expected_count:
            break
        start_index += len(features)
    if not all_features:
        raise RuntimeError(f"WFS query returned no features for {url}")
    if expected_count and len(all_features) != expected_count:
        raise RuntimeError(f"WFS query returned {len(all_features)} features for {url}; expected {expected_count}")
    output = {"type": "FeatureCollection", "properties": properties, "features": all_features}
    tmp = path.with_suffix(path.suffix + ".part")
    tmp.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    tmp.replace(path)
    return {"status": "downloaded", "path": path.as_posix(), "size_bytes": path.stat().st_size, "feature_count": len(all_features)}


def download_overpass_json(url: str, path: Path, query_params: dict[str, str], *, timeout: int = 180) -> dict:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.stat().st_size > 0:
        return {"status": "cached", "path": path.as_posix(), "size_bytes": path.stat().st_size}
    query = query_params.get("data", "").strip()
    if not query:
        raise RuntimeError(f"Overpass query source for {path.name} is missing query_params['data']")
    with requests.post(url, headers=OVERPASS_HEADERS, data={"data": query}, timeout=(30, timeout), allow_redirects=True) as response:
        response.raise_for_status()
        payload = response.json()
    if str(payload.get("remark") or "").strip():
        raise RuntimeError(f"Overpass query returned remark for {url}: {payload.get('remark')}")
    elements = payload.get("elements") or []
    if not elements:
        raise RuntimeError(f"Overpass query returned no elements for {url}")
    tmp = path.with_suffix(path.suffix + ".part")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    tmp.replace(path)
    return {"status": "downloaded", "path": path.as_posix(), "size_bytes": path.stat().st_size, "element_count": len(elements)}


def main() -> int:
    parser = argparse.ArgumentParser(description="Download real-source transport country pack inputs.")
    parser.add_argument("--pack", action="append", choices=tuple(COUNTRY_SOURCE_SPECS), help="Pack id to download. Repeatable.")
    args = parser.parse_args()
    results = []
    specs = [COUNTRY_SOURCE_SPECS[pack_id] for pack_id in args.pack] if args.pack else list(COUNTRY_SOURCE_SPECS.values())
    for spec in specs:
        for source in spec.sources:
            path = DEFAULT_SOURCE_CACHE_ROOT / spec.cache_subdir / source.filename
            print(f"[download] {spec.pack_id}/{source.id} -> {path}", flush=True)
            try:
                if source.role == "wfs_feature_collection":
                    result = download_wfs_geojson(source.url, path, source.query_params)
                elif source.role == "overpass_json_query":
                    result = download_overpass_json(source.url, path, source.query_params)
                elif source.query_params:
                    result = download_arcgis_geojson(source.url, path, source.query_params)
                else:
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
