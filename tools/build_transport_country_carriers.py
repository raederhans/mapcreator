#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import geopandas as gpd
from pyproj import Transformer
from shapely.geometry import GeometryCollection, LineString, MultiLineString, MultiPolygon, Polygon, box, mapping
from shapely.ops import linemerge, transform, unary_union

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from map_builder.transport_carrier_registry import (  # noqa: E402
    CARRIER_RUNTIME_ASSETS,
    PACK_CARRIER_ASSET_KEYS,
)
from map_builder.transport_workbench_contracts import finalize_transport_manifest  # noqa: E402


SOURCE_PATH = PROJECT_ROOT / "data" / "ne_10m_admin_1_states_provinces.shp"
OUTPUT_ROOT = PROJECT_ROOT / "data" / "transport_layers"
RUNTIME_ASSET_REGISTRY = PROJECT_ROOT / "data" / "runtime_asset_registry.json"
VIEWBOX_WIDTH = 1600
VIEWBOX_HEIGHT = 900
LOD_SPECS = {
    "overview": {"tolerance_m": 2800.0, "min_area_m2": 12_000_000.0},
    "detail": {"tolerance_m": 650.0, "min_area_m2": 1_500_000.0},
}


@dataclass(frozen=True)
class FrameSpec:
    label: str
    extent: dict[str, float]
    include_codes: tuple[str, ...] | None = None
    clip_bounds: tuple[float, float, float, float] | None = None


@dataclass(frozen=True)
class CarrierSpec:
    carrier_id: str
    adm0_a3: str
    label: str
    projection: dict[str, Any]
    frames: dict[str, FrameSpec]
    scope_policy: str
    basemap_profile: str
    default_camera: dict[str, float]
    lod_switch: dict[str, float]


USA_CONUS_CODES = (
    "US-AL", "US-AR", "US-AZ", "US-CA", "US-CO", "US-CT", "US-DC", "US-DE",
    "US-FL", "US-GA", "US-IA", "US-ID", "US-IL", "US-IN", "US-KS", "US-KY",
    "US-LA", "US-MA", "US-MD", "US-ME", "US-MI", "US-MN", "US-MO", "US-MS",
    "US-MT", "US-NC", "US-ND", "US-NE", "US-NH", "US-NJ", "US-NM", "US-NV",
    "US-NY", "US-OH", "US-OK", "US-OR", "US-PA", "US-RI", "US-SC", "US-SD",
    "US-TN", "US-TX", "US-UT", "US-VA", "US-VT", "US-WA", "US-WI", "US-WV",
    "US-WY",
)

