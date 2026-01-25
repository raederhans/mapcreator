"""Initialize and prepare NUTS-3 map data for Map Creator."""
from __future__ import annotations

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


ensure_packages(["geopandas", "matplotlib", "mapclassify", "requests", "shapely"])

import geopandas as gpd
import matplotlib.pyplot as plt
import pandas as pd
import requests
from shapely.geometry import box
from shapely.ops import transform


URL = (
    "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/"
    "NUTS_RG_10M_2021_3035_LEVL_3.geojson"
)
RIVERS_URL = "https://naturalearth.s3.amazonaws.com/10m_physical/ne_10m_rivers_lake_centerlines.zip"
BORDERS_URL = "https://naturalearth.s3.amazonaws.com/10m_cultural/ne_10m_admin_0_countries.zip"
OCEAN_URL = "https://naturalearth.s3.amazonaws.com/10m_physical/ne_10m_ocean.zip"
LAND_BG_URL = "https://naturalearth.s3.amazonaws.com/10m_physical/ne_10m_land.zip"
URBAN_URL = "https://naturalearth.s3.amazonaws.com/10m_cultural/ne_10m_urban_areas.zip"
PHYSICAL_URL = "https://naturalearth.s3.amazonaws.com/10m_physical/ne_10m_geography_regions_polys.zip"
ADMIN1_URL = "https://naturalearth.s3.amazonaws.com/10m_cultural/ne_10m_admin_1_states_provinces.zip"

COUNTRY_CODES = {"DE", "PL", "IT", "FR", "NL", "BE", "LU", "AT", "CH"}
EXTENSION_COUNTRIES = {"RU", "UA", "BY", "MD"}
EXCLUDED_NUTS_PREFIXES = ("FRY", "PT2", "PT3", "ES7")
ARCTIC_BOUNDS = (-180.0, 25.0, 180.0, 72.0)


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


def clip_to_arctic_bounds(gdf: gpd.GeoDataFrame, label: str) -> gpd.GeoDataFrame:
    try:
        gdf = gdf.to_crs("EPSG:4326")
        bbox_geom = box(*ARCTIC_BOUNDS)
        clipped = gpd.clip(gdf, bbox_geom)
        if clipped.empty:
            print(f"Arctic clip produced empty result for {label}; keeping original.")
            return gdf
        return clipped
    except Exception as exc:
        print(f"Arctic clip skipped for {label}: {exc}")
        return gdf


