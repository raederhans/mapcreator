"""Initialize and prepare NUTS-3 map data for Map Creator."""
from __future__ import annotations

import json
import math
import sys
import subprocess
import tempfile
import zipfile
from pathlib import Path
from typing import Iterable


try:
    from importlib import util as importlib_util
except Exception:  # pragma: no cover - fallback if importlib is shadowed
    import pkgutil

    def find_spec(name: str):
        return pkgutil.find_loader(name)
else:

    def find_spec(name: str):
        return importlib_util.find_spec(name)


def ensure_packages(packages: Iterable[str]) -> None:
    missing = []
    for name in packages:
        if find_spec(name) is None:
            missing.append(name)
    if not missing:
        return

    print(f"Installing missing packages: {', '.join(missing)}")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", *missing])
    except subprocess.CalledProcessError as exc:
        print("Failed to install required packages.")
        raise SystemExit(exc.returncode) from exc


ensure_packages(["geopandas", "matplotlib", "mapclassify", "requests", "shapely", "topojson"])

import geopandas as gpd
import matplotlib.pyplot as plt
import pandas as pd
import requests
import topojson as tp
from shapely.geometry import Point, box
from shapely.ops import transform

from tools import generate_hierarchy, translate_manager

URL = (
    "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/"
    "NUTS_RG_10M_2021_3035_LEVL_3.geojson"
)
RIVERS_URL = "https://naturalearth.s3.amazonaws.com/10m_physical/ne_10m_rivers_lake_centerlines.zip"
BORDERS_URL = "https://naturalearth.s3.amazonaws.com/10m_cultural/ne_10m_admin_0_countries.zip"
BORDER_LINES_URL = "https://naturalearth.s3.amazonaws.com/10m_cultural/ne_10m_admin_0_boundary_lines_land.zip"
OCEAN_URL = "https://naturalearth.s3.amazonaws.com/10m_physical/ne_10m_ocean.zip"
LAND_BG_URL = "https://naturalearth.s3.amazonaws.com/10m_physical/ne_10m_land.zip"
URBAN_URL = "https://naturalearth.s3.amazonaws.com/10m_cultural/ne_10m_urban_areas.zip"
PHYSICAL_URL = "https://naturalearth.s3.amazonaws.com/10m_physical/ne_10m_geography_regions_polys.zip"
ADMIN1_URL = "https://naturalearth.s3.amazonaws.com/10m_cultural/ne_10m_admin_1_states_provinces.zip"
FR_ARR_URL = "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/arrondissements.geojson"
FR_ARR_FALLBACK_URL = "https://cdn.jsdelivr.net/gh/gregoiredavid/france-geojson@master/arrondissements.geojson"
PL_POWIATY_URL = "https://raw.githubusercontent.com/jusuff/PolandGeoJson/main/data/poland.counties.json"
CHINA_CITY_URL = (
    "https://github.com/wmgeolab/geoBoundaries/raw/main/releaseData/gbOpen/CHN/ADM2/"
    "geoBoundaries-CHN-ADM2.geojson"
)
RUS_ADM2_URL = (
    "https://github.com/wmgeolab/geoBoundaries/raw/main/releaseData/gbOpen/RUS/ADM2/"
    "geoBoundaries-RUS-ADM2.geojson"
)
UKR_ADM2_URL = (
    "https://github.com/wmgeolab/geoBoundaries/raw/main/releaseData/gbOpen/UKR/ADM2/"
    "geoBoundaries-UKR-ADM2.geojson"
)

COUNTRY_CODES = {"DE", "PL", "IT", "FR", "NL", "BE", "LU", "AT", "CH"}
EXTENSION_COUNTRIES = {
    "RU",
    "BY",
    "MD",
    "KZ",
    "UZ",
    "TM",
    "KG",
    "TJ",
    "GE",
    "AM",
    "AZ",
    "MN",
    "JP",
    "KR",
    "KP",
    "TW",
}
EXCLUDED_NUTS_PREFIXES = ("FRY", "PT2", "PT3", "ES7")
EUROPE_BOUNDS = (-25.0, 10.0, 180.0, 83.0)

# Simplification tolerances (WGS84 degrees)
SIMPLIFY_NUTS3 = 0.002
SIMPLIFY_ADMIN1 = 0.02
SIMPLIFY_BORDERS = 0.005
SIMPLIFY_BORDER_LINES = 0.003
SIMPLIFY_BACKGROUND = 0.03
SIMPLIFY_URBAN = 0.01
SIMPLIFY_PHYSICAL = 0.02
SIMPLIFY_CHINA = 0.01
SIMPLIFY_RU_UA = 0.025
URAL_LONGITUDE = 60.0

VIP_POINTS = [
    ("Malta", (14.3754, 35.9375)),
    ("Isle of Wight", (-1.3047, 50.6938)),
    ("Ibiza", (1.4206, 38.9067)),
    ("Menorca", (4.1105, 39.9496)),
    ("Rugen", (13.3915, 54.4174)),
    ("Bornholm", (14.9141, 55.127)),
    ("Jersey", (-2.1312, 49.2144)),
    ("Aland Islands", (19.9156, 60.1785)),
]


def fetch_geojson(url: str) -> dict:
    print("Downloading GeoJSON...")
    try:
        response = requests.get(url, timeout=(10, 60))
        response.raise_for_status()
    except requests.RequestException as exc:
        print(f"Download failed: {exc}")
        raise SystemExit(1) from exc
    try:
        return response.json()
    except ValueError as exc:
        print("Failed to decode GeoJSON response.")
        raise SystemExit(1) from exc


def fetch_ne_zip(url: str, label: str) -> gpd.GeoDataFrame:
    print(f"Downloading Natural Earth {label}...")
    try:
        response = requests.get(url, timeout=(10, 120))
        response.raise_for_status()
    except requests.RequestException as exc:
        print(f"{label} download failed: {exc}")
        raise SystemExit(1) from exc

    with tempfile.TemporaryDirectory() as temp_dir:
        zip_path = Path(temp_dir) / f"{label}.zip"
        zip_path.write_bytes(response.content)
        try:
            with zipfile.ZipFile(zip_path) as zf:
                zf.extractall(temp_dir)
        except zipfile.BadZipFile as exc:
            print(f"Failed to read {label} ZIP archive.")
            raise SystemExit(1) from exc

        print(f"Reading {label} dataset...")
        gdf = gpd.read_file(temp_dir)

    if gdf.empty:
        print(f"{label} GeoDataFrame is empty. Check the download.")
        raise SystemExit(1)
    return gdf


