#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from map_builder.contracts import sha256_path
from map_builder.io.writers import write_json_atomic
from scenario_builder.hgo.compiler import compile_hgo_scenario, is_hgo_system_owner
from tools import check_scenario_contracts

DEFAULT_SEED = PROJECT_ROOT / "data" / "hgo_runtime" / "seed.json"
DEFAULT_PROVINCES_BMP = PROJECT_ROOT / "data" / "hgo_runtime" / "provinces.bmp"
DEFAULT_SCENARIO_ID = "hgo_1936"
DEFAULT_DISPLAY_NAME = "HGO 1936"
DEFAULT_REPORT_DIR = PROJECT_ROOT / ".runtime" / "reports" / "generated" / DEFAULT_SCENARIO_ID


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build the checked-in HGO vector scenario bundle.")
    parser.add_argument("--seed", default=str(DEFAULT_SEED))
    parser.add_argument("--provinces-bmp", default=str(DEFAULT_PROVINCES_BMP))
    parser.add_argument("--scenario-id", default=DEFAULT_SCENARIO_ID)
    parser.add_argument("--display-name", default=DEFAULT_DISPLAY_NAME)
    parser.add_argument("--scenario-output-dir", default="")
    parser.add_argument("--report-dir", default=str(DEFAULT_REPORT_DIR))
    return parser.parse_args()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: object) -> None:
    write_json_atomic(path, payload, ensure_ascii=False, indent=2, allow_nan=False, trailing_newline=True)


def _empty_special_zone_layers() -> dict[str, Any]:
    return {
        "version": 1,
        "layers": [],
        "activeLayerId": "",
        "topologyFingerprint": "",
        "diagnostics": [],
    }


def _city_overrides(compiled: dict[str, Any], scenario_id: str) -> dict[str, Any]:
    countries = compiled.get("countries", {}).get("countries", {})
    manifest = compiled.get("manifest") if isinstance(compiled.get("manifest"), dict) else {}
    featured_tags = manifest.get("featured_tags") if isinstance(manifest.get("featured_tags"), list) else []
    capital_city_hints = {}
    for tag in featured_tags:
        normalized_tag = str(tag or "").strip().upper()
        country = countries.get(normalized_tag, {}) if isinstance(countries.get(normalized_tag), dict) else {}
        if not normalized_tag or is_hgo_system_owner(normalized_tag, country):
            continue
        capital_city_hints[normalized_tag] = {
            "tag": normalized_tag,
            "label": str(country.get("display_name") or normalized_tag),
            "source": "hgo_country_without_capital_city_source",
        }
    return {
        "version": 1,
        "scenario_id": scenario_id,
        "capitals_by_tag": {},
        "capital_city_hints": capital_city_hints,
    }


def _capital_hints(_compiled: dict[str, Any], scenario_id: str) -> dict[str, Any]:
    return {
        "version": 1,
        "scenario_id": scenario_id,
        "entries": [],
    }


def _update_scenario_index(index_path: Path, *, scenario_id: str, display_name: str) -> None:
    registry = load_json(index_path) if index_path.exists() else {
        "version": 1,
        "default_scenario_id": "tno_1962",
        "scenarios": [],
    }
    scenarios = registry.get("scenarios") if isinstance(registry.get("scenarios"), list) else []
    next_entry = {
        "scenario_id": scenario_id,
        "display_name": display_name,
        "manifest_url": f"data/scenarios/{scenario_id}/manifest.json",
        "audit_url": f"data/scenarios/{scenario_id}/audit.json",
    }
    merged = [entry for entry in scenarios if not isinstance(entry, dict) or entry.get("scenario_id") != scenario_id]
    merged.append(next_entry)
    registry["scenarios"] = sorted(
        merged,
        key=lambda entry: str(entry.get("scenario_id") or "") if isinstance(entry, dict) else "",
    )
    write_json(index_path, registry)


def _display_path(path: Path) -> str:
    try:
        return str(path.relative_to(PROJECT_ROOT))
    except ValueError:
        return str(path)


