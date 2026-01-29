"""Network fetch + cache helpers for map pipeline."""
from __future__ import annotations

import json
import tempfile
import zipfile
from pathlib import Path
from typing import Iterable

import geopandas as gpd
import requests

from map_builder import config as cfg


def get_headers() -> dict:
    return {"User-Agent": "MapCreator/1.0"}


def _build_mirror_urls(url: str) -> list[str]:
    mirrors: list[str] = []
    if "raw.githubusercontent.com" in url:
        mirrors.append(f"https://mirror.ghproxy.com/{url}")
        raw_path = url.replace("https://raw.githubusercontent.com/", "")
        parts = raw_path.split("/", 3)
        if len(parts) == 4:
            user, repo, branch, path = parts
            mirrors.append(f"https://cdn.jsdelivr.net/gh/{user}/{repo}@{branch}/{path}")
    elif "github.com" in url and "/raw/" in url:
        mirrors.append(f"https://mirror.ghproxy.com/{url}")
        gh_path = url.replace("https://github.com/", "")
        parts = gh_path.split("/", 4)
        if len(parts) >= 5 and parts[2] == "raw":
            user, repo, _, branch, path = parts[0], parts[1], parts[2], parts[3], parts[4]
            mirrors.append(f"https://raw.githubusercontent.com/{user}/{repo}/{branch}/{path}")
            mirrors.append(f"https://cdn.jsdelivr.net/gh/{user}/{repo}@{branch}/{path}")
    return mirrors


def fetch_ne_zip(url: str, label: str) -> gpd.GeoDataFrame:
    print(f"Downloading Natural Earth {label}...")
    try:
        response = requests.get(url, timeout=(10, 120), headers=get_headers())
        response.raise_for_status()
    except requests.RequestException as exc:
        print(f"{label} download failed: {exc}")
        raise SystemExit(1) from exc

    with tempfile.TemporaryDirectory() as temp_dir:
        zip_path = Path(temp_dir) / f"{label}.zip"
        zip_path.write_bytes(response.content)
        try:
            with zipfile.ZipFile(zip_path) as zf:
                zf.extractall(temp_dir)
        except zipfile.BadZipFile as exc:
            print(f"Failed to read {label} ZIP archive.")
            raise SystemExit(1) from exc

        print(f"Reading {label} dataset...")
        gdf = gpd.read_file(temp_dir)

    if gdf.empty:
        print(f"{label} GeoDataFrame is empty. Check the download.")
        raise SystemExit(1)
    return gdf


def _cache_path(filename: str) -> Path:
    cache_dir = Path(__file__).resolve().parents[2] / "data"
    cache_dir.mkdir(parents=True, exist_ok=True)
    return cache_dir / filename


def fetch_or_load_geojson(url: str, filename: str, fallback_urls: list[str] | None = None) -> gpd.GeoDataFrame:
    cache_path = _cache_path(filename)

    if cache_path.exists():
        print(f"   [Cache] Loading {filename} from local file...")
        try:
            return gpd.read_file(cache_path)
        except Exception as exc:
            print(f"Failed to read cached {filename}: {exc}")
            raise SystemExit(1) from exc

    print(f"   [Download] Fetching {filename} from remote...")
    sources = [url]
    if fallback_urls:
        sources.extend(fallback_urls)
    for source in list(sources):
        sources.extend(_build_mirror_urls(source))

    seen = set()
    unique_sources = []
    for source in sources:
        if source in seen:
            continue
        seen.add(source)
        unique_sources.append(source)

    def download_with_retries(source: str, attempts: int = 3) -> bool:
        for attempt in range(1, attempts + 1):
            try:
                response = requests.get(
                    source,
                    timeout=(10, 60),
                    headers=get_headers(),
                )
                response.raise_for_status()
                content = response.content
                try:
                    json.loads(content.decode("utf-8"))
                except Exception as exc:
                    print(f"[ERROR] Downloaded data is not valid JSON: {exc}")
                    continue
                cache_path.write_bytes(content)
                return True
            except requests.RequestException as exc:
                print(f"   [Download] {source} attempt {attempt}/{attempts} failed: {exc}")
        return False

    downloaded = False
    for source in unique_sources:
        if download_with_retries(source):
            downloaded = True
            break

    if not downloaded:
        print(f"Failed to download {filename} from all sources.")
        raise SystemExit(1)

    try:
        return gpd.read_file(cache_path)
    except Exception as exc:
        print(f"Failed to read downloaded {filename}: {exc}")
        raise SystemExit(1) from exc