def _build_mirror_urls(url: str) -> list[str]:
    mirrors: list[str] = []
    if "raw.githubusercontent.com" in url:
        mirrors.append(f"https://mirror.ghproxy.com/{url}")
        raw_path = url.replace("https://raw.githubusercontent.com/", "")
        parts = raw_path.split("/", 3)
        if len(parts) == 4:
            user, repo, branch, path = parts
            mirrors.append(f"https://cdn.jsdelivr.net/gh/{user}/{repo}@{branch}/{path}")
    elif "github.com" in url and "/raw/" in url:
        mirrors.append(f"https://mirror.ghproxy.com/{url}")
        gh_path = url.replace("https://github.com/", "")
        parts = gh_path.split("/", 4)
        if len(parts) >= 5 and parts[2] == "raw":
            user, repo, _, branch, path = parts[0], parts[1], parts[2], parts[3], parts[4]
            mirrors.append(f"https://raw.githubusercontent.com/{user}/{repo}/{branch}/{path}")
            mirrors.append(f"https://cdn.jsdelivr.net/gh/{user}/{repo}@{branch}/{path}")
    return mirrors


def fetch_or_load_geojson(url: str, filename: str, fallback_urls: list[str] | None = None) -> gpd.GeoDataFrame:
    script_dir = Path(__file__).resolve().parent
    cache_dir = script_dir / "data"
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_path = cache_dir / filename

    if cache_path.exists():
        print(f"   [Cache] Loading {filename} from local file...")
        try:
            return gpd.read_file(cache_path)
        except Exception as exc:
            print(f"Failed to read cached {filename}: {exc}")
            raise SystemExit(1) from exc

    print(f"   [Download] Fetching {filename} from remote...")
    sources = [url]
    if fallback_urls:
        sources.extend(fallback_urls)
    for source in list(sources):
        sources.extend(_build_mirror_urls(source))
    # Deduplicate while preserving order
    seen = set()
    unique_sources = []
    for source in sources:
        if source in seen:
            continue
        seen.add(source)
        unique_sources.append(source)

    def download_with_retries(source: str, attempts: int = 3) -> bool:
        for attempt in range(1, attempts + 1):
            try:
                response = requests.get(
                    source,
                    timeout=(10, 60),
                    headers={"User-Agent": "MapCreator/1.0"},
                )
                response.raise_for_status()
                cache_path.write_bytes(response.content)
                return True
            except requests.RequestException as exc:
                print(f"   [Download] {source} attempt {attempt}/{attempts} failed: {exc}")
        return False

    downloaded = False
    for source in unique_sources:
        if download_with_retries(source):
            downloaded = True
            break

    if not downloaded:
        print(f"Failed to download {filename} from all sources.")
        raise SystemExit(1)

    try:
        return gpd.read_file(cache_path)
    except Exception as exc:
        print(f"Failed to read downloaded {filename}: {exc}")
        raise SystemExit(1) from exc


def build_geodataframe(data: dict) -> gpd.GeoDataFrame:
    print("Parsing GeoJSON into GeoDataFrame...")
    gdf = gpd.GeoDataFrame.from_features(data.get("features", []))
    if gdf.empty:
        print("GeoDataFrame is empty. Check the downloaded data.")
        raise SystemExit(1)
    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:3035", allow_override=True)
    if gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs("EPSG:4326")
    return gdf


