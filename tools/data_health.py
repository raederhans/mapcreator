#!/usr/bin/env python3
"""Governance-domain health checks for cataloged data assets.

The checker intentionally stays on the catalog/runtime/transport/scenario control
plane. It avoids a repo-wide data/** orphan scan because the data tree contains
many generated and source-cache files that are outside the current governance
contract.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from map_builder.transport_workbench_contracts import validate_transport_manifest
from tools.build_data_catalog import collect_transport_path_contract_errors, iter_transport_manifest_paths

DATA_DIR = PROJECT_ROOT / "data"
CATALOG_PATH = DATA_DIR / "CATALOG.json"
SCENARIO_REGISTRY_URL = "data/scenarios/index.json"
SCENARIO_REGISTRY_KEY = "scenario_registry"
LARGE_FILE_WARN_BYTES = 25 * 1024 * 1024


@dataclass
class HealthReport:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    schema_ref_counts: Counter[str] = field(default_factory=Counter)
    large_file_urls: set[str] = field(default_factory=set, repr=False)
    checked_catalog_urls: int = 0
    checked_runtime_assets: int = 0
    checked_transport_manifests: int = 0
    checked_transport_paths: int = 0

    @property
    def ok(self) -> bool:
        return not self.errors


@dataclass(frozen=True)
class HealthPaths:
    project_root: Path
    data_dir: Path
    catalog_path: Path
    runtime_asset_registry_path: Path
    transport_root: Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check data catalog governance-domain health.")
    parser.add_argument("--catalog", default=str(CATALOG_PATH), help="Path to data/CATALOG.json.")
    parser.add_argument(
        "--large-file-warn-mb",
        type=float,
        default=LARGE_FILE_WARN_BYTES / (1024 * 1024),
        help="Warn when a cataloged governance asset is larger than this many MiB. Use 0 to disable.",
    )
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON.")
    return parser.parse_args()


def _read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _build_health_paths(catalog_path: Path) -> HealthPaths:
    normalized_catalog_path = Path(catalog_path).resolve()
    data_dir = normalized_catalog_path.parent
    project_root = data_dir.parent
    return HealthPaths(
        project_root=project_root,
        data_dir=data_dir,
        catalog_path=normalized_catalog_path,
        runtime_asset_registry_path=data_dir / "runtime_asset_registry.json",
        transport_root=data_dir / "transport_layers",
    )


def _normalize_rel_path(value: str | Path, project_root: Path) -> str:
    if isinstance(value, Path):
        try:
            return value.resolve().relative_to(project_root).as_posix()
        except ValueError:
            return value.as_posix()
    return str(value or "").replace("\\", "/").strip()


def _resolve_project_path(relative_url: str, project_root: Path) -> Path:
    return project_root / _normalize_rel_path(relative_url, project_root)


def _iter_transport_manifest_leaf_paths(container: Any, path_parts: tuple[str, ...] = ()) -> Iterable[tuple[tuple[str, ...], str]]:
    if isinstance(container, dict):
        for key, value in container.items():
            yield from _iter_transport_manifest_leaf_paths(value, (*path_parts, str(key)))
        return
    if isinstance(container, str) and container.strip():
        yield path_parts, container.strip()


def _iter_transport_manifest_paths(transport_root: Path) -> list[Path]:
    return iter_transport_manifest_paths(transport_root)


def _transport_leaf_paths(manifest: dict[str, Any]) -> list[tuple[tuple[str, ...], str]]:
    leaf_paths = list(_iter_transport_manifest_leaf_paths(manifest.get("paths"), ("paths",)))
    variants = manifest.get("variants")
    if isinstance(variants, dict):
        for variant_id, variant_meta in variants.items():
            if isinstance(variant_meta, dict):
                leaf_paths.extend(
                    _iter_transport_manifest_leaf_paths(
                        variant_meta.get("paths"),
                        ("variants", str(variant_id), "paths"),
                    )
                )
    return leaf_paths


def _warn_large_file(report: HealthReport, relative_url: str, *, warn_bytes: int, project_root: Path) -> None:
    if warn_bytes <= 0:
        return
    normalized_url = _normalize_rel_path(relative_url, project_root)
    if normalized_url in report.large_file_urls:
        return
    path = _resolve_project_path(relative_url, project_root)
    if not path.is_file():
        return
    size = path.stat().st_size
    if size > warn_bytes:
        report.large_file_urls.add(normalized_url)
        report.warnings.append(
            f"large file: {normalized_url} is {size / (1024 * 1024):.1f} MiB; report-only governance warning"
        )


def _entry_index(
    entries: Iterable[dict[str, Any]],
    *,
    project_root: Path,
) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    by_key: dict[str, dict[str, Any]] = {}
    by_url: dict[str, dict[str, Any]] = {}
    for entry in entries:
        key = str(entry.get("key") or "").strip()
        url = _normalize_rel_path(entry.get("url", ""), project_root)
        if key:
            by_key[key] = entry
        if url:
            by_url[url] = entry
    return by_key, by_url


def collect_health(catalog_path: Path = CATALOG_PATH, *, large_file_warn_bytes: int = LARGE_FILE_WARN_BYTES) -> HealthReport:
    report = HealthReport()
    health_paths = _build_health_paths(catalog_path)
    catalog = _read_json(health_paths.catalog_path)
    entries = catalog.get("entries")
    if not isinstance(entries, list):
        report.errors.append(f"{_normalize_rel_path(health_paths.catalog_path, health_paths.project_root)}: entries must be a list")
        return report

    entry_dicts = [entry for entry in entries if isinstance(entry, dict)]
    if len(entry_dicts) != len(entries):
        report.errors.append(f"{_normalize_rel_path(health_paths.catalog_path, health_paths.project_root)}: every entry must be an object")

    entries_by_key, entries_by_url = _entry_index(entry_dicts, project_root=health_paths.project_root)
    report.schema_ref_counts.update(str(entry.get("schemaRef") or "") for entry in entry_dicts)

    seen_keys: set[str] = set()
    seen_urls: set[str] = set()
    for entry in entry_dicts:
        key = str(entry.get("key") or "").strip()
        url = _normalize_rel_path(entry.get("url", ""), health_paths.project_root)
        schema_ref = str(entry.get("schemaRef") or "").strip()
        role = str(entry.get("role") or "").strip()
        if not key:
            report.errors.append("catalog entry is missing key")
        elif key in seen_keys:
            report.errors.append(f"catalog key appears more than once: {key}")
        else:
            seen_keys.add(key)
        if not url:
            report.errors.append(f"catalog entry {key or '<missing key>'} is missing url")
            continue
        if url in seen_urls:
            report.errors.append(f"catalog url appears more than once: {url}")
        seen_urls.add(url)
        if not url.startswith("data/") and not url.startswith("js/"):
            report.errors.append(f"catalog entry {key} url must stay under data/ or js/: {url}")
        if not _resolve_project_path(url, health_paths.project_root).is_file():
            report.errors.append(f"catalog entry {key} target missing: {url}")
        if not schema_ref:
            report.errors.append(f"catalog entry {key} is missing schemaRef")
        if role.startswith("transport") and not key.startswith("transport"):
            report.errors.append(f"transport catalog entry has non-transport key: {key}")
        _warn_large_file(report, url, warn_bytes=large_file_warn_bytes, project_root=health_paths.project_root)
    report.checked_catalog_urls = len(seen_urls)

    runtime_registry = _read_json(health_paths.runtime_asset_registry_path)
    assets = runtime_registry.get("assets") if isinstance(runtime_registry, dict) else None
    if not isinstance(assets, dict):
        report.errors.append(
            f"{_normalize_rel_path(health_paths.runtime_asset_registry_path, health_paths.project_root)}: assets must be an object"
        )
        assets = {}
    for asset_key, asset_spec in sorted(assets.items()):
        if not isinstance(asset_spec, dict):
            report.errors.append(f"runtime_asset_registry asset {asset_key} must be an object")
            continue
        asset_url = _normalize_rel_path(asset_spec.get("url", ""), health_paths.project_root)
        if not asset_url:
            report.errors.append(f"runtime_asset_registry asset {asset_key} is missing url")
            continue
        if not _resolve_project_path(asset_url, health_paths.project_root).is_file():
            report.errors.append(f"runtime_asset_registry asset {asset_key} target missing: {asset_url}")
        # Runtime registry is a source for cataloged governance assets. Existing
        # runtime-only aliases remain valid when their URL is represented by a
        # canonical catalog entry with another key.
        if asset_url not in entries_by_url:
            report.errors.append(f"runtime_asset_registry asset {asset_key} url is absent from catalog: {asset_url}")
        else:
            catalog_entry = entries_by_url[asset_url]
            catalog_identities = {
                str(catalog_entry.get("key") or "").strip(),
                *[
                    str(alias or "").strip()
                    for alias in catalog_entry.get("aliases", [])
                    if str(alias or "").strip()
                ],
            }
            if asset_key not in catalog_identities:
                report.errors.append(
                    f"runtime_asset_registry asset {asset_key} key is absent from catalog key/aliases for {asset_url}"
                )
        _warn_large_file(report, asset_url, warn_bytes=large_file_warn_bytes, project_root=health_paths.project_root)
    report.checked_runtime_assets = len(assets)

    scenario_entry = entries_by_key.get(SCENARIO_REGISTRY_KEY)
    if scenario_entry is None:
        report.errors.append("catalog is missing scenario_registry entry")
    else:
        scenario_url = _normalize_rel_path(scenario_entry.get("url", ""), health_paths.project_root)
        if scenario_url != SCENARIO_REGISTRY_URL:
            report.errors.append(f"scenario_registry must point to {SCENARIO_REGISTRY_URL}; got {scenario_url}")
        if scenario_entry.get("role") != SCENARIO_REGISTRY_KEY:
            report.errors.append("scenario_registry catalog entry must keep role scenario_registry")

    for manifest_path in _iter_transport_manifest_paths(health_paths.transport_root):
        relative_manifest_path = _normalize_rel_path(manifest_path, health_paths.project_root)
        manifest = _read_json(manifest_path)
        if not isinstance(manifest, dict):
            report.errors.append(f"{relative_manifest_path}: manifest must be an object")
            continue
        report.checked_transport_manifests += 1
        for error in validate_transport_manifest(manifest, source_label=relative_manifest_path):
            report.errors.append(error)
        for error in collect_transport_path_contract_errors(
            manifest,
            manifest_path,
            project_root=health_paths.project_root,
        ):
            report.errors.append(error)
        if relative_manifest_path not in entries_by_url:
            report.errors.append(f"transport manifest missing from catalog: {relative_manifest_path}")
        for logical_parts, raw_path in _transport_leaf_paths(manifest):
            normalized_path = _normalize_rel_path(raw_path, health_paths.project_root)
            report.checked_transport_paths += 1
            label = ".".join(logical_parts)
            if normalized_path not in entries_by_url:
                report.errors.append(f"{relative_manifest_path}: {label} missing from catalog: {normalized_path}")
            _warn_large_file(
                report,
                normalized_path,
                warn_bytes=large_file_warn_bytes,
                project_root=health_paths.project_root,
            )

    return report


def _report_to_json(report: HealthReport) -> dict[str, Any]:
    return {
        "ok": report.ok,
        "errors": report.errors,
        "warnings": report.warnings,
        "schemaRef": dict(sorted(report.schema_ref_counts.items())),
        "checked": {
            "catalogUrls": report.checked_catalog_urls,
            "runtimeAssets": report.checked_runtime_assets,
            "transportManifests": report.checked_transport_manifests,
            "transportPaths": report.checked_transport_paths,
        },
    }


def _print_text_report(report: HealthReport) -> None:
    print("[data-health] governance-domain check")
    print(f"catalog URLs: {report.checked_catalog_urls}")
    print(f"runtime assets: {report.checked_runtime_assets}")
    print(f"transport manifests: {report.checked_transport_manifests}")
    print(f"transport manifest paths: {report.checked_transport_paths}")
    print("schemaRef counts:")
    for schema_ref, count in sorted(report.schema_ref_counts.items()):
        print(f"  {schema_ref or '<missing>'}: {count}")
    if report.warnings:
        print("warnings:")
        for warning in report.warnings:
            print(f"  WARN {warning}")
    if report.errors:
        print("errors:")
        for error in report.errors:
            print(f"  ERROR {error}")


def main() -> int:
    args = parse_args()
    warn_bytes = int(args.large_file_warn_mb * 1024 * 1024)
    report = collect_health(Path(args.catalog).resolve(), large_file_warn_bytes=warn_bytes)
    if args.json:
        print(json.dumps(_report_to_json(report), ensure_ascii=False, indent=2, sort_keys=True))
    else:
        _print_text_report(report)
    return 0 if report.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
