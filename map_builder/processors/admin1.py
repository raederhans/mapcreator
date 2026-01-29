"""Admin-1 extension and country code helpers."""
from __future__ import annotations

import geopandas as gpd
import pandas as pd

from map_builder import config as cfg
from map_builder.geo.utils import clip_to_europe_bounds, pick_column
from map_builder.io.fetch import fetch_ne_zip


def extract_country_code(id_val: object) -> str:
    s = str(id_val)
    if "_" in s:
        parts = s.split("_")
        for part in parts:
            if len(part) == 2 and part.isalpha() and part.isupper():
                return part
    prefix = s[:2]
    if len(prefix) == 2 and prefix.isalpha() and prefix.isupper():
        return prefix
    return ""


def build_extension_admin1(land: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    admin1 = fetch_ne_zip(cfg.ADMIN1_URL, "admin1")
    admin1 = admin1.to_crs("EPSG:4326")
    admin1 = clip_to_europe_bounds(admin1, "admin1")

    name_col = pick_column(admin1, ["adm0_name", "admin", "admin0_name"])
    iso_col = pick_column(admin1, ["iso_a2", "adm0_a2", "iso_3166_1_"])
    code_col = pick_column(admin1, ["adm1_code", "gn_id", "id"])

    if not name_col or not iso_col:
        print("Admin1 dataset missing expected country columns.")
        raise SystemExit(1)

    admin1 = admin1[
        admin1[iso_col].isin(cfg.EXTENSION_COUNTRIES)
        | admin1[name_col].isin(
            {
                "Russia",
                "Belarus",
                "Moldova",
                "Georgia",
                "Armenia",
                "Azerbaijan",
                "Mongolia",
                "Japan",
                "South Korea",
                "North Korea",
                "Taiwan",
                "Nepal",
                "Bhutan",
                "Myanmar",
                "Sri Lanka",
            }
        )
    ].copy()

    if admin1.empty:
        print("Admin1 filter returned empty dataset.")
        raise SystemExit(1)

    ru_mask = admin1[iso_col].isin({"RU"}) | admin1[name_col].isin({"Russia"})
    ru = admin1[ru_mask].copy()
    rest = admin1[~ru_mask].copy()

    admin1 = gpd.GeoDataFrame(pd.concat([rest, ru], ignore_index=True), crs="EPSG:4326")

    if code_col is None:
        admin1["adm1_code"] = (
            admin1[iso_col].astype(str) + "_" + admin1.get("name", "adm1").astype(str)
        )
        code_col = "adm1_code"

    admin1 = admin1.rename(
        columns={
            code_col: "id",
            "name": "name",
            iso_col: "cntr_code",
        }
    )
    admin1["id"] = admin1["id"].astype(str)
    if "name" not in admin1.columns and "name_en" in admin1.columns:
        admin1["name"] = admin1["name_en"]

    admin1 = admin1[["id", "name", "cntr_code", "geometry"]].copy()
    admin1["geometry"] = admin1.geometry.simplify(
        tolerance=cfg.SIMPLIFY_ADMIN1, preserve_topology=True
    )
    return admin1