def despeckle_hybrid(
    gdf: gpd.GeoDataFrame, area_km2: float = 500.0, tolerance: float = 0.05
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
    admin1 = clip_to_arctic_bounds(admin1, "admin1")

    name_col = pick_column(admin1, ["adm0_name", "admin", "admin0_name"])
    iso_col = pick_column(admin1, ["iso_a2", "adm0_a2", "iso_3166_1_"])
    code_col = pick_column(admin1, ["adm1_code", "gn_id", "id"])

    if not name_col or not iso_col:
        print("Admin1 dataset missing expected country columns.")
        raise SystemExit(1)

    admin1 = admin1[
        admin1[iso_col].isin(EXTENSION_COUNTRIES)
        | admin1[name_col].isin({"Russia", "Ukraine", "Belarus", "Moldova"})
    ].copy()

    if admin1.empty:
        print("Admin1 filter returned empty dataset.")
        raise SystemExit(1)

    ru_mask = admin1[iso_col].isin({"RU"}) | admin1[name_col].isin({"Russia"})
    ru = admin1[ru_mask].copy()
    rest = admin1[~ru_mask].copy()
    if not ru.empty:
        ural_bbox = box(-180, -90, 60, 90)
        try:
            ru = gpd.clip(ru, ural_bbox)
        except Exception:
            ru = ru.set_geometry(ru.geometry.buffer(0))
            ru = gpd.clip(ru, ural_bbox)

    admin1 = gpd.GeoDataFrame(pd.concat([rest, ru], ignore_index=True), crs="EPSG:4326")

    if code_col is None:
        admin1["adm1_code"] = (
            admin1.get("name", "adm1").astype(str) + "_" + admin1[iso_col].astype(str)
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
    admin1["geometry"] = admin1.geometry.simplify(tolerance=0.05, preserve_topology=True)
    return admin1


def save_outputs(
    land: gpd.GeoDataFrame,
    rivers: gpd.GeoDataFrame,
    borders: gpd.GeoDataFrame,
    ocean: gpd.GeoDataFrame,
    land_bg: gpd.GeoDataFrame,
    urban: gpd.GeoDataFrame,
    physical: gpd.GeoDataFrame,
    hybrid: gpd.GeoDataFrame,
    final: gpd.GeoDataFrame,
    output_dir: Path,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    geojson_path = output_dir / "europe_test_nuts3.geojson"
    rivers_path = output_dir / "europe_rivers.geojson"
    borders_path = output_dir / "europe_countries_combined.geojson"
    ocean_path = output_dir / "europe_ocean.geojson"
    land_bg_path = output_dir / "europe_land_bg.geojson"
    urban_path = output_dir / "europe_urban.geojson"
    physical_path = output_dir / "europe_physical.geojson"
    hybrid_path = output_dir / "europe_full_hybrid.geojson"
    final_path = output_dir / "europe_final_optimized.geojson"
    preview_path = output_dir / "preview.png"

    land_out = round_geometries(land)
    rivers_out = round_geometries(rivers)
    borders_out = round_geometries(borders)
    ocean_out = round_geometries(ocean)
    land_bg_out = round_geometries(land_bg)
    urban_out = round_geometries(urban)
    physical_out = round_geometries(physical)
    hybrid_out = round_geometries(hybrid)
    final_out = round_geometries(final)

    print(f"Saving GeoJSON to {geojson_path}...")
    land_out.to_file(geojson_path, driver="GeoJSON")

    print(f"Saving rivers GeoJSON to {rivers_path}...")
    rivers_out.to_file(rivers_path, driver="GeoJSON")

    print(f"Saving borders GeoJSON to {borders_path}...")
    borders_out.to_file(borders_path, driver="GeoJSON")

    print(f"Saving ocean GeoJSON to {ocean_path}...")
    ocean_out.to_file(ocean_path, driver="GeoJSON")

    print(f"Saving land background GeoJSON to {land_bg_path}...")
    land_bg_out.to_file(land_bg_path, driver="GeoJSON")

    print(f"Saving urban GeoJSON to {urban_path}...")
    urban_out.to_file(urban_path, driver="GeoJSON")

    print(f"Saving physical regions GeoJSON to {physical_path}...")
    physical_out.to_file(physical_path, driver="GeoJSON")

    print(f"Saving hybrid GeoJSON to {hybrid_path}...")
    hybrid_out.to_file(hybrid_path, driver="GeoJSON")

    print(f"Saving final optimized GeoJSON to {final_path}...")
    final_out.to_file(final_path, driver="GeoJSON")

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


def main() -> None:
    data = fetch_geojson(URL)
    gdf = build_geodataframe(data)
    gdf = clip_to_arctic_bounds(gdf, "nuts")
    filtered = filter_countries(gdf)
    filtered = filtered.copy()
    filtered["geometry"] = filtered.geometry.simplify(tolerance=0.05, preserve_topology=True)
    rivers = fetch_ne_zip(RIVERS_URL, "rivers")
    rivers_clipped = clip_to_land_bounds(rivers, filtered, "rivers")
    borders = fetch_ne_zip(BORDERS_URL, "borders")
    ocean = fetch_ne_zip(OCEAN_URL, "ocean")
    ocean_clipped = clip_to_land_bounds(ocean, filtered, "ocean")
    land_bg = fetch_ne_zip(LAND_BG_URL, "land")
    land_bg_clipped = clip_to_land_bounds(land_bg, filtered, "land background")
    urban = fetch_ne_zip(URBAN_URL, "urban")
    urban_clipped = clip_to_land_bounds(urban, filtered, "urban")
    # Aggressively simplify urban geometry to reduce render cost
    urban_clipped = urban_clipped.copy()
    urban_clipped["geometry"] = urban_clipped.geometry.simplify(
        tolerance=0.05, preserve_topology=True
    )
    physical = fetch_ne_zip(PHYSICAL_URL, "physical")
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
        tolerance=0.05, preserve_topology=True
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
    final_hybrid = despeckle_hybrid(hybrid, area_km2=500.0, tolerance=0.05)
    final_hybrid["cntr_code"] = final_hybrid["cntr_code"].fillna("")
    missing_mask = final_hybrid["cntr_code"].str.len() == 0
    if missing_mask.any() and "id" in final_hybrid.columns:
        final_hybrid.loc[missing_mask, "cntr_code"] = final_hybrid.loc[
            missing_mask, "id"
        ].astype(str).str[:2]
    borders_combined = clip_to_bounds(borders, hybrid.total_bounds, "borders combined")
    borders_combined = borders_combined.copy()
    borders_combined["geometry"] = borders_combined.geometry.simplify(
        tolerance=0.05, preserve_topology=True
    )

    script_dir = Path(__file__).resolve().parent
    output_dir = script_dir / "data"
    save_outputs(
        filtered,
        rivers_clipped,
        borders_combined,
        ocean_clipped,
        land_bg_clipped,
        urban_clipped,
        physical_filtered,
        hybrid,
        final_hybrid,
        output_dir,
    )

    print("Done.")


if __name__ == "__main__":
    main()