def build_hgo_scenario(
    *,
    seed_path: Path,
    provinces_bmp_path: Path,
    scenario_id: str,
    display_name: str,
    scenario_output_dir: Path,
    report_dir: Path,
    update_index: bool = True,
) -> dict[str, Any]:
    seed = load_json(seed_path)
    compiled = compile_hgo_scenario(
        seed=seed,
        provinces_bmp_path=provinces_bmp_path,
        scenario_id=scenario_id,
        display_name=display_name,
    )
    scenario_output_dir.mkdir(parents=True, exist_ok=True)
    generated_at = datetime.now(timezone.utc).isoformat()
    compiled["manifest"]["generated_at"] = generated_at
    for key in ("countries", "owners", "controllers", "cores", "audit"):
        compiled[key]["generated_at"] = generated_at

    artifact_payloads = {
        "runtime_topology.topo.json": compiled["runtime_topology"],
        "countries.json": compiled["countries"],
        "owners.by_feature.json": compiled["owners"],
        "cores.by_feature.json": compiled["cores"],
        "special_zone_layers.json": _empty_special_zone_layers(),
        "city_overrides.json": _city_overrides(compiled, scenario_id),
        "capital_hints.json": _capital_hints(compiled, scenario_id),
    }
    for filename, payload in artifact_payloads.items():
        write_json(scenario_output_dir / filename, payload)

    manifest = compiled["manifest"]
    manifest["source"] = {
        "hgo_seed_sha256": sha256_path(seed_path),
        "hgo_provinces_bmp_sha256": sha256_path(provinces_bmp_path),
        "base_topology_sha256": sha256_path(PROJECT_ROOT / "data" / "europe_topology.json"),
        "runtime_topology_sha256": sha256_path(scenario_output_dir / "runtime_topology.topo.json"),
    }
    write_json(scenario_output_dir / "manifest.json", manifest)

    snapshot_payload = check_scenario_contracts._build_snapshot_for_scenario(scenario_output_dir, manifest)
    manifest["snapshot_fingerprint"] = snapshot_payload["snapshot_fingerprint"]
    write_json(scenario_output_dir / "manifest.json", manifest)
    audit_payload = check_scenario_contracts._refresh_audit_payload(
        scenario_output_dir,
        manifest,
        snapshot_payload=snapshot_payload,
    )

    (scenario_output_dir / "controllers.by_feature.json").unlink(missing_ok=True)
    if update_index:
        _update_scenario_index(PROJECT_ROOT / "data" / "scenarios" / "index.json", scenario_id=scenario_id, display_name=display_name)
    report_dir.mkdir(parents=True, exist_ok=True)
    report = {
        "status": "pass",
        "scenario_id": scenario_id,
        "scenario_dir": _display_path(scenario_output_dir),
        "generated_at": generated_at,
        "summary": manifest.get("summary", {}),
        "snapshot_fingerprint": snapshot_payload["snapshot_fingerprint"],
        "runtime_topology_sha256": manifest["source"]["runtime_topology_sha256"],
        "audit_snapshot_fingerprint": audit_payload.get("snapshot_fingerprint"),
    }
    write_json(report_dir / "build_hgo_scenario_report.json", report)
    return report


def should_update_scenario_index(scenario_id: str, scenario_output_dir: Path) -> bool:
    default_output_dir = (PROJECT_ROOT / "data" / "scenarios" / scenario_id).resolve()
    return scenario_output_dir.resolve() == default_output_dir


def main() -> int:
    args = parse_args()
    scenario_id = str(args.scenario_id).strip()
    if not scenario_id:
        raise SystemExit("--scenario-id is required.")
    output_dir = Path(args.scenario_output_dir) if args.scenario_output_dir else PROJECT_ROOT / "data" / "scenarios" / scenario_id
    resolved_output_dir = output_dir.resolve()
    report = build_hgo_scenario(
        seed_path=Path(args.seed).resolve(),
        provinces_bmp_path=Path(args.provinces_bmp).resolve(),
        scenario_id=scenario_id,
        display_name=str(args.display_name).strip() or scenario_id,
        scenario_output_dir=resolved_output_dir,
        report_dir=Path(args.report_dir).resolve(),
        update_index=should_update_scenario_index(scenario_id, resolved_output_dir),
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
