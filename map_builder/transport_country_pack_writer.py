from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable, Iterable

import geopandas as gpd
import pandas as pd
import topojson as tp


RelPath = Callable[[Path], str]
FinalizeManifest = Callable[..., dict[str, Any]]


def write_json(path: Path, payload: Any, *, compact: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = (
        json.dumps(payload, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
        if compact
        else json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False)
    )
    path.write_bytes((text + ("" if compact else "\n")).encode("utf-8"))


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


def source_signature(recipe: dict[str, Any]) -> dict[str, Any]:
    return recipe.get("source_signature") or {}


def write_country_pack(
    output_dir: Path,
    *,
    pack_id: str,
    family: str,
    geometry_kind: str,
    country: str,
    recipe: dict[str, Any],
    preview: dict[str, gpd.GeoDataFrame],
    full: dict[str, gpd.GeoDataFrame],
    audit_extra: dict[str, Any],
    build_command: str,
    generated_at: str,
    rel_path: RelPath,
    carrier_asset_key: str,
    carrier_extension: dict[str, Any],
    finalize_manifest: FinalizeManifest,
    main_map_consumer_keys: Iterable[str] | None = None,
    main_map_sidecars: dict[str, Any] | None = None,
) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    paths = write_country_pack_layers(output_dir, geometry_kind, preview, full, rel_path=rel_path)
    counts = country_pack_feature_counts(preview, full)
    bbox = country_pack_clip_bbox(preview, full)
    recipe_signature = source_signature(recipe)
    resolved_carrier_extension = {
        **carrier_extension,
        "carrier_asset_key": carrier_asset_key,
    }

    audit = {
        "generated_at": generated_at,
        "adapter_id": f"{pack_id}_v1",
        "pack_id": pack_id,
        "source_policy": "real_source_cache_only",
        "source_truth": recipe.get("source_truth"),
        "geometry_truth": recipe.get("geometry_truth"),
        "source_signature": recipe_signature,
        "feature_counts": counts,
        **audit_extra,
    }
    write_json(output_dir / "build_audit.json", audit)

    manifest = {
        "adapter_id": f"{pack_id}_v1",
        "pack_id": pack_id,
        "family": family,
        "geometry_kind": geometry_kind,
        "country": country,
        "schema_version": 1,
        "generated_at": generated_at,
        "recipe_path": rel_path(output_dir / "source_recipe.manual.json"),
        "distribution_tier": "single_pack",
        "paths": paths,
        "source_signature": recipe_signature,
        "recipe_version": recipe["version"],
        "feature_counts": counts,
        "clip_bbox": bbox,
        "build_command": build_command,
        "runtime_consumer": f"transport_workbench_{family}_preview",
        "source_policy": "real_source_cache_only",
        "carrier_asset_key": carrier_asset_key,
    }
    consumer_keys = list(main_map_consumer_keys or ())
    if consumer_keys:
        manifest.update(
            {
                "mainMapEligible": True,
                "apply_bridge_supported": True,
                "coverage_scope": "country",
                "main_map_consumer": {
                    "family": family,
                    "supported_keys": consumer_keys,
                },
            }
        )
        if main_map_sidecars:
            manifest["sidecars"] = main_map_sidecars

    manifest = finalize_manifest(
        manifest,
        default_variant="default",
        variants={
            "default": {
                "label": "default",
                "distribution_tier": "single_pack",
                "paths": paths,
                "feature_counts": counts,
            }
        },
        extension=resolved_carrier_extension,
    )
    manifest.setdefault("extensions", {}).setdefault("carrier", {}).update(resolved_carrier_extension)
    write_json(output_dir / "manifest.json", manifest)
    return {"audit": audit, "manifest": manifest, "paths": paths, "feature_counts": counts, "clip_bbox": bbox}
