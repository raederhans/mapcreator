#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import geopandas as gpd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from map_builder.transport_workbench_contracts import finalize_transport_manifest


SOURCE_CACHE_ROOT = PROJECT_ROOT / ".runtime" / "source-cache" / "transport" / "global" / "natural_earth"
OUTPUT_ROOT = PROJECT_ROOT / "data" / "transport_layers"

SOURCES: dict[str, dict[str, str]] = {
    "airport": {
        "url": "https://naturalearth.s3.amazonaws.com/10m_cultural/ne_10m_airports.zip",
        "filename": "ne_10m_airports.zip",
        "layer_name": "ne_10m_airports",
        "source_version": "natural_earth_10m_airports_v5_0_0",
        "citation": "https://www.naturalearthdata.com/downloads/10m-cultural-vectors/airports/",
    },
    "port": {
        "url": "https://naturalearth.s3.amazonaws.com/10m_cultural/ne_10m_ports.zip",
        "filename": "ne_10m_ports.zip",
        "layer_name": "ne_10m_ports",
        "source_version": "natural_earth_10m_ports_v5_0_0",
        "citation": "https://www.naturalearthdata.com/downloads/10m-cultural-vectors/",
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build small global airport/port point packs for transport runtime.")
    parser.add_argument(
        "--family",
        choices=("airport", "port", "all"),
        default="all",
        help="Transport point family to build.",
    )
    return parser.parse_args()


def write_json(path: Path, payload: Any, *, compact: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    separators = (",", ":") if compact else None
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=None if compact else 2, separators=separators) + "\n",
        encoding="utf-8",
    )


def clean_text(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and math.isnan(value):
        return ""
    text = str(value).strip()
    return "" if text.lower() == "nan" else text


def clean_number(value: object, fallback: float = 0) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return fallback
    return number if math.isfinite(number) else fallback


def download_source(family: str) -> tuple[Path, dict[str, object]]:
    source = SOURCES[family]
    source_path = SOURCE_CACHE_ROOT / source["filename"]
    source_path.parent.mkdir(parents=True, exist_ok=True)
    if not source_path.is_file():
        urllib.request.urlretrieve(source["url"], source_path)
    data = source_path.read_bytes()
    return source_path, {
        "filename": str(source_path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "size_bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "url": source["url"],
    }


def normalize_airport_feature(row: Any, index: int) -> dict[str, object] | None:
    geometry = getattr(row, "geometry", None)
    if geometry is None or geometry.geom_type != "Point":
        return None
    airport_type = clean_text(getattr(row, "type", "")).lower()
    if "major" in airport_type:
        importance_rank = 3
        importance = "national_core"
    elif "mid" in airport_type:
        importance_rank = 2
        importance = "regional_core"
    else:
        importance_rank = 1
        importance = "local_connector"
    iata = clean_text(getattr(row, "iata_code", "") or getattr(row, "abbrev", ""))
    icao = clean_text(getattr(row, "gps_code", ""))
    stable_id = clean_text(getattr(row, "ne_id", "")) or iata or icao or f"natural_earth_airport_{index + 1}"
    name = clean_text(getattr(row, "name_en", "")) or clean_text(getattr(row, "name", "")) or iata or icao
    return {
        "type": "Feature",
        "id": f"global_airport::{stable_id}",
        "properties": {
            "id": f"global_airport::{stable_id}",
            "stable_key": f"global_airport::{stable_id}",
            "name": name,
            "iata": iata,
            "icao": icao,
            "airport_type": airport_type or "airport",
            "status_category": "operational",
            "importance": importance,
            "importance_rank": importance_rank,
            "source": "natural_earth_10m_airports",
            "source_ne_id": stable_id,
            "wikipedia": clean_text(getattr(row, "wikipedia", "")),
        },
        "geometry": {
            "type": "Point",
            "coordinates": [round(float(geometry.x), 6), round(float(geometry.y), 6)],
        },
    }


def normalize_port_feature(row: Any, index: int) -> dict[str, object] | None:
    geometry = getattr(row, "geometry", None)
    if geometry is None or geometry.geom_type != "Point":
        return None
    natlscale = clean_number(getattr(row, "natlscale", 0), 0)
    if natlscale >= 50:
        importance_rank = 3
        legal_designation = "international_hub"
        legal_designation_label = "Global hub port"
    elif natlscale >= 10:
        importance_rank = 2
        legal_designation = "important"
        legal_designation_label = "Important port"
    else:
        importance_rank = 1
        legal_designation = "local"
        legal_designation_label = "Local port"
    stable_id = clean_text(getattr(row, "ne_id", "")) or f"natural_earth_port_{index + 1}"
    name = clean_text(getattr(row, "name", "")) or stable_id
    return {
        "type": "Feature",
        "id": f"global_port::{stable_id}",
        "properties": {
            "id": f"global_port::{stable_id}",
            "stable_key": f"global_port::{stable_id}",
            "name": name,
            "legal_designation": legal_designation,
            "legal_designation_label": legal_designation_label,
            "manager_type_code": "global",
            "importance": "national_core" if importance_rank >= 3 else ("regional_core" if importance_rank == 2 else "local_connector"),
            "importance_rank": importance_rank,
            "source": "natural_earth_10m_ports",
            "source_ne_id": stable_id,
            "website": clean_text(getattr(row, "website", "")),
        },
        "geometry": {
            "type": "Point",
            "coordinates": [round(float(geometry.x), 6), round(float(geometry.y), 6)],
        },
    }


def build_family(family: str) -> None:
    source_path, source_signature = download_source(family)
    gdf = gpd.read_file(source_path)
    normalizer = normalize_airport_feature if family == "airport" else normalize_port_feature
    pack_key = "airports" if family == "airport" else "ports"
    output_dir = OUTPUT_ROOT / f"global_{family}"
    features = [
        feature
        for index, row in enumerate(gdf.itertuples(index=False))
        for feature in [normalizer(row, index)]
        if feature is not None
    ]
    preview_features = [
        feature for feature in features
        if int(feature["properties"].get("importance_rank", 1)) >= 2
    ]
    full_payload = {"type": "FeatureCollection", "features": features}
    preview_payload = {"type": "FeatureCollection", "features": preview_features}
    full_name = f"{pack_key}.geojson"
    preview_name = f"{pack_key}.preview.geojson"
    write_json(output_dir / full_name, full_payload, compact=True)
    write_json(output_dir / preview_name, preview_payload, compact=True)

    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    source = SOURCES[family]
    manifest = finalize_transport_manifest(
        {
            "adapter_id": f"global_{family}_natural_earth_v1",
            "family": family,
            "geometry_kind": "point",
            "country": "world",
            "schema_version": 1,
            "generated_at": generated_at,
            "recipe_path": f"data/transport_layers/global_{family}/source_recipe.manual.json",
            "paths": {
                "preview": {pack_key: f"data/transport_layers/global_{family}/{preview_name}"},
                "full": {pack_key: f"data/transport_layers/global_{family}/{full_name}"},
                "build_audit": f"data/transport_layers/global_{family}/build_audit.json",
            },
            "source_signature": {"natural_earth": source_signature},
            "recipe_version": source["source_version"],
            "feature_counts": {
                "preview": {pack_key: len(preview_features)},
                "full": {pack_key: len(features)},
            },
            "build_command": f"python tools/build_global_transport_points.py --family {family}",
            "runtime_consumer": f"transport_overview_{family}",
            "source_policy": "natural_earth_public_domain_checked_in_v1",
            "distribution_tier": "single_pack",
            "coverage_scope": "world",
        },
        default_variant="default",
        variants={
            "default": {
                "label": "default",
                "distribution_tier": "single_pack",
                "paths": {
                    "preview": {pack_key: f"data/transport_layers/global_{family}/{preview_name}"},
                    "full": {pack_key: f"data/transport_layers/global_{family}/{full_name}"},
                },
                "feature_counts": {
                    "preview": {pack_key: len(preview_features)},
                    "full": {pack_key: len(features)},
                },
            }
        },
    )
    write_json(output_dir / "manifest.json", manifest)
    write_json(
        output_dir / "source_recipe.manual.json",
        {
            "version": source["source_version"],
            "family": family,
            "source": {
                "id": f"natural_earth_10m_{pack_key}",
                "url": source["url"],
                "citation": source["citation"],
                "license": "public domain",
                "layer_name": source["layer_name"],
            },
            "outputs": [full_name, preview_name, "manifest.json", "build_audit.json"],
            "runtime_consumer": f"transport_overview_{family}",
        },
    )
    write_json(
        output_dir / "build_audit.json",
        {
            "adapter_id": manifest["adapter_id"],
            "generated_at": generated_at,
            "source_signature": manifest["source_signature"],
            "summary": {
                "feature_count": len(features),
                "preview_feature_count": len(preview_features),
                "coverage_scope": "world",
            },
        },
    )
    print(f"[global-transport] built {family}: {len(features)} features")


def main() -> int:
    args = parse_args()
    families = ("airport", "port") if args.family == "all" else (args.family,)
    for family in families:
        build_family(family)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
