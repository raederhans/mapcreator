"""Runtime political topology stage owner for init_map_data.

The init_map_data entry point remains a thin compatibility wrapper; this module
owns the subprocess, cache, timing, and candidate-promotion sequence.
"""
from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path
from typing import Callable


ComputeStageSignature = Callable[..., str]
ShouldSkipStage = Callable[..., bool]
UpdateStageCache = Callable[..., None]
RecordStageTiming = Callable[..., None]
ReadOptionalJson = Callable[[Path | None], dict | None]


def run_runtime_political_topology(
    script_dir: Path,
    output_dir: Path,
    *,
    stage_timings: dict[str, dict] | None = None,
    build_stage_cache: dict[str, dict] | None = None,
    timings_root: Path | None = None,
    project_root: Path,
    init_map_data_path: Path,
    compute_stage_signature_func: ComputeStageSignature,
    should_skip_stage_func: ShouldSkipStage,
    update_stage_cache_func: UpdateStageCache,
    record_stage_timing_func: RecordStageTiming,
    read_optional_json_func: ReadOptionalJson,
    candidate_topology_path_func: Callable[[Path], Path],
    promote_candidate_topology_if_safe_func: Callable[..., None],
) -> None:
    stage_name = "runtime_political_topology"
    stage_start = time.perf_counter()
    primary_topology = output_dir / "europe_topology.json"
    detail_topology = output_dir / "europe_topology.na_v2.json"
    runtime_script = script_dir / "tools" / "build_runtime_political_topology.py"

    if not primary_topology.exists():
        print("[Runtime Political] Skipped: primary topology not found.")
        if stage_timings is not None:
            record_stage_timing_func(stage_timings, stage_name, stage_start, skipped=True, reason="missing-primary")
        return
    if not runtime_script.exists():
        print(f"[Runtime Political] Skipped: script missing at {runtime_script}.")
        if stage_timings is not None:
            record_stage_timing_func(stage_timings, stage_name, stage_start, skipped=True, reason="missing-script")
        return

    output_path = output_dir / "europe_topology.runtime_political_v1.json"
    candidate_path = candidate_topology_path_func(output_path)
    ru_overrides_path = output_dir / "ru_city_overrides.geojson"
    signature = compute_stage_signature_func(
        stage_name=stage_name,
        inputs=[
            init_map_data_path,
            runtime_script,
            primary_topology,
            detail_topology,
            ru_overrides_path,
            project_root / "map_builder" / "config.py",
            project_root / "map_builder" / "geo" / "local_canonicalization.py",
            project_root / "map_builder" / "processors" / "detail_shell_coverage.py",
        ],
        extra={"output": str(output_path)},
    )
    if build_stage_cache is not None and should_skip_stage_func(
        cache_payload=build_stage_cache,
        stage_name=stage_name,
        signature=signature,
        outputs=[output_path],
    ):
        print("[Runtime Political] Skipped: cache hit.")
        if stage_timings is not None:
            record_stage_timing_func(stage_timings, stage_name, stage_start, skipped=True, cache_hit=True)
        return

    child_timings_path = timings_root / f"{stage_name}.json" if timings_root is not None else None
    cmd = [
        sys.executable,
        str(runtime_script),
        "--primary-topology",
        str(primary_topology),
        "--detail-topology",
        str(detail_topology),
        "--ru-overrides",
        str(ru_overrides_path),
        "--output-topology",
        str(candidate_path),
    ]
    if child_timings_path is not None:
        child_timings_path.parent.mkdir(parents=True, exist_ok=True)
        cmd.extend(["--timings-json", str(child_timings_path)])
    print("[Runtime Political] Building unified runtime political topology...")
    try:
        subprocess.check_call(cmd, cwd=script_dir)
    except subprocess.CalledProcessError as exc:
        print(f"[Runtime Political] Failed to build unified runtime topology: {exc}")
        if stage_timings is not None:
            record_stage_timing_func(stage_timings, stage_name, stage_start, failed=True)
        return
    try:
        promote_candidate_topology_if_safe_func(
            stage_label="Runtime Political",
            primary_topology_path=primary_topology,
            candidate_path=candidate_path,
            output_path=output_path,
            detail_topology_path=detail_topology,
            override_path=ru_overrides_path,
        )
    except BaseException:
        if stage_timings is not None:
            record_stage_timing_func(stage_timings, stage_name, stage_start, failed=True, gate_failed=True)
        raise
    if build_stage_cache is not None:
        update_stage_cache_func(
            cache_payload=build_stage_cache,
            stage_name=stage_name,
            signature=signature,
            outputs=[output_path],
        )
    if stage_timings is not None:
        record_stage_timing_func(
            stage_timings,
            stage_name,
            stage_start,
            skipped=False,
            child_timings=read_optional_json_func(child_timings_path),
        )
