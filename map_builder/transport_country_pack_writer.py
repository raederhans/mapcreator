from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable

import geopandas as gpd
import pandas as pd
import topojson as tp


RelPath = Callable[[Path], str]


def write_json(path: Path, payload: Any, *, compact: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = (
        json.dumps(payload, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
        if compact
        else json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False)
    )
    path.write_text(text + ("" if compact else "\n"), encoding="utf-8")


def feature_collection(gdf: gpd.GeoDataFrame) -> dict[str, Any]:
    if gdf.crs is not None:
        gdf = gdf.to_crs("EPSG:4326")
    return json.loads(gdf.to_json(drop_id=True))


def topology_payload(gdf: gpd.GeoDataFrame, object_name: str) -> dict[str, Any]:
    if gdf.empty:
        return {"type": "Topology", "objects": {object_name: {"type": "GeometryCollection", "geometries": []}}, "arcs": []}
    if gdf.crs is not None:
        gdf = gdf.to_crs("EPSG:4326")
    payload = tp.Topology(gdf, prequantize=False).to_dict()
    objects = payload.get("objects") or {}
    if object_name not in objects and len(objects) == 1:
        only_key = next(iter(objects))
        payload["objects"] = {object_name: objects[only_key]}
    return payload


def country_pack_layer_suffix(geometry_kind: str, layer: str) -> str:
    return ".topo.json" if geometry_kind == "line" and layer in {"roads", "railways"} else ".geojson"


def write_country_pack_layers(
    output_dir: Path,
    geometry_kind: str,
    preview: dict[str, gpd.GeoDataFrame],
    full: dict[str, gpd.GeoDataFrame],
    *,
    rel_path: RelPath,
) -> dict[str, Any]:
    paths: dict[str, Any] = {"preview": {}, "full": {}, "build_audit": rel_path(output_dir / "build_audit.json")}
    for layer, gdf in preview.items():
        suffix = country_pack_layer_suffix(geometry_kind, layer)
        path = output_dir / f"{layer}.preview{suffix}"
        write_json(path, topology_payload(gdf, layer) if suffix == ".topo.json" else feature_collection(gdf), compact=True)
        paths["preview"][layer] = rel_path(path)
    for layer, gdf in full.items():
        suffix = country_pack_layer_suffix(geometry_kind, layer)
        path = output_dir / f"{layer}{suffix}"
        write_json(path, topology_payload(gdf, layer) if suffix == ".topo.json" else feature_collection(gdf), compact=True)
        paths["full"][layer] = rel_path(path)
    return paths


def country_pack_feature_counts(
    preview: dict[str, gpd.GeoDataFrame],
    full: dict[str, gpd.GeoDataFrame],
) -> dict[str, dict[str, int]]:
    return {
        "preview": {layer: int(len(gdf)) for layer, gdf in preview.items()},
        "full": {layer: int(len(gdf)) for layer, gdf in full.items()},
    }


def country_pack_clip_bbox(
    preview: dict[str, gpd.GeoDataFrame],
    full: dict[str, gpd.GeoDataFrame],
) -> list[float] | None:
    all_geoms = [gdf for gdf in list(preview.values()) + list(full.values()) if not gdf.empty and "geometry" in gdf]
    if not all_geoms:
        return None
    merged = pd.concat(all_geoms, ignore_index=True)
    bbox = gpd.GeoDataFrame(merged, geometry="geometry", crs="EPSG:4326").total_bounds
    return [round(float(value), 6) for value in bbox]