def filter_countries(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    print("Filtering NUTS-3 to Europe...")
    filtered = gdf.copy()
    if "NUTS_ID" in filtered.columns:
        mask = ~filtered["NUTS_ID"].str.startswith(EXCLUDED_NUTS_PREFIXES)
        filtered = filtered[mask]
    else:
        print("Column NUTS_ID not found; overseas prefix filter skipped.")

    try:
        gdf_ll = filtered.to_crs("EPSG:4326")
        reps = gdf_ll.geometry.representative_point()
        geo_mask = (reps.y >= 30) & (reps.x >= -30)
        filtered = filtered.loc[geo_mask].copy()
    except Exception as exc:
        print(f"Geographic filter skipped due to error: {exc}")

    if filtered.empty:
        print("Filtered GeoDataFrame is empty. Check NUTS data scope.")
        raise SystemExit(1)
    return filtered


def pick_column(df: gpd.GeoDataFrame, candidates: Iterable[str]) -> str | None:
    for col in candidates:
        if col in df.columns:
            return col
    return None


def round_geometries(gdf: gpd.GeoDataFrame, precision: int = 4) -> gpd.GeoDataFrame:
    if gdf.empty:
        return gdf

    def _rounder(x, y, z=None):
        rx = round(x, precision)
        ry = round(y, precision)
        if z is None:
            return (rx, ry)
        return (rx, ry, round(z, precision))

    gdf = gdf.copy()
    gdf["geometry"] = gdf.geometry.apply(
        lambda geom: transform(_rounder, geom) if geom is not None else geom
    )
    return gdf


def apply_holistic_replacements(main_gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    if main_gdf.empty:
        return main_gdf
    if "cntr_code" not in main_gdf.columns:
        print("[Holistic] cntr_code missing; skipping France replacement.")
        return main_gdf

    base = main_gdf[main_gdf["cntr_code"].astype(str).str.upper() != "FR"].copy()
    print(f"  [Holistic] Features after removing FR: {len(base)}")

    fr_gdf = fetch_or_load_geojson(
        FR_ARR_URL,
        "france_arrondissements.geojson",
        fallback_urls=[FR_ARR_FALLBACK_URL],
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
        tolerance=SIMPLIFY_NUTS3, preserve_topology=True
    )

    combined = pd.concat([base, fr_gdf], ignore_index=True)
    return gpd.GeoDataFrame(combined, crs=main_gdf.crs)


def apply_poland_replacement(main_gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    if main_gdf.empty:
        return main_gdf
    if "cntr_code" not in main_gdf.columns:
        print("[Poland] cntr_code missing; skipping Poland replacement.")
        return main_gdf

    base = main_gdf[main_gdf["cntr_code"].astype(str).str.upper() != "PL"].copy()

    print("Downloading Poland powiaty...")
    pl_gdf = fetch_or_load_geojson(
        PL_POWIATY_URL,
        "poland_powiaty.geojson",
        fallback_urls=[
            "https://cdn.jsdelivr.net/gh/jusuff/PolandGeoJson@main/data/poland.counties.json"
        ],
    )

    if pl_gdf.empty:
        print("Powiaty GeoDataFrame is empty.")
        raise SystemExit(1)

    print(f"   [Debug] Poland Columns: {pl_gdf.columns.tolist()}")
    if not pl_gdf.empty:
        sample = pl_gdf.iloc[0].drop(labels=["geometry"], errors="ignore").to_dict()
        print(f"   [Debug] First row sample: {json.dumps(sample, ensure_ascii=True)}")

    pl_gdf = pl_gdf.copy()
    try:
        pl_gdf["geometry"] = pl_gdf.geometry.make_valid()
    except Exception as exc:
        print(f"   [Poland] make_valid failed; continuing without: {exc}")

    if pl_gdf.crs is None:
        pl_gdf = pl_gdf.set_crs("EPSG:4326", allow_override=True)
    if pl_gdf.crs.to_epsg() != 4326:
        pl_gdf = pl_gdf.to_crs("EPSG:4326")

    # Guard against datasets with bogus CRS or empty/invalid geometries.
    pl_gdf = pl_gdf[~pl_gdf.is_empty].copy()
    pl_gdf = pl_gdf[pl_gdf.geometry.notna()].copy()
    pl_gdf = pl_gdf[pl_gdf.geometry.is_valid].copy()

    if "terc" not in pl_gdf.columns or "name" not in pl_gdf.columns:
        raise ValueError(
            "Poland counties dataset missing expected columns: terc/name. "
            f"Available: {pl_gdf.columns.tolist()}"
        )

    pl_gdf["id"] = "PL_POW_" + pl_gdf["terc"].astype(str)
    pl_gdf["name"] = pl_gdf["name"].astype(str)
    pl_gdf["cntr_code"] = "PL"
    # Drop oversized artifacts using area in EPSG:4326 (square degrees).
    pl_gdf["temp_area"] = pl_gdf.geometry.area
    before_count = len(pl_gdf)
    pl_gdf = pl_gdf[pl_gdf["temp_area"] < 2.0].copy()
    after_count = len(pl_gdf)
    print(f"   [Poland Clean] Removed {before_count - after_count} oversized artifact(s).")
    pl_gdf = pl_gdf.drop(columns=["temp_area"])
    pl_gdf = pl_gdf[["id", "name", "cntr_code", "geometry"]].copy()
    pl_gdf["geometry"] = pl_gdf.geometry.simplify(
        tolerance=SIMPLIFY_NUTS3, preserve_topology=True
    )

    combined = pd.concat([base, pl_gdf], ignore_index=True)
    print(f"[Poland] Replacement: Loaded {len(pl_gdf)} counties (Goal: ~380).")
    return gpd.GeoDataFrame(combined, crs=main_gdf.crs)


def apply_china_replacement(main_gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    if main_gdf.empty:
        return main_gdf
    if "cntr_code" not in main_gdf.columns:
        print("[China] cntr_code missing; skipping China replacement.")
        return main_gdf

    base = main_gdf[main_gdf["cntr_code"].astype(str).str.upper() != "CN"].copy()

    print("Downloading China ADM2 (geoBoundaries)...")
    cn_gdf = fetch_or_load_geojson(
        CHINA_CITY_URL,
        "china_adm2.geojson",
        fallback_urls=[
            "https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/CHN/ADM2/geoBoundaries-CHN-ADM2.geojson",
            "https://cdn.jsdelivr.net/gh/wmgeolab/geoBoundaries@main/releaseData/gbOpen/CHN/ADM2/geoBoundaries-CHN-ADM2.geojson",
        ],
    )

    if cn_gdf.empty:
        print("China city GeoDataFrame is empty.")
        raise SystemExit(1)

    print(f"   [Debug] China Columns: {cn_gdf.columns.tolist()}")
    if not cn_gdf.empty:
        sample = cn_gdf.iloc[0].drop(labels=["geometry"], errors="ignore").to_dict()
        print(f"   [Debug] First row sample: {json.dumps(sample, ensure_ascii=True)}")

    cn_gdf = cn_gdf.copy()
    try:
        cn_gdf["geometry"] = cn_gdf.geometry.make_valid()
    except Exception as exc:
        print(f"   [China] make_valid failed; continuing without: {exc}")

    if cn_gdf.crs is None:
        cn_gdf = cn_gdf.set_crs("EPSG:4326", allow_override=True)
    if cn_gdf.crs.to_epsg() != 4326:
        cn_gdf = cn_gdf.to_crs("EPSG:4326")

    id_candidates = [
        "shapeID",
        "shapeISO",
        "shape_id",
        "shape_iso",
        "ID",
        "id",
        "City_Adcode",
        "city_adcode",
        "ADCODE",
        "adcode",
    ]
    name_candidates = [
        "shapeName",
        "shape_name",
        "NAME",
        "name",
        "City_Name",
        "city_name",
    ]
    id_col = next((c for c in id_candidates if c in cn_gdf.columns), None)
    name_col = next((c for c in name_candidates if c in cn_gdf.columns), None)
    if not id_col or not name_col:
        raise ValueError(
            "China dataset missing expected columns. "
            f"Available: {cn_gdf.columns.tolist()}"
        )

    cn_gdf = cn_gdf[cn_gdf.geometry.notna() & ~cn_gdf.geometry.is_empty].copy()
    cn_gdf = clip_to_europe_bounds(cn_gdf, "china city")

    cn_gdf["temp_area"] = cn_gdf.geometry.area
    before_count = len(cn_gdf)
    cn_gdf = cn_gdf[cn_gdf["temp_area"] < 50.0].copy()
    after_count = len(cn_gdf)
    print(f"   [China Clean] Dropped {before_count - after_count} oversized artifact(s).")
    cn_gdf = cn_gdf.drop(columns=["temp_area"])

    try:
        cn_gdf["geometry"] = cn_gdf.geometry.make_valid()
    except Exception as exc:
        print(f"   [China] make_valid failed before simplify; continuing: {exc}")

    # Aggressive simplification for geoBoundaries (high-res) to avoid huge files.
    cn_gdf["geometry"] = cn_gdf.geometry.simplify(
        tolerance=SIMPLIFY_CHINA, preserve_topology=True
    )
    cn_gdf["id"] = "CN_CITY_" + cn_gdf[id_col].astype(str)
    cn_gdf["name"] = cn_gdf[name_col].astype(str)
    cn_gdf["name"] = cn_gdf["name"].str.replace("shi", "", regex=False).str.strip()
    cn_gdf["cntr_code"] = "CN"
    cn_gdf = cn_gdf[["id", "name", "cntr_code", "geometry"]].copy()

    combined = pd.concat([base, cn_gdf], ignore_index=True)
    print(f"[China] Replacement: Loaded {len(cn_gdf)} city regions.")
    return gpd.GeoDataFrame(combined, crs=main_gdf.crs)


def _rep_longitudes(gdf: gpd.GeoDataFrame) -> pd.Series:
    gdf_ll = gdf
    if gdf_ll.crs is None:
        gdf_ll = gdf_ll.set_crs("EPSG:4326", allow_override=True)
    elif gdf_ll.crs.to_epsg() != 4326:
        gdf_ll = gdf_ll.to_crs("EPSG:4326")
    reps = gdf_ll.geometry.representative_point()
    return reps.x


def apply_russia_ukraine_replacement(main_gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    if main_gdf.empty:
        return main_gdf
    if "cntr_code" not in main_gdf.columns:
        print("[RU/UA] cntr_code missing; skipping replacement.")
        return main_gdf

    base = main_gdf[
        ~main_gdf["cntr_code"].astype(str).str.upper().isin({"RU", "UA"})
    ].copy()

    # Russia: keep Admin-1 east of the Urals
    ru_admin1 = main_gdf[main_gdf["cntr_code"].astype(str).str.upper() == "RU"].copy()
    if not ru_admin1.empty:
        ru_admin1["__rep_lon"] = _rep_longitudes(ru_admin1)
        ru_east = ru_admin1[ru_admin1["__rep_lon"] >= URAL_LONGITUDE].copy()
        ru_east = ru_east.drop(columns=["__rep_lon"])
    else:
        ru_east = ru_admin1

    # Russia: replace west with ADM2
    print("Downloading Russia ADM2 (geoBoundaries)...")
    ru_gdf = fetch_or_load_geojson(
        RUS_ADM2_URL,
        "geoBoundaries-RUS-ADM2.geojson",
        fallback_urls=[
            "https://cdn.jsdelivr.net/gh/wmgeolab/geoBoundaries@main/releaseData/gbOpen/RUS/ADM2/geoBoundaries-RUS-ADM2.geojson"
        ],
    )
    if ru_gdf.empty:
        print("Russia ADM2 GeoDataFrame is empty.")
        raise SystemExit(1)
    if ru_gdf.crs is None:
        ru_gdf = ru_gdf.set_crs("EPSG:4326", allow_override=True)
    if ru_gdf.crs.to_epsg() != 4326:
        ru_gdf = ru_gdf.to_crs("EPSG:4326")
    # Clip to prevent dateline wrapping artifacts (keep Russia in Eastern Hemisphere)
    clip_box = box(-20.0, 0.0, 179.99, 90.0)
    try:
        ru_gdf = gpd.clip(ru_gdf, clip_box)
    except Exception as exc:
        print(f"RU ADM2 clip failed; continuing without clip: {exc}")
    if "shapeID" not in ru_gdf.columns or "shapeName" not in ru_gdf.columns:
        raise ValueError(
            "Russia ADM2 dataset missing expected columns: shapeID/shapeName. "
            f"Available: {ru_gdf.columns.tolist()}"
        )
    ru_gdf = ru_gdf.copy()
    ru_gdf["__rep_lon"] = _rep_longitudes(ru_gdf)
    ru_gdf = ru_gdf[ru_gdf["__rep_lon"] < URAL_LONGITUDE].copy()
    ru_gdf = ru_gdf.drop(columns=["__rep_lon"])
    ru_gdf["id"] = "RU_RAY_" + ru_gdf["shapeID"].astype(str)
    ru_gdf["name"] = ru_gdf["shapeName"].astype(str)
    ru_gdf["cntr_code"] = "RU"
    ru_gdf = ru_gdf[["id", "name", "cntr_code", "geometry"]].copy()
    ru_gdf["geometry"] = ru_gdf.geometry.simplify(
        tolerance=SIMPLIFY_RU_UA, preserve_topology=True
    )

    # Ukraine: full ADM2 replacement
    print("Downloading Ukraine ADM2 (geoBoundaries)...")
    ua_gdf = fetch_or_load_geojson(
        UKR_ADM2_URL,
        "geoBoundaries-UKR-ADM2.geojson",
        fallback_urls=[
            "https://cdn.jsdelivr.net/gh/wmgeolab/geoBoundaries@main/releaseData/gbOpen/UKR/ADM2/geoBoundaries-UKR-ADM2.geojson"
        ],
    )
    if ua_gdf.empty:
        print("Ukraine ADM2 GeoDataFrame is empty.")
        raise SystemExit(1)
    if ua_gdf.crs is None:
        ua_gdf = ua_gdf.set_crs("EPSG:4326", allow_override=True)
    if ua_gdf.crs.to_epsg() != 4326:
        ua_gdf = ua_gdf.to_crs("EPSG:4326")
    if "shapeID" not in ua_gdf.columns or "shapeName" not in ua_gdf.columns:
        raise ValueError(
            "Ukraine ADM2 dataset missing expected columns: shapeID/shapeName. "
            f"Available: {ua_gdf.columns.tolist()}"
        )
    ua_gdf = ua_gdf.copy()
    ua_gdf["id"] = "UA_RAY_" + ua_gdf["shapeID"].astype(str)
    ua_gdf["name"] = ua_gdf["shapeName"].astype(str)
    ua_gdf["cntr_code"] = "UA"
    ua_gdf = ua_gdf[["id", "name", "cntr_code", "geometry"]].copy()
    ua_gdf["geometry"] = ua_gdf.geometry.simplify(
        tolerance=SIMPLIFY_RU_UA, preserve_topology=True
    )

    combined = pd.concat([base, ru_east, ru_gdf, ua_gdf], ignore_index=True)
    print(
        f"[RU/UA] Replacement: RU west ADM2 {len(ru_gdf)}, RU east Admin1 {len(ru_east)}, UA ADM2 {len(ua_gdf)}."
    )
    return gpd.GeoDataFrame(combined, crs=main_gdf.crs)


def build_border_lines() -> gpd.GeoDataFrame:
    border_lines = fetch_ne_zip(BORDER_LINES_URL, "border_lines")
    border_lines = clip_to_europe_bounds(border_lines, "border lines")
    border_lines = border_lines.copy()
    border_lines["geometry"] = border_lines.geometry.simplify(
        tolerance=SIMPLIFY_BORDER_LINES, preserve_topology=True
    )
    return border_lines


def smart_island_cull(
    gdf: gpd.GeoDataFrame, group_col: str, threshold_km2: float = 1000.0
) -> gpd.GeoDataFrame:
    if gdf.empty or "geometry" not in gdf.columns:
        return gdf

    exploded = gdf.explode(index_parts=False, ignore_index=True)
    if exploded.empty:
        return gdf

    exploded = exploded.copy()
    try:
        projected = exploded.to_crs("EPSG:3035")
        exploded["area_km2"] = projected.geometry.area / 1_000_000.0
    except Exception as exc:
        print(f"Smart cull area calc failed, keeping original: {exc}")
        return gdf

    vip_points = [Point(lon, lat) for _, (lon, lat) in VIP_POINTS]
    try:
        exploded_ll = exploded.to_crs("EPSG:4326")
        exploded["vip_keep"] = exploded_ll.geometry.apply(
            lambda geom: any(geom.intersects(pt) for pt in vip_points)
            if geom is not None
            else False
        )
    except Exception as exc:
        print(f"Smart cull VIP check failed, continuing without whitelist: {exc}")
        exploded["vip_keep"] = False

    if group_col in exploded.columns:
        exploded["largest_keep"] = (
            exploded.groupby(group_col)["area_km2"].transform("max")
            == exploded["area_km2"]
        )
    else:
        exploded["largest_keep"] = False

    exploded["keep"] = (
        exploded["largest_keep"]
        | exploded["vip_keep"]
        | (exploded["area_km2"] >= threshold_km2)
    )

    filtered = exploded.loc[exploded["keep"]].copy()
    if filtered.empty:
        print("Smart cull removed all geometries; keeping original.")
        return gdf

    helper_cols = ["area_km2", "vip_keep", "largest_keep", "keep"]
    filtered = filtered.drop(columns=[col for col in helper_cols if col in filtered.columns])

    if group_col in filtered.columns:
        aggfunc = {
            col: "first"
            for col in filtered.columns
            if col not in ("geometry", group_col)
        }
        dissolved = filtered.dissolve(by=group_col, aggfunc=aggfunc)
        dissolved = dissolved.reset_index()
        dissolved = dissolved.set_crs(gdf.crs)
        return dissolved

    return filtered.reset_index(drop=True)


def clip_to_europe_bounds(gdf: gpd.GeoDataFrame, label: str) -> gpd.GeoDataFrame:
    minx, miny, maxx, maxy = EUROPE_BOUNDS
    bbox_geom = box(minx, miny, maxx, maxy)
    try:
        gdf = gdf.to_crs("EPSG:4326")
        clipped = gpd.clip(gdf, bbox_geom)
        if clipped.empty:
            print(f"Europe clip produced empty result for {label}; keeping original.")
            return gdf
        return clipped
    except Exception as exc:
        print(f"Europe clip failed for {label}, attempting to fix geometries...")
        try:
            if hasattr(gdf.geometry, "make_valid"):
                gdf = gdf.set_geometry(gdf.geometry.make_valid())
            else:
                gdf = gdf.set_geometry(gdf.geometry.buffer(0))
            clipped = gpd.clip(gdf, bbox_geom)
        except Exception as fix_exc:
            print(f"Europe clip skipped for {label}: {fix_exc}")
            return gdf
        if clipped.empty:
            print(f"Europe clip produced empty result for {label}; keeping original.")
            return gdf
        return clipped


def despeckle_hybrid(
    gdf: gpd.GeoDataFrame, area_km2: float = 500.0, tolerance: float = SIMPLIFY_NUTS3
) -> gpd.GeoDataFrame:
    if gdf.empty or "id" not in gdf.columns:
        return gdf

    exploded = gdf.explode(index_parts=False, ignore_index=True)
    if exploded.empty:
        return gdf

    try:
        proj = exploded.to_crs("EPSG:3035")
        areas = proj.geometry.area / 1_000_000.0
        keep = areas >= area_km2
        filtered = exploded.loc[keep].copy()
        dropped = int((~keep).sum())
        kept = int(keep.sum())
        total = int(len(keep))
        print(
            f"Despeckle: dropped {dropped} polygons < {area_km2:.0f} km^2 "
            f"(kept {kept} of {total})."
        )
    except Exception as exc:
        print(f"Despeckle failed, keeping original hybrid: {exc}")
        return gdf

    if filtered.empty:
        print("Despeckle removed all geometries, keeping original hybrid.")
        return gdf

    dissolved = filtered.dissolve(by="id", aggfunc={"name": "first", "cntr_code": "first"})
    dissolved = dissolved.reset_index()
    dissolved = dissolved.set_crs(gdf.crs)
    dissolved["geometry"] = dissolved.geometry.simplify(
        tolerance=tolerance, preserve_topology=True
    )
    return dissolved


def clip_to_land_bounds(gdf: gpd.GeoDataFrame, land: gpd.GeoDataFrame, label: str) -> gpd.GeoDataFrame:
    print(f"Reprojecting and clipping {label}...")
    gdf = gdf.to_crs("EPSG:4326")
    minx, miny, maxx, maxy = land.total_bounds
    bbox_geom = box(minx, miny, maxx, maxy)
    try:
        clipped = gpd.clip(gdf, bbox_geom)
    except Exception as exc:
        print(f"Clip failed for {label}, attempting to fix geometries...")
        try:
            if hasattr(gdf.geometry, "make_valid"):
                gdf = gdf.set_geometry(gdf.geometry.make_valid())
            else:
                gdf = gdf.set_geometry(gdf.geometry.buffer(0))
            clipped = gpd.clip(gdf, bbox_geom)
        except Exception as fix_exc:
            print(f"Failed to clip {label}: {fix_exc}")
            raise SystemExit(1) from fix_exc

    if clipped.empty:
        print(f"Clipped {label} dataset is empty. Check bounds or CRS.")
        raise SystemExit(1)
    return clipped


def clip_to_bounds(gdf: gpd.GeoDataFrame, bounds: Iterable[float], label: str) -> gpd.GeoDataFrame:
    print(f"Reprojecting and clipping {label} to hybrid bounds...")
    gdf = gdf.to_crs("EPSG:4326")
    minx, miny, maxx, maxy = bounds
    bbox_geom = box(minx, miny, maxx, maxy)
    try:
        clipped = gpd.clip(gdf, bbox_geom)
    except Exception as exc:
        print(f"Clip failed for {label}, attempting to fix geometries...")
        try:
            if hasattr(gdf.geometry, "make_valid"):
                gdf = gdf.set_geometry(gdf.geometry.make_valid())
            else:
                gdf = gdf.set_geometry(gdf.geometry.buffer(0))
            clipped = gpd.clip(gdf, bbox_geom)
        except Exception as fix_exc:
            print(f"Failed to clip {label}: {fix_exc}")
            raise SystemExit(1) from fix_exc

    if clipped.empty:
        print(f"Clipped {label} dataset is empty. Check bounds or CRS.")
        raise SystemExit(1)
    return clipped


def clip_borders(gdf: gpd.GeoDataFrame, land: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    print("Clipping national borders to land bounds...")
    return clip_to_land_bounds(gdf, land, "borders")


def build_extension_admin1(land: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    admin1 = fetch_ne_zip(ADMIN1_URL, "admin1")
    admin1 = admin1.to_crs("EPSG:4326")
    admin1 = clip_to_europe_bounds(admin1, "admin1")

    name_col = pick_column(admin1, ["adm0_name", "admin", "admin0_name"])
    iso_col = pick_column(admin1, ["iso_a2", "adm0_a2", "iso_3166_1_"])
    code_col = pick_column(admin1, ["adm1_code", "gn_id", "id"])

    if not name_col or not iso_col:
        print("Admin1 dataset missing expected country columns.")
        raise SystemExit(1)

    admin1 = admin1[
          admin1[iso_col].isin(EXTENSION_COUNTRIES)
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
        tolerance=SIMPLIFY_ADMIN1, preserve_topology=True
    )
    return admin1


def build_balkan_fallback(
    existing: gpd.GeoDataFrame, admin0: gpd.GeoDataFrame | None = None
) -> gpd.GeoDataFrame:
    if admin0 is None:
        admin0 = fetch_ne_zip(BORDERS_URL, "admin0_balkan")
    admin0 = admin0.to_crs("EPSG:4326")
    admin0 = clip_to_europe_bounds(admin0, "balkan fallback")

    iso_col = pick_column(
        admin0,
        ["iso_a2", "ISO_A2", "adm0_a2", "ADM0_A2", "iso_3166_1_", "ISO_3166_1_"],
    )
    name_col = pick_column(admin0, ["ADMIN", "admin", "NAME", "name", "NAME_EN", "name_en"])
    if not iso_col and not name_col:
        print("Admin0 dataset missing ISO/name columns; Balkan fallback skipped.")
        return gpd.GeoDataFrame(columns=["id", "name", "cntr_code", "geometry"], crs="EPSG:4326")

    existing_codes = set()
    if existing is not None and "cntr_code" in existing.columns:
        existing_codes = set(
            existing["cntr_code"]
            .dropna()
            .astype(str)
            .str.upper()
            .unique()
        )

    wanted = {"BA", "XK"}
    missing = wanted - existing_codes
    if not missing:
        return gpd.GeoDataFrame(columns=["id", "name", "cntr_code", "geometry"], crs="EPSG:4326")

    balkan = admin0[admin0[iso_col].isin(missing)].copy() if iso_col else admin0.iloc[0:0].copy()
    if name_col:
        if "XK" in missing:
            kosovo_mask = admin0[name_col].str.contains("Kosovo", case=False, na=False)
            balkan = pd.concat([balkan, admin0[kosovo_mask]], ignore_index=True)
        if "BA" in missing:
            bosnia_mask = admin0[name_col].str.contains("Bosnia", case=False, na=False)
            balkan = pd.concat([balkan, admin0[bosnia_mask]], ignore_index=True)
    if balkan.empty:
        print("Balkan fallback found no matching admin0 features.")
        return gpd.GeoDataFrame(columns=["id", "name", "cntr_code", "geometry"], crs="EPSG:4326")

    def resolve_balkan_code(row: pd.Series) -> str:
        if iso_col:
            raw = str(row.get(iso_col, "")).upper()
            if len(raw) == 2 and raw.isalpha() and raw != "-99":
                return raw
        if name_col:
            name_val = str(row.get(name_col, "")).lower()
            if "kosovo" in name_val:
                return "XK"
            if "bosnia" in name_val:
                return "BA"
        return ""

    balkan["cntr_code"] = balkan.apply(resolve_balkan_code, axis=1)
    balkan = balkan[balkan["cntr_code"].isin(missing)].copy()
    if balkan.empty:
        print("Balkan fallback found no usable BA/XK features.")
        return gpd.GeoDataFrame(columns=["id", "name", "cntr_code", "geometry"], crs="EPSG:4326")

    if name_col:
        balkan["name"] = balkan[name_col].astype(str)
    else:
        balkan["name"] = balkan["cntr_code"]
    balkan["id"] = balkan["cntr_code"].astype(str) + "_" + balkan["name"].astype(str)
    balkan = balkan[["id", "name", "cntr_code", "geometry"]].copy()
    balkan["geometry"] = balkan.geometry.simplify(
        tolerance=SIMPLIFY_ADMIN1, preserve_topology=True
    )
    return balkan


def save_outputs(
    land: gpd.GeoDataFrame,
    rivers: gpd.GeoDataFrame,
    border_lines: gpd.GeoDataFrame,
    ocean: gpd.GeoDataFrame,
    land_bg: gpd.GeoDataFrame,
    urban: gpd.GeoDataFrame,
    physical: gpd.GeoDataFrame,
    hybrid: gpd.GeoDataFrame,
    final: gpd.GeoDataFrame,
    output_dir: Path,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    preview_path = output_dir / "preview.png"

    land_out = round_geometries(land)
    rivers_out = round_geometries(rivers)
    borders_out = round_geometries(border_lines)
    ocean_out = round_geometries(ocean)
    land_bg_out = round_geometries(land_bg)
    urban_out = round_geometries(urban)
    physical_out = round_geometries(physical)

    print(f"Saving preview image to {preview_path}...")
    fig, ax = plt.subplots(figsize=(8, 8))
    ocean_out.plot(ax=ax, color="#b3d9ff")
    land_bg_out.plot(ax=ax, linewidth=0, color="#e0e0e0")
    physical_out.plot(ax=ax, linewidth=0.6, edgecolor="#5c4033", facecolor="none")
    urban_out.plot(ax=ax, linewidth=0, color="#333333", alpha=0.2)
    land_out.plot(ax=ax, linewidth=0.3, edgecolor="#999999", color="#d0d0d0")
    borders_out.plot(ax=ax, linewidth=1.2, edgecolor="#000000", facecolor="none")
    rivers_out.plot(ax=ax, linewidth=0.8, color="#3498db")
    ax.set_axis_off()
    fig.savefig(preview_path, dpi=200, bbox_inches="tight")
    plt.close(fig)


def build_topology(
    political: gpd.GeoDataFrame,
    ocean: gpd.GeoDataFrame,
    land: gpd.GeoDataFrame,
    urban: gpd.GeoDataFrame,
    physical: gpd.GeoDataFrame,
    rivers: gpd.GeoDataFrame,
    output_path: Path,
    quantization: int = 100_000,
) -> None:
    print("Building TopoJSON topology...")

    def has_valid_bounds(gdf: gpd.GeoDataFrame) -> bool:
        if gdf.empty:
            return False
        bounds = gdf.total_bounds
        if len(bounds) != 4:
            return False
        minx, miny, maxx, maxy = bounds
        if not all(map(math.isfinite, [minx, miny, maxx, maxy])):
            return False
        if maxx - minx <= 0 or maxy - miny <= 0:
            return False
        return True

    def prune_columns(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
        keep_cols = ["id", "name", "cntr_code", "geometry"]
        existing = [col for col in keep_cols if col in gdf.columns]
        if "geometry" not in existing:
            existing.append("geometry")
        gdf = gdf[existing].copy()
        gdf = gdf.fillna("")
        return gdf

    def scrub_geometry(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
        if gdf.empty:
            return gdf
        gdf = gdf[gdf.geometry.notna()]
        gdf = gdf[~gdf.geometry.is_empty]
        if hasattr(gdf.geometry, "is_valid"):
            gdf = gdf[gdf.geometry.is_valid]
        return gdf

    candidates = [
        ("political", political),
        ("ocean", ocean),
        ("land", land),
        ("urban", urban),
        ("physical", physical),
        ("rivers", rivers),
    ]

    layer_names: list[str] = []
    layer_gdfs: list[gpd.GeoDataFrame] = []
    for name, gdf in candidates:
        gdf = gdf.to_crs("EPSG:4326")
        gdf = prune_columns(gdf)
        gdf = scrub_geometry(gdf)
        gdf = round_geometries(gdf)
        if not has_valid_bounds(gdf):
            if name == "political":
                print("Political layer is empty or invalid; cannot build topology.")
                raise SystemExit(1)
            print(f"Skipping empty/invalid layer: {name}")
            continue
        layer_names.append(name)
        layer_gdfs.append(gdf)

    def build_topo(prequantize_value):
        return tp.Topology(
            layer_gdfs,
            object_name=layer_names,
            prequantize=prequantize_value,
            topology=True,
            presimplify=False,
            toposimplify=False,
            shared_coords=True,
        ).to_json()

    try:
        topo_json = build_topo(quantization)
        if "NaN" in topo_json:
            raise ValueError("Generated TopoJSON contains NaN")
    except Exception as exc:
        print(f"TopoJSON build failed with quantization; retrying without quantization: {exc}")
        topo_json = build_topo(False)
        if "NaN" in topo_json:
            raise ValueError("Generated TopoJSON contains NaN")

    output_path.write_text(topo_json, encoding="utf-8")

    try:
        import json

        topo_dict = json.loads(topo_json)
        political_obj = topo_dict.get("objects", {}).get("political", {})
        geometries = political_obj.get("geometries", [])
        if geometries:
            sample = geometries[0].get("properties", {})
            missing = [key for key in ("id", "cntr_code") if key not in sample]
            if missing:
                print(f"WARNING: TopoJSON missing properties: {missing}")
        print(f"TopoJSON saved to {output_path}")
        print(f"  - Objects: {list(topo_dict.get('objects', {}).keys())}")
        print(f"  - Total arcs: {len(topo_dict.get('arcs', []))}")
    except Exception as exc:
        print(f"TopoJSON saved to {output_path}")
        print(f"TopoJSON validation skipped: {exc}")

def main() -> None:
    data = fetch_geojson(URL)
    gdf = build_geodataframe(data)
    gdf = clip_to_europe_bounds(gdf, "nuts")
    filtered = filter_countries(gdf)
    filtered = filtered.copy()
    filtered["geometry"] = filtered.geometry.simplify(
        tolerance=SIMPLIFY_NUTS3, preserve_topology=True
    )
    rivers = fetch_ne_zip(RIVERS_URL, "rivers")
    rivers = clip_to_europe_bounds(rivers, "rivers")
    rivers_clipped = clip_to_land_bounds(rivers, filtered, "rivers")
    borders = fetch_ne_zip(BORDERS_URL, "borders")
    borders = clip_to_europe_bounds(borders, "borders")
    border_lines = build_border_lines()
    ocean = fetch_ne_zip(OCEAN_URL, "ocean")
    ocean = clip_to_europe_bounds(ocean, "ocean")
    ocean_clipped = clip_to_land_bounds(ocean, filtered, "ocean")
    ocean_clipped = ocean_clipped.copy()
    ocean_clipped["geometry"] = ocean_clipped.geometry.simplify(
        tolerance=SIMPLIFY_BACKGROUND, preserve_topology=True
    )
    land_bg = fetch_ne_zip(LAND_BG_URL, "land")
    land_bg = clip_to_europe_bounds(land_bg, "land background")
    land_bg_clipped = clip_to_land_bounds(land_bg, filtered, "land background")
    land_bg_clipped = land_bg_clipped.copy()
    land_bg_clipped["geometry"] = land_bg_clipped.geometry.simplify(
        tolerance=SIMPLIFY_BACKGROUND, preserve_topology=True
    )
    urban = fetch_ne_zip(URBAN_URL, "urban")
    urban = clip_to_europe_bounds(urban, "urban")
    urban_clipped = clip_to_land_bounds(urban, filtered, "urban")
    # Aggressively simplify urban geometry to reduce render cost
    urban_clipped = urban_clipped.copy()
    urban_clipped["geometry"] = urban_clipped.geometry.simplify(
        tolerance=SIMPLIFY_URBAN, preserve_topology=True
    )
    physical = fetch_ne_zip(PHYSICAL_URL, "physical")
    physical = clip_to_europe_bounds(physical, "physical")
    physical_clipped = clip_to_land_bounds(physical, filtered, "physical")
    if "featurecla" in physical_clipped.columns:
        keep_classes = {"Range/Mountain", "Forest", "Plain", "Delta"}
        physical_filtered = physical_clipped[physical_clipped["featurecla"].isin(keep_classes)].copy()
        if physical_filtered.empty:
            print("Physical regions filter returned empty dataset, keeping all clipped features.")
            physical_filtered = physical_clipped
    else:
        physical_filtered = physical_clipped
    # Simplify physical regions to reduce vertex count
    physical_filtered = physical_filtered.copy()
    physical_filtered["geometry"] = physical_filtered.geometry.simplify(
        tolerance=SIMPLIFY_PHYSICAL, preserve_topology=True
    )
    # Preserve key metadata for styling/labels
    keep_cols = ["name", "name_en", "featurecla", "geometry"]
    physical_filtered = physical_filtered[[col for col in keep_cols if col in physical_filtered.columns]]

    # Build hybrid interactive layer (NUTS-3 + Admin-1 extension)
    nuts_name_col = "NUTS_NAME" if "NUTS_NAME" in filtered.columns else "NAME_LATN"
    nuts_hybrid = filtered.rename(
        columns={
            "NUTS_ID": "id",
            nuts_name_col: "name",
            "CNTR_CODE": "cntr_code",
        }
    )[["id", "name", "cntr_code", "geometry"]].copy()

    extension_hybrid = build_extension_admin1(filtered)
    hybrid = gpd.GeoDataFrame(
        pd.concat([nuts_hybrid, extension_hybrid], ignore_index=True),
        crs="EPSG:4326",
    )
    balkan_fallback = build_balkan_fallback(hybrid, admin0=borders)
    if not balkan_fallback.empty:
        hybrid = gpd.GeoDataFrame(
            pd.concat([hybrid, balkan_fallback], ignore_index=True),
            crs="EPSG:4326",
        )
    hybrid = apply_holistic_replacements(hybrid)
    hybrid = apply_russia_ukraine_replacement(hybrid)
    hybrid = apply_poland_replacement(hybrid)
    hybrid = apply_china_replacement(hybrid)
    final_hybrid = smart_island_cull(hybrid, group_col="id", threshold_km2=1000.0)

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

    final_hybrid["cntr_code"] = final_hybrid["cntr_code"].fillna("").astype(str).str.strip()
    final_hybrid.loc[final_hybrid["cntr_code"] == "", "cntr_code"] = None
    missing_mask = final_hybrid["cntr_code"].isna()
    if missing_mask.any() and "id" in final_hybrid.columns:
        final_hybrid.loc[missing_mask, "cntr_code"] = final_hybrid.loc[
            missing_mask, "id"
        ].apply(extract_country_code)
    final_hybrid["cntr_code"] = final_hybrid["cntr_code"].fillna("").astype(str).str.strip()
    final_hybrid.loc[final_hybrid["cntr_code"] == "", "cntr_code"] = None

    missing_mask = final_hybrid["cntr_code"].isna()
    if missing_mask.any():
        borders_ll = borders.to_crs("EPSG:4326")
        code_col = pick_column(
            borders_ll,
            ["iso_a2", "ISO_A2", "adm0_a2", "ADM0_A2", "iso_3166_1_", "ISO_3166_1_"],
        )
        if not code_col:
            print("Borders dataset missing ISO A2 column; spatial join skipped.")
        else:
            try:
                missing = final_hybrid.loc[missing_mask].copy()
                joined = gpd.sjoin(
                    missing,
                    borders_ll[[code_col, "geometry"]],
                    how="left",
                    predicate="intersects",
                )
                filled = joined[code_col]
                filled = filled.where(~filled.isin(["-99", "", None]))
                filled = filled.groupby(level=0).first()
                final_hybrid.loc[filled.index, "cntr_code"] = filled
            except Exception as exc:
                print(f"Spatial join failed: {exc}")

    final_hybrid["cntr_code"] = (
        final_hybrid["cntr_code"]
        .fillna("")
        .astype(str)
        .str.strip()
        .str.upper()
    )
    final_hybrid.loc[final_hybrid["cntr_code"] == "", "cntr_code"] = None

    script_dir = Path(__file__).resolve().parent
    output_dir = script_dir / "data"
    save_outputs(
        filtered,
        rivers_clipped,
        border_lines,
        ocean_clipped,
        land_bg_clipped,
        urban_clipped,
        physical_filtered,
        hybrid,
        final_hybrid,
        output_dir,
    )

    topology_path = output_dir / "europe_topology.json"
    build_topology(
        political=final_hybrid,
        ocean=ocean_clipped,
        land=land_bg_clipped,
        urban=urban_clipped,
        physical=physical_filtered,
        rivers=rivers_clipped,
        output_path=topology_path,
        quantization=100_000,
    )

    print("[INFO] Generating Hierarchy Data....")
    generate_hierarchy.main()

    print("[INFO] Syncing Translations....")
    translate_manager.main()

    print(f"Features with missing CNTR_CODE: {final_hybrid['cntr_code'].isnull().sum()}")
    print("Done.")


if __name__ == "__main__":
    main()
