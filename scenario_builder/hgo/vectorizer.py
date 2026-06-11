from __future__ import annotations

import struct
from collections import Counter
from pathlib import Path
from typing import Any

import geopandas as gpd
import numpy as np
import pandas as pd
from rasterio.features import shapes
from rasterio.transform import Affine
from shapely.geometry import shape
from shapely.ops import unary_union
from topojson import Topology

from scenario_builder.hoi4.models import RuntimeFeatureRecord

TOPO_PREQUANTIZE = 1_000_000


def hgo_state_feature_id(state_id: int | str) -> str:
    return f"HGO-S{int(state_id)}"


def read_bmp24_pixels(path: Path) -> np.ndarray:
    data = path.read_bytes()
    if len(data) < 54:
        raise ValueError(f"BMP source is too small: {path}")
    if data[:2] != b"BM":
        raise ValueError(f"BMP source must start with BM signature: {path}")

    pixel_offset = struct.unpack_from("<I", data, 10)[0]
    dib_header_size = struct.unpack_from("<I", data, 14)[0]
    if dib_header_size < 40:
        raise ValueError(f"Unsupported BMP DIB header size {dib_header_size}: {path}")
    width = struct.unpack_from("<i", data, 18)[0]
    signed_height = struct.unpack_from("<i", data, 22)[0]
    planes = struct.unpack_from("<H", data, 26)[0]
    bits_per_pixel = struct.unpack_from("<H", data, 28)[0]
    compression = struct.unpack_from("<I", data, 30)[0]
    if width <= 0 or signed_height == 0:
        raise ValueError(f"BMP source has invalid dimensions {width}x{signed_height}: {path}")
    if planes != 1 or bits_per_pixel != 24 or compression != 0:
        raise ValueError(
            "HGO scenario vectorizer supports uncompressed RGB24 BMP only. "
            f"planes={planes} bits={bits_per_pixel} compression={compression}"
        )

    height = abs(signed_height)
    row_stride = ((width * 3 + 3) // 4) * 4
    expected_size = pixel_offset + row_stride * height
    if len(data) < expected_size:
        raise ValueError(f"BMP source is truncated: expected {expected_size} bytes, found {len(data)}")

    raw = np.frombuffer(data, dtype=np.uint8, count=row_stride * height, offset=pixel_offset)
    rows = raw.reshape((height, row_stride))[:, : width * 3].reshape((height, width, 3))
    rgb = rows[:, :, ::-1]
    if signed_height > 0:
        rgb = rgb[::-1, :, :]
    return np.ascontiguousarray(rgb)


def _state_index(seed: dict[str, Any]) -> dict[int, dict[str, Any]]:
    states = seed.get("states") if isinstance(seed.get("states"), list) else []
    return {
        int(state["id"]): state
        for state in states
        if isinstance(state, dict) and str(state.get("id") or "").strip()
    }


def _rgb_to_state_lookup(seed: dict[str, Any]) -> np.ndarray:
    province_to_state = seed.get("province_to_state") if isinstance(seed.get("province_to_state"), dict) else {}
    provinces = seed.get("provinces") if isinstance(seed.get("provinces"), dict) else {}
    lookup = np.zeros(256 * 256 * 256, dtype=np.int32)
    for province_id, state_id in province_to_state.items():
        province = provinces.get(str(province_id))
        if not isinstance(province, dict):
            continue
        rgb_key = province.get("rgb_key")
        if rgb_key is None:
            rgb = province.get("rgb")
            if not isinstance(rgb, list) or len(rgb) != 3:
                continue
            rgb_key = (int(rgb[0]) << 16) | (int(rgb[1]) << 8) | int(rgb[2])
        lookup[int(rgb_key)] = int(state_id)
    return lookup


def build_state_label_grid(seed: dict[str, Any], provinces_bmp_path: Path) -> np.ndarray:
    pixels = read_bmp24_pixels(provinces_bmp_path)
    rgb_keys = (
        (pixels[:, :, 0].astype(np.uint32) << 16)
        | (pixels[:, :, 1].astype(np.uint32) << 8)
        | pixels[:, :, 2].astype(np.uint32)
    )
    return _rgb_to_state_lookup(seed)[rgb_keys].astype(np.int32, copy=False)


def _valid_geometry(geometry: Any) -> Any:
    if geometry is None or geometry.is_empty:
        return geometry
    if geometry.is_valid:
        return geometry
    return geometry.buffer(0)


def _topology_from_gdf(gdf: gpd.GeoDataFrame) -> dict[str, Any]:
    safe_gdf = gdf.copy()
    for column in safe_gdf.columns:
        if column == "geometry":
            continue
        safe_gdf[column] = safe_gdf[column].astype(object).where(pd.notna(safe_gdf[column]), None)
    topo = Topology(
        safe_gdf,
        object_name="political",
        topology=True,
        prequantize=TOPO_PREQUANTIZE,
        topoquantize=False,
        presimplify=False,
        toposimplify=False,
        shared_coords=True,
    ).to_dict()
    geometries = topo.get("objects", {}).get("political", {}).get("geometries", [])
    if isinstance(geometries, list):
        for geometry in geometries:
            if not isinstance(geometry, dict):
                continue
            props = geometry.get("properties") if isinstance(geometry.get("properties"), dict) else {}
            feature_id = str(props.get("id") or "").strip()
            if feature_id:
                geometry["id"] = feature_id
    return topo


def vectorize_hgo_states(
    seed: dict[str, Any],
    provinces_bmp_path: Path,
) -> tuple[dict[str, Any], list[RuntimeFeatureRecord], dict[str, Any]]:
    state_grid = build_state_label_grid(seed, provinces_bmp_path)
    mask = state_grid > 0
    if not mask.any():
        raise ValueError("HGO state vectorization found no mapped state pixels.")

    height, width = state_grid.shape
    transform = Affine(360.0 / width, 0.0, -180.0, 0.0, -180.0 / height, 90.0)
    records: list[dict[str, Any]] = []
    for geometry, value in shapes(state_grid, mask=mask, transform=transform):
        state_id = int(value)
        if state_id <= 0:
            continue
        records.append({"state_id": state_id, "geometry": shape(geometry)})
    if not records:
        raise ValueError("HGO state vectorization produced no geometries.")

    state_lookup = _state_index(seed)
    grouped: dict[int, list[Any]] = {}
    for record in records:
        grouped.setdefault(record["state_id"], []).append(record["geometry"])

    features: list[dict[str, Any]] = []
    runtime_features: list[RuntimeFeatureRecord] = []
    owner_counts: Counter[str] = Counter()
    for state_id, geometries in sorted(grouped.items()):
        state = state_lookup.get(state_id, {})
        owner_tag = str(state.get("owner") or "").strip().upper()
        controller_tag = str(state.get("controller") or owner_tag).strip().upper()
        feature_id = hgo_state_feature_id(state_id)
        name = str(state.get("name_key") or f"HGO State {state_id}").strip()
        geometry = _valid_geometry(unary_union(geometries))
        if geometry is None or geometry.is_empty:
            continue
        owner_counts[owner_tag] += 1
        features.append(
            {
                "id": feature_id,
                "name": name,
                "cntr_code": owner_tag,
                "country_code": owner_tag,
                "hgo_state_id": state_id,
                "hgo_owner_tag": owner_tag,
                "hgo_controller_tag": controller_tag,
                "hgo_category": str(state.get("category") or "").strip(),
                "detail_tier": "hgo_state",
                "geometry": geometry,
            }
        )
        runtime_features.append(
            RuntimeFeatureRecord(
                feature_id=feature_id,
                country_code=owner_tag,
                name=name,
                admin1_group=f"HGO_STATE_{state_id}",
                detail_tier="hgo_state",
            )
        )
    if not features:
        raise ValueError("HGO state vectorization produced only empty geometries.")

    gdf = gpd.GeoDataFrame(features, geometry="geometry", crs="EPSG:4326")
    topology = _topology_from_gdf(gdf)
    diagnostics = {
        "raster_width": width,
        "raster_height": height,
        "state_pixel_count": int(mask.sum()),
        "vectorized_state_count": len(features),
        "owner_count": len(owner_counts),
        "top_owner_feature_counts": dict(owner_counts.most_common(20)),
    }
    return topology, runtime_features, diagnostics
