#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import shutil
import struct
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from map_builder.contracts import DATA_ARTIFACT_SPECS_BY_PATH
from map_builder.runtime_asset_registry import load_runtime_asset_registry
from tools.build_hgo_runtime_seed import (
    DEFAULT_COUNTRY_COLOR_SOURCES,
    SOURCE_ID,
    build_runtime_seed,
    dump_json,
    file_sha256,
    resolve_country_color_source_arg,
    utc_now,
)

RUNTIME_ID = "hgo_raster_runtime_assets"
DEFAULT_OUTPUT_DIR = Path("data/hgo_runtime")
DEFAULT_SMOKE_REPORT = Path(".runtime/reports/generated/hgo_runtime_assets_smoke.json")

MANIFEST_RELATIVE_PATH = "hgo_runtime/manifest.json"
SEED_RELATIVE_PATH = "hgo_runtime/seed.json"
RASTER_RELATIVE_PATH = "hgo_runtime/provinces.bmp"
RUNTIME_OUTPUT_PATHS = (
    MANIFEST_RELATIVE_PATH,
    SEED_RELATIVE_PATH,
    RASTER_RELATIVE_PATH,
)
MANIFEST_REFRESH_PATHS = (*RUNTIME_OUTPUT_PATHS, "runtime_asset_registry.json")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build checked-in HGO runtime seed and raster assets.")
    parser.add_argument(
        "--hgo-root",
        "--source-root",
        dest="hgo_root",
        default=os.environ.get("HGO_ROOT", ""),
        help="HGO source root. Defaults to HGO_ROOT.",
    )
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="Runtime asset output directory.")
    parser.add_argument(
        "--country-color-source",
        action="append",
        default=None,
        help="Optional palette JSON used as an explicit owner/controller color source. Can be repeated.",
    )
    parser.add_argument("--as-of-date", default="", help="Optional HOI4 history date, for example 1939.1.1.")
    parser.add_argument(
        "--smoke-report",
        default=str(DEFAULT_SMOKE_REPORT),
        help="Smoke report output path. Pass an empty value to skip report writing.",
    )
    parser.add_argument(
        "--skip-data-manifest",
        action="store_true",
        help="Write HGO runtime assets without refreshing data/manifest.json output metadata.",
    )
    return parser.parse_args()


def repo_relative_url(path: Path) -> str:
    try:
        return path.resolve().relative_to(REPO_ROOT.resolve()).as_posix()
    except ValueError as exc:
        raise ValueError(f"HGO runtime asset must stay under the repository: {path}") from exc


def data_relative_output(path: Path) -> str:
    try:
        return path.resolve().relative_to((REPO_ROOT / "data").resolve()).as_posix()
    except ValueError as exc:
        raise ValueError(f"HGO runtime output must stay under data/: {path}") from exc


