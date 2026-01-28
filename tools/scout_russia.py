import sys
from pathlib import Path

try:
    import geopandas as gpd
except ImportError as exc:
    raise SystemExit("geopandas is required. Install with: uv pip install geopandas") from exc

try:
    import requests
except ImportError as exc:
    raise SystemExit("requests is required. Install with: uv pip install requests") from exc

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

SOURCES = {
    "RUS": {
        "filename": "geoBoundaries-RUS-ADM2.geojson",
        "urls": [
            "https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/RUS/ADM2/geoBoundaries-RUS-ADM2.geojson",
            "https://cdn.jsdelivr.net/gh/wmgeolab/geoBoundaries@main/releaseData/gbOpen/RUS/ADM2/geoBoundaries-RUS-ADM2.geojson",
            "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/main/releaseData/gbOpen/RUS/ADM2/geoBoundaries-RUS-ADM2.geojson",
            "https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/RUS/ADM2/geoBoundaries-RUS-ADM2.geojson?download=1",
        ],
    },
    "UKR": {
        "filename": "geoBoundaries-UKR-ADM2.geojson",
        "urls": [
            "https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/UKR/ADM2/geoBoundaries-UKR-ADM2.geojson",
            "https://cdn.jsdelivr.net/gh/wmgeolab/geoBoundaries@main/releaseData/gbOpen/UKR/ADM2/geoBoundaries-UKR-ADM2.geojson",
            "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/main/releaseData/gbOpen/UKR/ADM2/geoBoundaries-UKR-ADM2.geojson",
            "https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/UKR/ADM2/geoBoundaries-UKR-ADM2.geojson?download=1",
        ],
    },
}

CANDIDATE_TYPE_COLS = [
    "shapeType",
    "ENGTYPE_2",
    "TYPE_2",
    "ENGTYPE_3",
    "TYPE_3",
    "ADM2_TYPE",
    "ADM1_TYPE",
    "type",
]


def download(urls, dest: Path):
    if dest.exists() and dest.stat().st_size > 0:
        print(f"Using cached file: {dest}")
        return dest
    tmp_path = dest.with_suffix(dest.suffix + ".tmp")
    for url in urls:
        for attempt in range(1, 4):
            try:
                print(f"Downloading {url} (attempt {attempt}/3) ...")
                with requests.get(
                    url,
                    stream=True,
                    timeout=60,
                    headers={"User-Agent": "mapcreator-scout/1.0"},
                ) as resp:
                    resp.raise_for_status()
                    with tmp_path.open("wb") as handle:
                        for chunk in resp.iter_content(chunk_size=1024 * 1024):
                            if chunk:
                                handle.write(chunk)
                tmp_path.replace(dest)
                print(f"Saved to {dest}")
                return dest
            except Exception as exc:
                print(f"  Download failed: {exc}")
                if tmp_path.exists():
                    tmp_path.unlink()
    raise SystemExit(f"Failed to download dataset for {dest.name}")


def is_lfs_pointer(path: Path) -> bool:
    try:
        with path.open("r", encoding="utf-8") as handle:
            first_line = handle.readline().strip()
        return first_line.startswith("version https://git-lfs.github.com/spec/v1")
    except Exception:
        return False


def fetch_api_url(iso: str, adm: str = "ADM2") -> str | None:
    api_url = f"https://www.geoboundaries.org/api/current/gbOpen/{iso}/{adm}"
    try:
        resp = requests.get(api_url, timeout=60)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        print(f"  API lookup failed: {exc}")
        return None
    if isinstance(data, list) and data:
        data = data[0]
    if not isinstance(data, dict):
        return None
    for key in (
        "gjDownloadURL",
        "gjSimplifiedDownloadURL",
        "downloadURL",
        "shapeFileDownloadURL",
    ):
        if key in data and data[key]:
            return data[key]
    return None


def summarize_types(gdf):
    cols = [c for c in gdf.columns if c in CANDIDATE_TYPE_COLS]
    if not cols:
        cols = [c for c in gdf.columns if "type" in c.lower()]
    if not cols:
        print("No obvious type columns found.")
        return
    print("Type-like columns:", cols)
    for col in cols:
        try:
            values = gdf[col].dropna().astype(str).unique().tolist()
        except Exception:
            values = []
        sample = values[:10]
        print(f"  {col} sample values: {sample}")


def inspect_dataset(label, path: Path):
    print(f"\n== {label} ==")
    gdf = gpd.read_file(path)
    print(f"Rows: {len(gdf)}")
    print("Columns:", list(gdf.columns))
    try:
        head = gdf.head(3).to_dict(orient="records")
    except Exception:
        head = []
    print("First 3 rows:")
    for row in head:
        print(row)
    summarize_types(gdf)


def main():
    for label, meta in SOURCES.items():
        dest = DATA_DIR / meta["filename"]
        download(meta["urls"], dest)
        if is_lfs_pointer(dest):
            print(f"{dest.name} appears to be a Git LFS pointer. Trying API download...")
            api_url = fetch_api_url(label)
            if api_url:
                dest.unlink(missing_ok=True)
                download([api_url], dest)
        if is_lfs_pointer(dest):
            raise SystemExit(f"{dest.name} is still a Git LFS pointer; download failed.")
        inspect_dataset(label, dest)


if __name__ == "__main__":
    main()
