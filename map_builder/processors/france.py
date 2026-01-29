"""France replacement processor."""
from __future__ import annotations

import geopandas as gpd
import pandas as pd

from map_builder import config as cfg
from map_builder.io.fetch import fetch_or_load_geojson


def apply_holistic_replacements(main_gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    if main_gdf.empty:
        return main_gdf
    if "cntr_code" not in main_gdf.columns:
        print("[Holistic] cntr_code missing; skipping France replacement.")
        return main_gdf

    base = main_gdf[main_gdf["cntr_code"].astype(str).str.upper() != "FR"].copy()
    print(f"  [Holistic] Features after removing FR: {len(base)}")

    fr_gdf = fetch_or_load_geojson(
        cfg.FR_ARR_URL,
        cfg.FR_ARR_FILENAME,
        fallback_urls=cfg.FR_ARR_FALLBACK_URLS,
    )

    if fr_gdf.empty:
        print("Arrondissements GeoDataFrame is empty.")
        raise SystemExit(1)

    if fr_gdf.crs is None:
        fr_gdf = fr_gdf.set_crs("EPSG:4326", allow_override=True)
    if fr_gdf.crs.to_epsg() != 4326:
        fr_gdf = fr_gdf.to_crs("EPSG:4326")

    if "code" not in fr_gdf.columns or "nom" not in fr_gdf.columns:
        print("Arrondissements dataset missing expected columns: code/nom.")
        raise SystemExit(1)

    fr_gdf = fr_gdf.copy()
    fr_gdf["id"] = "FR_ARR_" + fr_gdf["code"].astype(str)
    fr_gdf["name"] = fr_gdf["nom"].astype(str)
    fr_gdf["cntr_code"] = "FR"
    fr_gdf = fr_gdf[["id", "name", "cntr_code", "geometry"]].copy()
    fr_gdf["geometry"] = fr_gdf.geometry.simplify(
        tolerance=cfg.SIMPLIFY_NUTS3, preserve_topology=True
    )

    combined = pd.concat([base, fr_gdf], ignore_index=True)
    return gpd.GeoDataFrame(combined, crs=main_gdf.crs)