def read_bmp_header(path: Path) -> dict[str, Any]:
    header = path.read_bytes()[:54]
    if len(header) < 54:
        raise ValueError(f"HGO province raster is too small to be a BMP: {path}")
    if header[:2] != b"BM":
        raise ValueError(f"HGO province raster must be a BMP file: {path}")
    file_size_header = struct.unpack_from("<I", header, 2)[0]
    pixel_data_offset = struct.unpack_from("<I", header, 10)[0]
    dib_header_size = struct.unpack_from("<I", header, 14)[0]
    width = struct.unpack_from("<i", header, 18)[0]
    signed_height = struct.unpack_from("<i", header, 22)[0]
    planes = struct.unpack_from("<H", header, 26)[0]
    bits_per_pixel = struct.unpack_from("<H", header, 28)[0]
    compression = struct.unpack_from("<I", header, 30)[0]
    image_size_header = struct.unpack_from("<I", header, 34)[0]

    if dib_header_size < 40:
        raise ValueError(f"HGO province BMP DIB header must be at least BITMAPINFOHEADER: {path}")
    if width <= 0 or signed_height == 0:
        raise ValueError(f"HGO province BMP must have positive dimensions: {path}")
    if planes != 1:
        raise ValueError(f"HGO province BMP must have exactly one color plane: {path}")
    if bits_per_pixel != 24:
        raise ValueError(f"HGO province BMP must be 24-bit RGB. Got {bits_per_pixel}-bit: {path}")
    if compression != 0:
        raise ValueError(f"HGO province BMP must be uncompressed. Compression={compression}: {path}")

    height = abs(signed_height)
    row_stride = ((width * bits_per_pixel + 31) // 32) * 4
    minimum_pixel_bytes = row_stride * height
    stat_size = path.stat().st_size
    if pixel_data_offset <= 0 or pixel_data_offset + minimum_pixel_bytes > stat_size:
        raise ValueError(f"HGO province BMP pixel data range exceeds file size: {path}")

    return {
        "width": width,
        "height": height,
        "bits_per_pixel": bits_per_pixel,
        "compression": compression,
        "row_stride": row_stride,
        "pixel_data_offset": pixel_data_offset,
        "top_down": signed_height < 0,
        "file_size_header": file_size_header,
        "image_size_header": image_size_header,
    }


def asset_record(path: Path, *, asset_key: str, role: str, extra: dict[str, Any] | None = None) -> dict[str, Any]:
    record: dict[str, Any] = {
        "asset_key": asset_key,
        "url": repo_relative_url(path),
        "role": role,
        "size_bytes": path.stat().st_size,
        "sha256": file_sha256(path),
    }
    if extra:
        record.update(extra)
    return record


def build_runtime_asset_manifest(
    *,
    generated_at_utc: str,
    source_root: Path,
    seed_path: Path,
    raster_path: Path,
    seed_payload: dict[str, Any],
    raster_header: dict[str, Any],
) -> dict[str, Any]:
    return {
        "schema_version": 1,
        "runtime_id": RUNTIME_ID,
        "source_id": SOURCE_ID,
        "generated_at_utc": generated_at_utc,
        "source": {
            **dict(seed_payload.get("source") or {}),
            "source_root_name": source_root.resolve().name,
        },
        "seed_summary": seed_payload.get("summary", {}),
        "assets": {
            "hgo_runtime_seed": asset_record(
                seed_path,
                asset_key="hgo_runtime_seed",
                role="hgo_runtime_seed",
                extra={"runtime_id": seed_payload.get("runtime_id", "")},
            ),
            "hgo_runtime_provinces_bmp": asset_record(
                raster_path,
                asset_key="hgo_runtime_provinces_bmp",
                role="hgo_runtime_raster",
                extra=raster_header,
            ),
        },
    }


def copy_province_raster(source_root: Path, output_path: Path) -> dict[str, Any]:
    source_path = source_root / "map" / "provinces.bmp"
    raster_header = read_bmp_header(source_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source_path, output_path)
    read_bmp_header(output_path)
    return raster_header


def resolve_manifest_output_path(relative_path: str) -> Path:
    if relative_path.startswith("js/"):
        return REPO_ROOT / relative_path
    return REPO_ROOT / "data" / relative_path


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json_preserving_order(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def build_manifest_output_metadata(relative_path: str, path: Path) -> dict[str, Any]:
    artifact_spec = DATA_ARTIFACT_SPECS_BY_PATH[relative_path]
    item: dict[str, Any] = {
        "role": artifact_spec.role,
        "artifact_class": artifact_spec.artifact_class,
        "owner": artifact_spec.owner,
        "description": artifact_spec.description,
        "size_bytes": path.stat().st_size,
        "sha256": file_sha256(path),
    }
    if artifact_spec.schema_ref:
        item["schema_ref"] = artifact_spec.schema_ref
    if artifact_spec.simplification:
        item["simplification"] = artifact_spec.simplification
    if artifact_spec.target_zoom_range:
        item["target_zoom_range"] = [*artifact_spec.target_zoom_range]

    if relative_path == MANIFEST_RELATIVE_PATH:
        payload = read_json(path)
        item.update(
            {
                "type": "hgo_runtime_manifest",
                "runtime_id": payload.get("runtime_id", ""),
                "source_id": payload.get("source_id", ""),
                "asset_count": len(payload.get("assets") or {}),
            }
        )
    elif relative_path == SEED_RELATIVE_PATH:
        payload = read_json(path)
        summary = payload.get("summary", {}) if isinstance(payload, dict) else {}
        item.update(
            {
                "type": "hgo_runtime_seed",
                "runtime_id": payload.get("runtime_id", "") if isinstance(payload, dict) else "",
                "source_id": payload.get("source_id", "") if isinstance(payload, dict) else "",
                "province_count": int(summary.get("province_count") or 0),
                "state_count": int(summary.get("state_count") or 0),
                "country_count": int(summary.get("country_count") or 0),
                "mapped_province_count": int(summary.get("mapped_province_count") or 0),
            }
        )
    elif relative_path == RASTER_RELATIVE_PATH:
        item.update({"type": "hgo_runtime_raster", **read_bmp_header(path)})

    return item


def refresh_data_manifest(output_paths: tuple[str, ...] = MANIFEST_REFRESH_PATHS) -> None:
    manifest_path = REPO_ROOT / "data" / "manifest.json"
    manifest = read_json(manifest_path)
    outputs = manifest.setdefault("outputs", {})
    if not isinstance(outputs, dict):
        raise ValueError("data/manifest.json outputs must be an object.")

    for relative_path in output_paths:
        if relative_path not in DATA_ARTIFACT_SPECS_BY_PATH:
            raise KeyError(f"Missing DataArtifactSpec for {relative_path}")
        path = resolve_manifest_output_path(relative_path)
        if not path.is_file():
            raise FileNotFoundError(f"Cannot refresh data manifest; output missing: {path}")
        outputs[relative_path] = build_manifest_output_metadata(relative_path, path)

    manifest["runtime_asset_registry"] = load_runtime_asset_registry()
    write_json_preserving_order(manifest_path, manifest)


def build_smoke_report(
    *,
    source_root: Path,
    output_dir: Path,
    manifest_path: Path,
    seed_path: Path,
    raster_path: Path,
    seed_payload: dict[str, Any],
    raster_header: dict[str, Any],
) -> dict[str, Any]:
    runtime_manifest = read_json(manifest_path)
    manifest_assets = runtime_manifest.get("assets") if isinstance(runtime_manifest, dict) else {}
    seed_summary = seed_payload.get("summary") if isinstance(seed_payload.get("summary"), dict) else {}
    integrity = seed_payload.get("integrity") if isinstance(seed_payload.get("integrity"), dict) else {}
    checks = {
        "seed_written": seed_path.is_file(),
        "raster_written": raster_path.is_file(),
        "manifest_written": manifest_path.is_file(),
        "source_integrity_clean": not integrity.get("missing_definition_province_ids")
        and not integrity.get("duplicate_state_province_refs")
        and not integrity.get("missing_owner_color_tags"),
        "raster_is_rgb24_bmp": raster_header.get("bits_per_pixel") == 24 and raster_header.get("compression") == 0,
        "manifest_urls_repo_relative": all(
            str(record.get("url") or "").startswith("data/")
            and "://" not in str(record.get("url") or "")
            and ":" not in Path(str(record.get("url") or "")).parts[0]
            for record in (manifest_assets or {}).values()
            if isinstance(record, dict)
        ),
        "manifest_hashes_match": all(
            (REPO_ROOT / str(record.get("url") or "")).is_file()
            and file_sha256(REPO_ROOT / str(record.get("url") or "")) == record.get("sha256")
            for record in (manifest_assets or {}).values()
            if isinstance(record, dict)
        ),
    }
    return {
        "schema_version": 1,
        "report_id": "hgo_runtime_assets_smoke",
        "status": "pass" if all(checks.values()) else "fail",
        "generated_at_utc": runtime_manifest.get("generated_at_utc") or utc_now(),
        "source_root": str(source_root.resolve()),
        "output_dir": str(output_dir.resolve()),
        "manifest": asset_record(manifest_path, asset_key="hgo_runtime_manifest", role="hgo_runtime_manifest"),
        "seed": asset_record(
            seed_path,
            asset_key="hgo_runtime_seed",
            role="hgo_runtime_seed",
            extra={"summary": seed_summary},
        ),
        "raster": asset_record(
            raster_path,
            asset_key="hgo_runtime_provinces_bmp",
            role="hgo_runtime_raster",
            extra=raster_header,
        ),
        "checks": checks,
    }


def resolve_country_color_sources(args: argparse.Namespace) -> list[Path]:
    raw_sources = (
        args.country_color_source
        if args.country_color_source is not None
        else [str(path) for path in DEFAULT_COUNTRY_COLOR_SOURCES]
    )
    return [
        resolved
        for value in raw_sources
        for resolved in [resolve_country_color_source_arg(value)]
        if resolved is not None
    ]


def main() -> None:
    args = parse_args()
    if not args.hgo_root:
        raise SystemExit("HGO source root not provided. Pass --hgo-root or set HGO_ROOT.")
    source_root = Path(args.hgo_root).resolve()
    if not source_root.exists():
        raise SystemExit(f"HGO source root not found: {source_root}")

    output_dir = Path(args.output_dir)
    if not output_dir.is_absolute():
        output_dir = REPO_ROOT / output_dir
    output_dir = output_dir.resolve()
    data_relative_output(output_dir / "manifest.json")

    generated_at_utc = utc_now()
    seed_path = output_dir / "seed.json"
    raster_path = output_dir / "provinces.bmp"
    manifest_path = output_dir / "manifest.json"

    seed_payload = build_runtime_seed(
        source_root,
        country_color_sources=resolve_country_color_sources(args),
        generated_at_utc=generated_at_utc,
        as_of_date=args.as_of_date or None,
    )
    dump_json(seed_path, seed_payload)
    raster_header = copy_province_raster(source_root, raster_path)
    runtime_manifest = build_runtime_asset_manifest(
        generated_at_utc=generated_at_utc,
        source_root=source_root,
        seed_path=seed_path,
        raster_path=raster_path,
        seed_payload=seed_payload,
        raster_header=raster_header,
    )
    dump_json(manifest_path, runtime_manifest)

    if not args.skip_data_manifest:
        refresh_data_manifest()

    report_path = Path(args.smoke_report) if args.smoke_report else None
    report = build_smoke_report(
        source_root=source_root,
        output_dir=output_dir,
        manifest_path=manifest_path,
        seed_path=seed_path,
        raster_path=raster_path,
        seed_payload=seed_payload,
        raster_header=raster_header,
    )
    if report_path:
        if not report_path.is_absolute():
            report_path = REPO_ROOT / report_path
        dump_json(report_path, report)

    summary = seed_payload["summary"]
    print(
        "[HGO Runtime Assets] "
        f"states={summary['state_count']} "
        f"provinces={summary['province_count']} "
        f"mapped={summary['mapped_province_count']} "
        f"countries={summary['country_count']} "
        f"raster={raster_header['width']}x{raster_header['height']} "
        f"output={data_relative_output(output_dir)}"
        + (f" smoke_report={report_path}" if report_path else "")
    )


if __name__ == "__main__":
    main()