SPECS = {
    "usa": CarrierSpec(
        carrier_id="usa",
        adm0_a3="USA",
        label="United States carrier",
        projection={
            "type": "geoConicEqualArea",
            "center": [-96.0, 38.0],
            "parallels": [29.5, 45.5],
            "precision": 0.2,
        },
        frames={
            "main": FrameSpec(
                label="Contiguous United States",
                extent={"x": 18, "y": 18, "width": 1188, "height": 864},
                include_codes=USA_CONUS_CODES,
            ),
            "alaska": FrameSpec(
                label="Alaska",
                extent={"x": 1236, "y": 82, "width": 324, "height": 342},
                include_codes=("US-AK",),
            ),
            "hawaii": FrameSpec(
                label="Hawaii",
                extent={"x": 1258, "y": 510, "width": 282, "height": 188},
                include_codes=("US-HI",),
            ),
        },
        scope_policy="CONUS plus Alaska and Hawaii; territories excluded for workbench preview parity with current packs.",
        basemap_profile="Natural Earth admin1 state-level carrier with Alaska/Hawaii inset frames.",
        default_camera={"scale": 1.0, "translateX": 0.0, "translateY": 0.0, "minScale": 1.0, "maxScale": 3.6, "rotationQuarterTurns": 0},
        lod_switch={"detailOn": 1.35, "overviewOn": 1.18},
    ),
    "germany": CarrierSpec(
        carrier_id="germany",
        adm0_a3="DEU",
        label="Germany carrier",
        projection={"type": "geoConicConformal", "center": [10.4, 51.1], "parallels": [48.5, 54.0], "precision": 0.2},
        frames={"main": FrameSpec(label="Germany", extent={"x": 18, "y": 18, "width": 1564, "height": 864})},
        scope_policy="Germany national mainland and islands represented by Natural Earth admin1.",
        basemap_profile="Natural Earth admin1 Länder carrier.",
        default_camera={"scale": 1.0, "translateX": 0.0, "translateY": 0.0, "minScale": 1.0, "maxScale": 4.0, "rotationQuarterTurns": 0},
        lod_switch={"detailOn": 1.38, "overviewOn": 1.2},
    ),
    "uk": CarrierSpec(
        carrier_id="uk",
        adm0_a3="GBR",
        label="United Kingdom carrier",
        projection={"type": "geoConicConformal", "center": [-2.6, 54.4], "parallels": [50.0, 58.0], "precision": 0.2},
        frames={"main": FrameSpec(label="United Kingdom main geography", extent={"x": 18, "y": 18, "width": 1564, "height": 864}, clip_bounds=(-8.8, 49.7, 2.2, 61.3))},
        scope_policy="England, Scotland, Wales, and Northern Ireland scope; overseas territories excluded.",
        basemap_profile="Natural Earth admin1 local authority carrier clipped to UK main geography.",
        default_camera={"scale": 1.0, "translateX": 0.0, "translateY": 0.0, "minScale": 1.0, "maxScale": 4.2, "rotationQuarterTurns": 0},
        lod_switch={"detailOn": 1.38, "overviewOn": 1.2},
    ),
    "france": CarrierSpec(
        carrier_id="france",
        adm0_a3="FRA",
        label="France carrier",
        projection={"type": "geoConicConformal", "center": [2.3, 46.5], "parallels": [44.0, 49.0], "precision": 0.2},
        frames={"main": FrameSpec(label="Metropolitan France", extent={"x": 18, "y": 18, "width": 1564, "height": 864}, clip_bounds=(-5.6, 41.0, 10.1, 51.5))},
        scope_policy="Metropolitan France only; overseas departments and collectivities excluded unless a future pack covers them.",
        basemap_profile="Natural Earth admin1 metropolitan carrier clipped to Europe.",
        default_camera={"scale": 1.0, "translateX": 0.0, "translateY": 0.0, "minScale": 1.0, "maxScale": 4.0, "rotationQuarterTurns": 0},
        lod_switch={"detailOn": 1.36, "overviewOn": 1.18},
    ),
    "china": CarrierSpec(
        carrier_id="china",
        adm0_a3="CHN",
        label="China carrier",
        projection={"type": "geoConicConformal", "center": [104.0, 35.5], "parallels": [25.0, 47.0], "precision": 0.2},
        frames={"main": FrameSpec(label="China", extent={"x": 18, "y": 18, "width": 1564, "height": 864})},
        scope_policy="Admin1 preview scope follows Natural Earth CHN polygons used by checked-in data.",
        basemap_profile="Natural Earth admin1 provincial carrier.",
        default_camera={"scale": 1.0, "translateX": 0.0, "translateY": 0.0, "minScale": 1.0, "maxScale": 3.6, "rotationQuarterTurns": 0},
        lod_switch={"detailOn": 1.32, "overviewOn": 1.15},
    ),
    "india": CarrierSpec(
        carrier_id="india",
        adm0_a3="IND",
        label="India carrier",
        projection={"type": "geoConicConformal", "center": [78.9, 22.8], "parallels": [13.0, 30.0], "precision": 0.2},
        frames={"main": FrameSpec(label="India", extent={"x": 18, "y": 18, "width": 1564, "height": 864})},
        scope_policy="India admin1 preview scope follows Natural Earth polygons used by checked-in data.",
        basemap_profile="Natural Earth admin1 state carrier.",
        default_camera={"scale": 1.0, "translateX": 0.0, "translateY": 0.0, "minScale": 1.0, "maxScale": 3.8, "rotationQuarterTurns": 0},
        lod_switch={"detailOn": 1.35, "overviewOn": 1.18},
    ),
    "russia": CarrierSpec(
        carrier_id="russia",
        adm0_a3="RUS",
        label="Russia carrier",
        projection={"type": "geoConicConformal", "center": [95.0, 61.0], "parallels": [50.0, 70.0], "precision": 0.2},
        frames={"main": FrameSpec(label="Russia with Kaliningrad", extent={"x": 18, "y": 18, "width": 1564, "height": 864})},
        scope_policy="Russia admin1 preview includes Kaliningrad as part of the national carrier.",
        basemap_profile="Natural Earth admin1 federal subject carrier.",
        default_camera={"scale": 1.0, "translateX": 0.0, "translateY": 0.0, "minScale": 1.0, "maxScale": 3.4, "rotationQuarterTurns": 0},
        lod_switch={"detailOn": 1.32, "overviewOn": 1.15},
    ),
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def rel(path: Path) -> str:
    return str(path.relative_to(PROJECT_ROOT)).replace("\\", "/")


def write_json(path: Path, payload: Any, *, compact: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if compact:
        text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    else:
        text = json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    path.write_text(text, encoding="utf-8")


def round_nested(value: Any, digits: int = 6) -> Any:
    if isinstance(value, float):
        return round(value, digits)
    if isinstance(value, list):
        return [round_nested(item, digits) for item in value]
    if isinstance(value, tuple):
        return [round_nested(item, digits) for item in value]
    if isinstance(value, dict):
        return {key: round_nested(item, digits) for key, item in value.items()}
    return value


def geometry_to_geojson(geom) -> dict[str, Any]:
    return round_nested(mapping(geom), 6)


def make_transformers(spec: CarrierSpec) -> tuple[Transformer, Transformer, str]:
    center = spec.projection["center"]
    parallels = spec.projection["parallels"]
    proj_kind = "aea" if spec.projection["type"] == "geoConicEqualArea" else "lcc"
    proj4 = (
        f"+proj={proj_kind} +lat_1={parallels[0]} +lat_2={parallels[1]} "
        f"+lat_0={center[1]} +lon_0={center[0]} +datum=WGS84 +units=m +no_defs"
    )
    return (
        Transformer.from_crs("EPSG:4326", proj4, always_xy=True),
        Transformer.from_crs(proj4, "EPSG:4326", always_xy=True),
        proj4,
    )


def iter_polygons(geom):
    if geom is None or geom.is_empty:
        return
    if isinstance(geom, Polygon):
        yield geom
        return
    if isinstance(geom, MultiPolygon):
        for polygon in geom.geoms:
            if not polygon.is_empty:
                yield polygon
        return
    if isinstance(geom, GeometryCollection):
        for child in geom.geoms:
            yield from iter_polygons(child)
        return
    raise TypeError(f"Unsupported polygon geometry: {type(geom)!r}")


def iter_lines(geom):
    if geom is None or geom.is_empty:
        return
    if isinstance(geom, LineString):
        yield geom
        return
    if isinstance(geom, MultiLineString):
        for line in geom.geoms:
            if not line.is_empty:
                yield line
        return
    if isinstance(geom, GeometryCollection):
        for child in geom.geoms:
            yield from iter_lines(child)
        return
    raise TypeError(f"Unsupported line geometry: {type(geom)!r}")


def collect_polygons(parts):
    if not parts:
        return GeometryCollection()
    if len(parts) == 1:
        return parts[0]
    return MultiPolygon(parts)


def prune_micro_polygons(geom, *, min_area: float):
    return collect_polygons([polygon for polygon in iter_polygons(geom) if polygon.area >= min_area])


def simplify_polygon_geometry(geom, forward: Transformer, inverse: Transformer, *, tolerance_m: float, min_area_m2: float):
    projected = transform(forward.transform, geom)
    simplified = projected.simplify(tolerance_m, preserve_topology=True)
    simplified = prune_micro_polygons(simplified, min_area=min_area_m2)
    return transform(inverse.transform, simplified)


def build_internal_lines(geometries, country_union, forward: Transformer, inverse: Transformer, *, tolerance_m: float):
    projected_boundaries = unary_union([transform(forward.transform, geom).boundary for geom in geometries])
    projected_coastline = transform(forward.transform, country_union).boundary.buffer(max(tolerance_m * 0.6, 50.0))
    internal = projected_boundaries.difference(projected_coastline)
    if internal.is_empty:
        return GeometryCollection()
    if isinstance(internal, GeometryCollection):
        parts = [line for line in iter_lines(internal)]
        internal = unary_union(parts) if parts else GeometryCollection()
    if internal.is_empty:
        return GeometryCollection()
    merged = linemerge(internal)
    simplified = merged.simplify(max(tolerance_m * 0.55, 70.0), preserve_topology=True)
    return transform(inverse.transform, simplified)


def load_admin1() -> gpd.GeoDataFrame:
    if not SOURCE_PATH.exists():
        raise FileNotFoundError(f"Natural Earth admin1 source not found: {SOURCE_PATH}")
    source = gpd.read_file(SOURCE_PATH).to_crs("EPSG:4326")
    source["adm0_a3"] = source["adm0_a3"].astype(str).str.strip()
    source["iso_3166_2"] = source["iso_3166_2"].astype(str).str.strip()
    return source


def select_frame_features(source: gpd.GeoDataFrame, spec: CarrierSpec, frame: FrameSpec) -> gpd.GeoDataFrame:
    selected = source[source["adm0_a3"] == spec.adm0_a3].copy()
    if frame.include_codes:
        selected = selected[selected["iso_3166_2"].isin(frame.include_codes)].copy()
    if frame.clip_bounds:
        clip_box = box(*frame.clip_bounds)
        selected["geometry"] = selected.geometry.intersection(clip_box)
        selected = selected[selected.geometry.notnull() & ~selected.geometry.is_empty].copy()
    if selected.empty:
        raise RuntimeError(f"{spec.carrier_id}: frame '{frame.label}' selected no admin1 features.")
    return selected


def build_frame_payload(frame_id: str, frame: FrameSpec, selected: gpd.GeoDataFrame, forward: Transformer, inverse: Transformer) -> dict[str, Any]:
    frame_union = unary_union(selected.geometry.tolist())
    if frame_union.is_empty:
        raise RuntimeError(f"Frame '{frame_id}' union geometry is empty.")

    lod_payload = {}
    for lod_key, lod_spec in LOD_SPECS.items():
        land = simplify_polygon_geometry(
            frame_union,
            forward,
            inverse,
            tolerance_m=lod_spec["tolerance_m"],
            min_area_m2=lod_spec["min_area_m2"],
        )
        internal_lines = build_internal_lines(
            selected.geometry.tolist(),
            frame_union,
            forward,
            inverse,
            tolerance_m=lod_spec["tolerance_m"],
        )
        lod_payload[lod_key] = {
            "land": geometry_to_geojson(land),
            "prefectureLines": geometry_to_geojson(internal_lines),
        }

    return {
        "type": "main" if frame_id == "main" else "inset",
        "label": frame.label,
        "extent": frame.extent,
        "prefectureCodes": selected["iso_3166_2"].astype(str).tolist(),
        "fitGeometry": geometry_to_geojson(frame_union),
        "routeMask": geometry_to_geojson(frame_union),
        "lod": lod_payload,
    }


def build_carrier(spec: CarrierSpec, source: gpd.GeoDataFrame) -> None:
    output_dir = OUTPUT_ROOT / f"{spec.carrier_id}_carrier"
    carrier_path = output_dir / "carrier.json"
    provenance_path = output_dir / "provenance.json"
    manifest_path = output_dir / "manifest.json"
    forward, inverse, proj4 = make_transformers(spec)
    frames: dict[str, Any] = {}
    for frame_id, frame in spec.frames.items():
        selected = select_frame_features(source, spec, frame)
        frames[frame_id] = build_frame_payload(frame_id, frame, selected, forward, inverse)

    generated_at = utc_now()
    carrier_payload = {
        "version": f"{spec.carrier_id}_carrier_v1",
        "carrier_id": spec.carrier_id,
        "country": spec.carrier_id,
        "label": spec.label,
        "source": {"kind": "natural_earth_admin1", "path": rel(SOURCE_PATH)},
        "viewBox": {"width": VIEWBOX_WIDTH, "height": VIEWBOX_HEIGHT},
        "defaultCamera": spec.default_camera,
        "projection": {**spec.projection, "lodSwitch": spec.lod_switch},
        "frames": frames,
        "clipPolicy": {
            "land": "strict",
            "sea": "strict",
            "crossMask": "pack-aware-frame-resolution",
        },
    }
    provenance_payload = {
        "generatedAt": generated_at,
        "carrierId": spec.carrier_id,
        "source": rel(SOURCE_PATH),
        "sourceKind": "Natural Earth 10m admin1",
        "projection": {"proj4": proj4, **spec.projection},
        "viewBox": {"width": VIEWBOX_WIDTH, "height": VIEWBOX_HEIGHT},
        "defaultCamera": spec.default_camera,
        "lod": LOD_SPECS,
        "frames": {
            frame_id: {
                "type": payload["type"],
                "extent": payload["extent"],
                "prefectureCodes": payload["prefectureCodes"],
                "featureCount": len(payload["prefectureCodes"]),
            }
            for frame_id, payload in frames.items()
        },
        "scopePolicy": spec.scope_policy,
    }
    manifest = finalize_transport_manifest(
        {
            "adapter_id": f"{spec.carrier_id}_carrier_v1",
            "pack_id": f"{spec.carrier_id}_carrier",
            "family": "carrier",
            "geometry_kind": "carrier",
            "country": spec.carrier_id,
            "schema_version": 1,
            "generated_at": generated_at,
            "recipe_path": "tools/build_transport_country_carriers.py",
            "distribution_tier": "single_pack",
            "paths": {"carrier": rel(carrier_path), "provenance": rel(provenance_path)},
            "source_signature": {"natural_earth_admin1": rel(SOURCE_PATH)},
            "recipe_version": f"{spec.carrier_id}_carrier_v1",
            "feature_counts": {},
            "build_command": f"python tools/build_transport_country_carriers.py --carrier {spec.carrier_id}",
            "runtime_consumer": "transport_workbench_carrier",
            "source_policy": "checked_in_natural_earth_admin1",
        },
        default_variant="default",
        variants={
            "default": {
                "label": "default",
                "distribution_tier": "single_pack",
                "paths": {"carrier": rel(carrier_path), "provenance": rel(provenance_path)},
                "feature_counts": {},
            }
        },
        extension={
            "carrier_source_kind": "natural_earth_admin1",
            "carrier_asset_key": f"transport_carrier:{spec.carrier_id}",
            "scope_policy": spec.scope_policy,
            "projection_profile": spec.projection["type"],
            "basemap_profile": spec.basemap_profile,
        },
    )
    write_json(carrier_path, carrier_payload, compact=True)
    write_json(provenance_path, provenance_payload)
    write_json(manifest_path, manifest)
    print(f"[carrier] {spec.carrier_id}: {', '.join(frames)}")


def update_pack_manifest(path: Path) -> bool:
    payload = json.loads(path.read_text(encoding="utf-8"))
    pack_id = str(payload.get("pack_id") or path.parent.name).strip()
    carrier_asset_key = PACK_CARRIER_ASSET_KEYS.get(pack_id)
    if not carrier_asset_key:
        return False
    payload["carrier_asset_key"] = carrier_asset_key
    carrier_extension = payload.setdefault("extensions", {}).setdefault("carrier", {})
    carrier_extension["carrier_asset_key"] = carrier_asset_key
    carrier_extension.setdefault("scope_policy", "pack country carrier")
    carrier_extension.setdefault("projection_profile", carrier_asset_key.removeprefix("transport_carrier:"))
    write_json(path, payload)
    return True


def update_pack_manifests() -> None:
    updated = 0
    for pack_id in sorted(PACK_CARRIER_ASSET_KEYS):
        manifest_path = OUTPUT_ROOT / pack_id / "manifest.json"
        if manifest_path.exists() and update_pack_manifest(manifest_path):
            updated += 1
    print(f"[manifest] carrier_asset_key updated for {updated} pack manifests")


def update_runtime_asset_registry() -> None:
    payload = json.loads(RUNTIME_ASSET_REGISTRY.read_text(encoding="utf-8"))
    assets = payload.setdefault("assets", {})
    for asset_key, url in sorted(CARRIER_RUNTIME_ASSETS.items()):
        assets[asset_key] = {
            "url": url,
            "role": "transport_workbench_carrier",
            "family_id": asset_key.removeprefix("transport_carrier:"),
        }
    write_json(RUNTIME_ASSET_REGISTRY, payload)
    print(f"[registry] runtime carrier assets: {len(CARRIER_RUNTIME_ASSETS)}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--carrier", action="append", choices=sorted(SPECS), help="Build only the selected carrier. Repeatable.")
    parser.add_argument("--skip-pack-manifests", action="store_true")
    args = parser.parse_args()

    source = load_admin1()
    carrier_ids = args.carrier or sorted(SPECS)
    for carrier_id in carrier_ids:
        build_carrier(SPECS[carrier_id], source)
    if not args.skip_pack_manifests:
        update_pack_manifests()
    update_runtime_asset_registry()


if __name__ == "__main__":
    main()



