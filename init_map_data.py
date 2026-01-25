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
import requests
from shapely.geometry import box


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

COUNTRY_CODES = {"DE", "PL", "IT", "FR", "NL", "BE", "LU", "AT", "CH"}
EXCLUDED_NUTS_PREFIXES = ("FRY", "PT2", "PT3", "ES7")


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
    return gdf


def filter_countries(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    print("Filtering countries...")
    if "CNTR_CODE" not in gdf.columns:
        print("Column CNTR_CODE not found in GeoDataFrame.")
        raise SystemExit(1)
    filtered = gdf[gdf["CNTR_CODE"].isin(COUNTRY_CODES)].copy()
    filtered = filtered[~filtered["CNTR_CODE"].isin({"UK", "GB"})]
    if "NUTS_ID" in filtered.columns:
        mask = ~filtered["NUTS_ID"].str.startswith(EXCLUDED_NUTS_PREFIXES)
        filtered = filtered[mask]
    else:
        print("Column NUTS_ID not found; overseas filter skipped.")
    if filtered.empty:
        print("Filtered GeoDataFrame is empty. Check country codes.")
        raise SystemExit(1)
    return filtered


def clip_to_land_bounds(gdf: gpd.GeoDataFrame, land: gpd.GeoDataFrame, label: str) -> gpd.GeoDataFrame:
    print(f"Reprojecting and clipping {label}...")
    gdf = gdf.to_crs("EPSG:3035")
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


def clip_borders(gdf: gpd.GeoDataFrame, land: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    print("Clipping national borders to land bounds...")
    return clip_to_land_bounds(gdf, land, "borders")


def save_outputs(
    land: gpd.GeoDataFrame,
    rivers: gpd.GeoDataFrame,
    borders: gpd.GeoDataFrame,
    ocean: gpd.GeoDataFrame,
    land_bg: gpd.GeoDataFrame,
    urban: gpd.GeoDataFrame,
    physical: gpd.GeoDataFrame,
    output_dir: Path,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    geojson_path = output_dir / "europe_test_nuts3.geojson"
    rivers_path = output_dir / "europe_rivers.geojson"
    borders_path = output_dir / "europe_countries.geojson"
    ocean_path = output_dir / "europe_ocean.geojson"
    land_bg_path = output_dir / "europe_land_bg.geojson"
    urban_path = output_dir / "europe_urban.geojson"
    physical_path = output_dir / "europe_physical.geojson"
    preview_path = output_dir / "preview.png"

    print(f"Saving GeoJSON to {geojson_path}...")
    land.to_file(geojson_path, driver="GeoJSON")

    print(f"Saving rivers GeoJSON to {rivers_path}...")
    rivers.to_file(rivers_path, driver="GeoJSON")

    print(f"Saving borders GeoJSON to {borders_path}...")
    borders.to_file(borders_path, driver="GeoJSON")

    print(f"Saving ocean GeoJSON to {ocean_path}...")
    ocean.to_file(ocean_path, driver="GeoJSON")

    print(f"Saving land background GeoJSON to {land_bg_path}...")
    land_bg.to_file(land_bg_path, driver="GeoJSON")

    print(f"Saving urban GeoJSON to {urban_path}...")
    urban.to_file(urban_path, driver="GeoJSON")

    print(f"Saving physical regions GeoJSON to {physical_path}...")
    physical.to_file(physical_path, driver="GeoJSON")

    print(f"Saving preview image to {preview_path}...")
    fig, ax = plt.subplots(figsize=(8, 8))
    ocean.plot(ax=ax, color="#b3d9ff")
    land_bg.plot(ax=ax, linewidth=0, color="#e0e0e0")
    physical.plot(ax=ax, linewidth=0.6, edgecolor="#5c4033", facecolor="none")
    urban.plot(ax=ax, linewidth=0, color="#333333", alpha=0.2)
    land.plot(ax=ax, linewidth=0.3, edgecolor="#999999", color="#d0d0d0")
    borders.plot(ax=ax, linewidth=1.2, edgecolor="#000000", facecolor="none")
    rivers.plot(ax=ax, linewidth=0.8, color="#3498db")
    ax.set_axis_off()
    fig.savefig(preview_path, dpi=200, bbox_inches="tight")
    plt.close(fig)


def main() -> None:
    data = fetch_geojson(URL)
    gdf = build_geodataframe(data)
    filtered = filter_countries(gdf)
    rivers = fetch_ne_zip(RIVERS_URL, "rivers")
    rivers_clipped = clip_to_land_bounds(rivers, filtered, "rivers")
    borders = fetch_ne_zip(BORDERS_URL, "borders")
    borders_clipped = clip_borders(borders, filtered)
    ocean = fetch_ne_zip(OCEAN_URL, "ocean")
    ocean_clipped = clip_to_land_bounds(ocean, filtered, "ocean")
    land_bg = fetch_ne_zip(LAND_BG_URL, "land")
    land_bg_clipped = clip_to_land_bounds(land_bg, filtered, "land background")
    urban = fetch_ne_zip(URBAN_URL, "urban")
    urban_clipped = clip_to_land_bounds(urban, filtered, "urban")
    # Aggressively simplify urban geometry to reduce render cost
    urban_clipped = urban_clipped.copy()
    urban_clipped["geometry"] = urban_clipped.geometry.simplify(
        tolerance=2000, preserve_topology=True
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
        tolerance=5000, preserve_topology=True
    )
    # Preserve key metadata for styling/labels
    keep_cols = ["name", "name_en", "featurecla", "geometry"]
    physical_filtered = physical_filtered[[col for col in keep_cols if col in physical_filtered.columns]]

    script_dir = Path(__file__).resolve().parent
    output_dir = script_dir / "data"
    save_outputs(
        filtered,
        rivers_clipped,
        borders_clipped,
        ocean_clipped,
        land_bg_clipped,
        urban_clipped,
        physical_filtered,
        output_dir,
    )

    print("Done.")


if __name__ == "__main__":
    main()
