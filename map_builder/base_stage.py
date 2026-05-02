"""Shared base-stage helpers for init_map_data orchestration.

This owner keeps stage timing and cache bookkeeping independent from the
business-heavy geodata builders. Callers pass JSON readers/writers so palettes
mode can keep its lightweight import path.
"""
from __future__ import annotations

import hashlib
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Iterable

try:
    import resource
except Exception:  # pragma: no cover - unavailable on some platforms
    resource = None


BUILD_STAGE_CACHE_FILENAME = ".build_stage_cache.json"

JsonOptionalReader = Callable[[Path | None], object]
JsonWriter = Callable[[Path, object], None]


def get_peak_memory_mb() -> float | None:
    if resource is None:
        return None
    try:
        usage = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    except Exception:
        return None
    if sys.platform == "darwin":
        return round(float(usage) / (1024 * 1024), 2)
    return round(float(usage) / 1024, 2)


def record_stage_timing(
    timings: dict[str, dict],
    stage_name: str,
    start_time: float,
    **extra: object,
) -> None:
    payload = {
        "wall_time_sec": round(time.perf_counter() - start_time, 3),
        "peak_memory_mb": get_peak_memory_mb(),
    }
    payload.update(extra)
    timings[stage_name] = payload


def write_timings_json(
    path: Path | None,
    timings: dict[str, dict],
    *,
    write_json_atomic_func: JsonWriter,
) -> None:
    if path is None:
        return
    write_json_atomic_func(path, timings)


def describe_path_state(path: Path) -> dict[str, object]:
    if not path.exists():
        return {
            "path": str(path),
            "exists": False,
        }
    stat = path.stat()
    return {
        "path": str(path),
        "exists": True,
        "size": int(stat.st_size),
        "mtime_ns": int(stat.st_mtime_ns),
    }


def load_build_stage_cache(
    output_dir: Path,
    *,
    read_json_optional_func: JsonOptionalReader,
    filename: str = BUILD_STAGE_CACHE_FILENAME,
) -> dict[str, dict]:
    cache_path = output_dir / filename
    payload = read_json_optional_func(cache_path)
    return payload if isinstance(payload, dict) else {}


def write_build_stage_cache(
    output_dir: Path,
    cache_payload: dict[str, dict],
    *,
    write_json_atomic_func: JsonWriter,
    filename: str = BUILD_STAGE_CACHE_FILENAME,
) -> None:
    cache_path = output_dir / filename
    write_json_atomic_func(cache_path, cache_payload)


def compute_stage_signature(
    *,
    stage_name: str,
    inputs: Iterable[Path] = (),
    extra: dict[str, object] | None = None,
) -> str:
    payload = {
        "stage": stage_name,
        "inputs": [describe_path_state(Path(path)) for path in inputs],
        "extra": extra or {},
    }
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
    ).hexdigest()


def should_skip_stage(
    *,
    cache_payload: dict[str, dict],
    stage_name: str,
    signature: str,
    outputs: Iterable[Path],
) -> bool:
    record = cache_payload.get(stage_name)
    output_paths = [Path(path) for path in outputs]
    if not output_paths or any(not path.exists() for path in output_paths):
        return False
    return isinstance(record, dict) and record.get("signature") == signature


def update_stage_cache(
    *,
    cache_payload: dict[str, dict],
    stage_name: str,
    signature: str,
    outputs: Iterable[Path],
) -> None:
    cache_payload[stage_name] = {
        "signature": signature,
        "outputs": [describe_path_state(Path(path)) for path in outputs],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
