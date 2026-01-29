"""File readers and helpers for map pipeline."""
from __future__ import annotations

from typing import Iterable

import geopandas as gpd


def load_natural_earth_admin0(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Normalize an admin0 layer for ISO A2 lookups (CRS WGS84)."""
    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:4326", allow_override=True)
    elif gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs("EPSG:4326")
    return gdf
