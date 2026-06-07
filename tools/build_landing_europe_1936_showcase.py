from __future__ import annotations

import json
import math
import re
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from xml.sax.saxutils import escape as xml_escape

from shapely.errors import GEOSException
from shapely.geometry import GeometryCollection, box, shape
from shapely.geometry.base import BaseGeometry
from shapely.ops import unary_union
from shapely.validation import make_valid
from topojson.utils import serialize_as_geojson


REPO_ROOT = Path(__file__).resolve().parents[1]
LANDING_ASSETS = REPO_ROOT / "landing" / "assets"
HOI4_MANIFEST = REPO_ROOT / "data" / "scenarios" / "hoi4_1936" / "manifest.json"
HOI4_1939_MANIFEST = REPO_ROOT / "data" / "scenarios" / "hoi4_1939" / "manifest.json"
TNO_1962_MANIFEST = REPO_ROOT / "data" / "scenarios" / "tno_1962" / "manifest.json"
BLANK_BASE_MANIFEST = REPO_ROOT / "data" / "scenarios" / "blank_base" / "manifest.json"
EUROPE_BLANK_TOPOLOGY = REPO_ROOT / "data" / "europe_topology.runtime_political_v1.json"
RAIL_CATALOG = REPO_ROOT / "data" / "transport_layers" / "global_rail" / "catalog.json"

SHOWCASE_SVG = LANDING_ASSETS / "europe-1936-showcase.svg"
SHOWCASE_METADATA = LANDING_ASSETS / "europe-1936-showcase.json"
HERO_SCENARIO_OUTPUTS = {
    "blank": {
        "svg": LANDING_ASSETS / "hero-blank.svg",
        "metadata": LANDING_ASSETS / "hero-blank.json",
    },
    "hoi4-1936": {
        "svg": LANDING_ASSETS / "hero-hoi4-1936.svg",
        "metadata": LANDING_ASSETS / "hero-hoi4-1936.json",
    },
    "hoi4-1939": {
        "svg": LANDING_ASSETS / "hero-hoi4-1939.svg",
        "metadata": LANDING_ASSETS / "hero-hoi4-1939.json",
    },
    "tno-1962": {
        "svg": LANDING_ASSETS / "hero-tno-1962.svg",
        "metadata": LANDING_ASSETS / "hero-tno-1962.json",
    },
}
EUROPE_BBOX = (-12.5, 34.0, 41.5, 72.5)
SHOWCASE_CANVAS_WIDTH = 980
SHOWCASE_CANVAS_HEIGHT = 620
HERO_CANVAS_WIDTH = 980
HERO_CANVAS_HEIGHT = 680
SHOWCASE_CANVAS_PADDING = 36
PROJECTION_CENTER_LON = 10.0
PROJECTION_CENTER_LAT = 52.0
RAIL_LINE_LIMIT = 220
RAIL_MIN_LINES_PER_SHARD = 55
RAIL_MIN_PROJECTED_PX = 8.0
RAIL_DEDUPE_PIXEL_GRID = 2.0
SHOWCASE_FOCUS_TAGS = {"GER", "POL", "CZE", "ROM", "SOV", "YUG", "ITA", "FRA", "ENG"}
TRANSREGIONAL_EUROPE_SHOWCASE_TAGS = {"TUR"}
SHOWCASE_LAYERS = (
    {"id": "political", "label": "1936 political ownership"},
    {"id": "rail", "label": "Europe rail network"},
    {"id": "cities", "label": "capital anchors"},
    {"id": "day-night", "label": "day-night cycle"},
)
TAG_PATTERN = re.compile(r"^[A-Z0-9_]{2,12}$")


@dataclass(frozen=True)
class HeroScenario:
    mode: str
    scenario_id: str
    title: str
    manifest_path: Path
    palette_class: str
    capital_defaults_path: Path | None = None
    blank: bool = False


HERO_SCENARIOS = (
    HeroScenario(
        mode="blank",
        scenario_id="blank_base",
        title="Blank Europe canvas",
        manifest_path=BLANK_BASE_MANIFEST,
        palette_class="blank",
        blank=True,
    ),
    HeroScenario(
        mode="hoi4-1936",
        scenario_id="hoi4_1936",
        title="HOI4 1936 Europe",
        manifest_path=HOI4_MANIFEST,
        palette_class="hoi4-1936",
    ),
    HeroScenario(
        mode="hoi4-1939",
        scenario_id="hoi4_1939",
        title="HOI4 1939 Europe",
        manifest_path=HOI4_1939_MANIFEST,
        palette_class="hoi4-1939",
    ),
    HeroScenario(
        mode="tno-1962",
        scenario_id="tno_1962",
        title="TNO 1962 Europe",
        manifest_path=TNO_1962_MANIFEST,
        palette_class="tno-1962",
        capital_defaults_path=REPO_ROOT / "data" / "scenarios" / "tno_1962" / "capital_defaults.partial.json",
    ),
)


@dataclass(frozen=True)
class Canvas:
    width: int
    height: int
    bbox: tuple[float, float, float, float]
    projected_bounds: tuple[float, float, float, float]
    scale: float
    offset_x: float
    offset_y: float

    @classmethod
    def create(cls, width: int, height: int, bbox: tuple[float, float, float, float]) -> "Canvas":
        min_x, min_y, max_x, max_y = projection_bounds_for_bbox(bbox)
        projected_width = max_x - min_x
        projected_height = max_y - min_y
        usable_width = width - SHOWCASE_CANVAS_PADDING * 2
        usable_height = height - SHOWCASE_CANVAS_PADDING * 2
        scale = min(usable_width / projected_width, usable_height / projected_height)
        fitted_width = projected_width * scale
        fitted_height = projected_height * scale
        return cls(
            width=width,
            height=height,
            bbox=bbox,
            projected_bounds=(min_x, min_y, max_x, max_y),
            scale=scale,
            offset_x=(width - fitted_width) / 2.0,
            offset_y=(height - fitted_height) / 2.0,
        )

    def project(self, lon: float, lat: float) -> tuple[float, float]:
        min_x, _min_y, _max_x, max_y = self.projected_bounds
        raw_x, raw_y = project_laea(lon, lat)
        x = self.offset_x + (raw_x - min_x) * self.scale
        y = self.offset_y + (max_y - raw_y) * self.scale
        return x, y


def project_laea(lon: float, lat: float) -> tuple[float, float]:
    lon0 = math.radians(PROJECTION_CENTER_LON)
    lat0 = math.radians(PROJECTION_CENTER_LAT)
    lon_rad = math.radians(lon)
    lat_rad = math.radians(lat)
    denominator = 1 + math.sin(lat0) * math.sin(lat_rad) + math.cos(lat0) * math.cos(lat_rad) * math.cos(lon_rad - lon0)
    k = math.sqrt(2 / max(denominator, 1e-9))
    x = k * math.cos(lat_rad) * math.sin(lon_rad - lon0)
    y = k * (math.cos(lat0) * math.sin(lat_rad) - math.sin(lat0) * math.cos(lat_rad) * math.cos(lon_rad - lon0))
    return x, y


def projection_bounds_for_bbox(bbox: tuple[float, float, float, float]) -> tuple[float, float, float, float]:
    min_lon, min_lat, max_lon, max_lat = bbox
    points: list[tuple[float, float]] = []
    steps = 32
    for index in range(steps + 1):
        ratio = index / steps
        lon = min_lon + (max_lon - min_lon) * ratio
        lat = min_lat + (max_lat - min_lat) * ratio
        points.append(project_laea(lon, min_lat))
        points.append(project_laea(lon, max_lat))
        points.append(project_laea(min_lon, lat))
        points.append(project_laea(max_lon, lat))
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return (min(xs), min(ys), max(xs), max(ys))


def read_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise ValueError(f"Expected JSON object in {path}")
    return payload


def write_text_lf(path: Path, text: str) -> None:
    path.write_bytes(text.replace("\r\n", "\n").encode("utf-8"))


def repo_path(path: Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


def repo_relative_path(relative_path: str) -> Path:
    if not relative_path or Path(relative_path).is_absolute():
        raise ValueError(f"Expected repo-relative path, got {relative_path!r}")
    return REPO_ROOT / relative_path


def fmt(value: float) -> str:
    return f"{value:.1f}".rstrip("0").rstrip(".")


def clamp_hex(color: str | None, default: str = "#9fb6a7") -> str:
    if not isinstance(color, str) or len(color) != 7 or not color.startswith("#"):
        return default
    return color


def validate_tag(tag: str) -> str:
    if not TAG_PATTERN.fullmatch(tag):
        raise ValueError(f"Unexpected country tag for showcase SVG: {tag!r}")
    return tag


def topology_features(path: Path, object_name: str) -> list[dict]:
    payload = read_json(path)
    collection = serialize_as_geojson(payload, objectname=object_name)
    features = collection.get("features") if isinstance(collection, dict) else None
    if not isinstance(features, list):
        return []
    return [feature for feature in features if isinstance(feature, dict)]


def scenario_paths(manifest_path: Path = HOI4_MANIFEST, capital_defaults_path: Path | None = None) -> dict[str, Path]:
    manifest = read_json(manifest_path)
    paths = {
        "manifest": manifest_path,
        "runtime_topology": repo_relative_path(manifest["runtime_topology_url"]),
        "owners": repo_relative_path(manifest["owners_url"]),
        "countries": repo_relative_path(manifest["countries_url"]),
    }
    capital_hints_url = manifest.get("capital_hints_url")
    if isinstance(capital_hints_url, str) and capital_hints_url:
        paths["capital_hints"] = repo_relative_path(capital_hints_url)
    city_overrides_url = manifest.get("city_overrides_url")
    if isinstance(city_overrides_url, str) and city_overrides_url:
        paths["city_overrides"] = repo_relative_path(city_overrides_url)
    if capital_defaults_path is not None:
        paths["capital_defaults"] = capital_defaults_path
    atlantropa_topology_url = manifest.get("scenario_atlantropa_topology_url")
    if isinstance(atlantropa_topology_url, str) and atlantropa_topology_url:
        paths["atlantropa_topology"] = repo_relative_path(atlantropa_topology_url)
    atlantropa_metadata_url = manifest.get("scenario_atlantropa_metadata_url")
    if isinstance(atlantropa_metadata_url, str) and atlantropa_metadata_url:
        paths["atlantropa_metadata"] = repo_relative_path(atlantropa_metadata_url)
    return paths


def rail_paths() -> list[Path]:
    catalog = read_json(RAIL_CATALOG)
    paths: list[Path] = []
    for entry in catalog.get("entries", []):
        if entry.get("region_id") != "europe":
            continue
        manifest = read_json(repo_relative_path(entry["manifest_path"]))
        rail_path = manifest.get("paths", {}).get("full", {}).get("railways")
        if isinstance(rail_path, str) and rail_path:
            paths.append(repo_relative_path(rail_path))
    return paths


def valid_geometry(geometry: BaseGeometry) -> BaseGeometry:
    if geometry.is_valid:
        return geometry
    return make_valid(geometry)


def renderable_geometry(geometry: BaseGeometry) -> BaseGeometry:
    try:
        return valid_geometry(geometry)
    except GEOSException:
        try:
            return geometry.buffer(0)
        except GEOSException:
            return GeometryCollection()


def europe_country_tags(countries: dict) -> set[str]:
    tags = {
        tag
        for tag, country in countries.items()
        if isinstance(country, dict) and country.get("continent_id") == "continent_europe"
    }
    return tags | TRANSREGIONAL_EUROPE_SHOWCASE_TAGS


def polygon_path(geometry: BaseGeometry, canvas: Canvas, include_interiors: bool = False) -> list[str]:
    if geometry.is_empty:
        return []
    if geometry.geom_type == "Polygon":
        rings = [ring_path(geometry.exterior.coords, canvas)]
        if include_interiors:
            rings.extend(ring_path(interior.coords, canvas) for interior in geometry.interiors)
        path = " ".join(ring for ring in rings if ring)
        return [path] if path else []
    if geometry.geom_type == "MultiPolygon":
        paths: list[str] = []
        for polygon in sorted(geometry.geoms, key=lambda item: item.area, reverse=True):
            paths.extend(polygon_path(polygon, canvas, include_interiors=include_interiors))
        return [path for path in paths if path]
    return []


def ring_path(points: Iterable[tuple[float, float]], canvas: Canvas) -> str:
    projected = [canvas.project(float(lon), float(lat)) for lon, lat, *_ in points]
    if len(projected) < 3:
        return ""
    commands = [f"M{fmt(projected[0][0])} {fmt(projected[0][1])}"]
    commands.extend(f"L{fmt(x)} {fmt(y)}" for x, y in projected[1:])
    commands.append("Z")
    return " ".join(commands)


def line_path(geometry: BaseGeometry, canvas: Canvas) -> list[tuple[str, float, str]]:
    if geometry.is_empty:
        return []
    if geometry.geom_type == "LineString":
        line = project_line(geometry.coords, canvas)
        return [line] if line else []
    if geometry.geom_type == "MultiLineString":
        paths: list[tuple[str, float, str]] = []
        for line in geometry.geoms:
            paths.extend(line_path(line, canvas))
        return paths
    return []


def project_line(points: Iterable[tuple[float, float]], canvas: Canvas) -> tuple[str, float, str] | None:
    projected = [canvas.project(float(lon), float(lat)) for lon, lat, *_ in points]
    if len(projected) < 2:
        return None
    commands = [f"M{fmt(projected[0][0])} {fmt(projected[0][1])}"]
    commands.extend(f"L{fmt(x)} {fmt(y)}" for x, y in projected[1:])
    length_px = sum(math.hypot(x2 - x1, y2 - y1) for (x1, y1), (x2, y2) in zip(projected, projected[1:]))
    key_points = tuple((round(x / RAIL_DEDUPE_PIXEL_GRID), round(y / RAIL_DEDUPE_PIXEL_GRID)) for x, y in projected)
    forward_key = "|".join(f"{x}:{y}" for x, y in key_points)
    reverse_key = "|".join(f"{x}:{y}" for x, y in reversed(key_points))
    return " ".join(commands), length_px, min(forward_key, reverse_key)


def load_scenario_territories(
    canvas: Canvas,
    manifest_path: Path = HOI4_MANIFEST,
    *,
    neutral: bool = False,
    capital_defaults_path: Path | None = None,
) -> tuple[list[dict], dict[str, int], dict[str, Path], dict]:
    paths = scenario_paths(manifest_path, capital_defaults_path)
    countries = read_json(paths["countries"])["countries"]
    owners = read_json(paths["owners"])["owners"]
    showcase_tags = europe_country_tags(countries)
    clip = box(*canvas.bbox)
    by_tag: dict[str, list[BaseGeometry]] = defaultdict(list)
    source_feature_count = 0

    for feature in topology_features(paths["runtime_topology"], "political"):
        properties = feature.get("properties") or {}
        feature_id = properties.get("id") or feature.get("id")
        tag = owners.get(feature_id)
        country = countries.get(tag)
        if tag not in showcase_tags or not country:
            continue
        geometry_payload = feature.get("geometry")
        if not geometry_payload:
            continue
        geometry = valid_geometry(shape(geometry_payload))
        if not geometry.intersects(clip):
            continue
        clipped = valid_geometry(geometry.intersection(clip))
        if clipped.is_empty:
            continue
        by_tag[tag].append(clipped)
        source_feature_count += 1

    territories: list[dict] = []
    for tag, geometries in sorted(by_tag.items()):
        country = countries[tag]
        merged = unary_union(geometries).simplify(0.055, preserve_topology=True)
        path_commands = polygon_path(merged, canvas)
        if not path_commands:
            continue
        territories.append(
            {
                "tag": tag,
                "name": country.get("display_name") or tag,
                "color": "#a9bcb0" if neutral else clamp_hex(country.get("color_hex")),
                "paths": path_commands[:18],
                "scenario_only": bool(country.get("scenario_only")),
                "notes": country.get("notes") or "",
            }
        )

    return territories, {"source_features": source_feature_count, "territories": len(territories)}, paths, countries


def load_political_layers(canvas: Canvas) -> tuple[list[dict], dict[str, int]]:
    territories, counts, _paths, _countries = load_scenario_territories(canvas)
    return territories, counts


def capital_hint_entries(paths: dict[str, Path]) -> tuple[list[dict], list[Path]]:
    if "capital_hints" in paths:
        return read_json(paths["capital_hints"])["entries"], [paths["capital_hints"]]

    for key in ("capital_defaults", "city_overrides"):
        path = paths.get(key)
        if path is None or not path.exists():
            continue
        payload = read_json(path)
        hints = payload.get("capital_city_hints")
        if not isinstance(hints, dict):
            continue
        return [hint for hint in hints.values() if isinstance(hint, dict)], [path]

    return [], []


def load_scenario_capitals(
    canvas: Canvas,
    countries: dict,
    paths: dict[str, Path],
    *,
    limit: int = 22,
) -> tuple[list[dict], list[Path]]:
    showcase_tags = europe_country_tags(countries)
    entries, source_paths = capital_hint_entries(paths)
    capitals: list[dict] = []
    for entry in entries:
        tag = entry.get("tag")
        country = countries.get(tag)
        lon = entry.get("lon")
        lat = entry.get("lat")
        if tag not in showcase_tags or not country or lon is None or lat is None:
            continue
        if not (canvas.bbox[0] <= lon <= canvas.bbox[2] and canvas.bbox[1] <= lat <= canvas.bbox[3]):
            continue
        x, y = canvas.project(float(lon), float(lat))
        capitals.append(
            {
                "tag": tag,
                "name": entry.get("city_name") or entry.get("name_ascii") or tag,
                "country": country.get("display_name") or tag,
                "x": x,
                "y": y,
                "focus": tag in SHOWCASE_FOCUS_TAGS,
            }
        )
    return sorted(capitals, key=lambda item: (not item["focus"], item["tag"]))[:limit], source_paths


def load_capitals(canvas: Canvas) -> list[dict]:
    paths = scenario_paths()
    countries = read_json(paths["countries"])["countries"]
    capitals, _source_paths = load_scenario_capitals(canvas, countries, paths)
    return capitals


def load_rail_paths(canvas: Canvas) -> tuple[list[str], int, int, dict[str, int]]:
    clip = box(*canvas.bbox)
    candidates: list[tuple[str, float, str, str]] = []
    inspected = 0
    for shard in rail_paths():
        shard_id = shard.parent.name
        for feature in topology_features(shard, "railways"):
            inspected += 1
            geometry_payload = feature.get("geometry")
            if not geometry_payload:
                continue
            geometry = valid_geometry(shape(geometry_payload))
            if not geometry.intersects(clip):
                continue
            clipped = valid_geometry(geometry.intersection(clip)).simplify(0.035, preserve_topology=True)
            for path, length_px, path_key in line_path(clipped, canvas):
                if path and length_px >= RAIL_MIN_PROJECTED_PX:
                    candidates.append((shard_id, length_px, path, path_key))
    candidates_by_shard: dict[str, list[tuple[float, str, str]]] = defaultdict(list)
    for shard_id, length_px, path, path_key in candidates:
        candidates_by_shard[shard_id].append((length_px, path, path_key))

    selected: list[str] = []
    selected_keys: set[str] = set()
    selected_by_shard: dict[str, int] = {}
    for shard_id, shard_candidates in sorted(candidates_by_shard.items()):
        shard_candidates.sort(reverse=True)
        for _length_px, path, path_key in shard_candidates:
            if selected_by_shard.get(shard_id, 0) >= RAIL_MIN_LINES_PER_SHARD:
                break
            if path_key in selected_keys:
                continue
            selected.append(path)
            selected_keys.add(path_key)
            selected_by_shard[shard_id] = selected_by_shard.get(shard_id, 0) + 1

    all_candidates = sorted(((length_px, shard_id, path, path_key) for shard_id, length_px, path, path_key in candidates), reverse=True)
    for _length_px, shard_id, path, path_key in all_candidates:
        if len(selected) >= RAIL_LINE_LIMIT:
            break
        if path_key in selected_keys:
            continue
        selected.append(path)
        selected_keys.add(path_key)
        selected_by_shard[shard_id] = selected_by_shard.get(shard_id, 0) + 1

    return selected, inspected, len(candidates), selected_by_shard


def graticule(canvas: Canvas) -> str:
    min_lon, min_lat, max_lon, max_lat = canvas.bbox
    lines: list[str] = []
    lon = math.ceil(min_lon / 10) * 10
    while lon < max_lon:
        x1, y1 = canvas.project(lon, min_lat)
        x2, y2 = canvas.project(lon, max_lat)
        lines.append(f'<path d="M{fmt(x1)} {fmt(y1)} L{fmt(x2)} {fmt(y2)}" />')
        lon += 10
    lat = math.ceil(min_lat / 10) * 10
    while lat < max_lat:
        x1, y1 = canvas.project(min_lon, lat)
        x2, y2 = canvas.project(max_lon, lat)
        lines.append(f'<path d="M{fmt(x1)} {fmt(y1)} L{fmt(x2)} {fmt(y2)}" />')
        lat += 10
    return "\n      ".join(lines)


def territory_nodes(territories: list[dict]) -> str:
    nodes: list[str] = []
    for item in territories:
        tag = validate_tag(item["tag"])
        escaped_tag = xml_escape(tag)
        focus_class = " territory--focus" if tag in SHOWCASE_FOCUS_TAGS else ""
        scenario_only_class = " territory--scenario-only" if item["scenario_only"] else ""
        for path in item["paths"]:
            nodes.append(
                f'      <path class="territory territory--{tag.lower()}{focus_class}{scenario_only_class}" '
                f'data-tag="{escaped_tag}" fill="{item["color"]}" d="{path}" />'
            )
    return "\n".join(nodes)


def rail_nodes(paths: list[str]) -> str:
    return "\n".join(f'      <path class="rail-line" d="{path}" />' for path in paths)


def capital_nodes(capitals: list[dict]) -> str:
    nodes: list[str] = []
    for item in capitals:
        tag = validate_tag(item["tag"])
        escaped_tag = xml_escape(tag)
        focus_class = " capital--focus" if item["focus"] else ""
        nodes.append(
            f'      <g class="capital{focus_class}" data-tag="{escaped_tag}">'
            f'<circle cx="{fmt(item["x"])}" cy="{fmt(item["y"])}" r="5.8" />'
            f'<text x="{fmt(item["x"] + 9)}" y="{fmt(item["y"] - 7)}">{escaped_tag}</text>'
            "</g>"
        )
    return "\n".join(nodes)


def day_night_nodes(canvas: Canvas, capitals: list[dict]) -> str:
    shade_start = -canvas.width * 0.64
    shade_end = canvas.width * 0.64
    band_x = -canvas.width
    band_width = canvas.width * 1.32
    terminator_path = (
        f"M{fmt(canvas.width * 0.24)} {fmt(-canvas.height * 0.06)} "
        f"C{fmt(canvas.width * 0.33)} {fmt(canvas.height * 0.19)} "
        f"{fmt(canvas.width * 0.31)} {fmt(canvas.height * 0.4)} "
        f"{fmt(canvas.width * 0.39)} {fmt(canvas.height * 0.63)} "
        f"C{fmt(canvas.width * 0.44)} {fmt(canvas.height * 0.81)} "
        f"{fmt(canvas.width * 0.52)} {fmt(canvas.height * 0.92)} "
        f"{fmt(canvas.width * 0.6)} {fmt(canvas.height * 1.06)}"
    )
    nodes: list[str] = []
    for item in capitals:
        tag = validate_tag(item["tag"])
        escaped_tag = xml_escape(tag)
        radius = 7.8 if item["focus"] else 5.8
        nodes.append(
            f'      <circle class="night-light" data-tag="{escaped_tag}" '
            f'cx="{fmt(item["x"])}" cy="{fmt(item["y"])}" r="{fmt(radius)}" />'
        )
    light_nodes = "\n".join(nodes)
    return f"""    <g class="day-night-shade" aria-hidden="true">
      <animateTransform attributeName="transform" type="translate" values="{fmt(shade_start)} 0;{fmt(shade_end)} 0;{fmt(shade_start)} 0" dur="24s" repeatCount="indefinite" />
      <rect class="night-band" x="{fmt(band_x)}" y="0" width="{fmt(band_width)}" height="{fmt(canvas.height)}" />
      <path class="terminator-line" d="{terminator_path}" />
    </g>
    <g class="night-lights" aria-hidden="true">
{light_nodes}
    </g>"""


def blank_land_nodes(paths: list[str]) -> str:
    return "\n".join(f'      <path class="blank-land" fill-rule="evenodd" d="{path}" />' for path in paths)


def load_blank_land_paths(canvas: Canvas) -> tuple[list[str], dict[str, int], list[Path]]:
    clip = box(*canvas.bbox)
    selected_paths: list[tuple[float, str]] = []
    inspected = 0
    candidate_count = 0
    clipped_count = 0
    for feature in topology_features(EUROPE_BLANK_TOPOLOGY, "political"):
        geometry_payload = feature.get("geometry")
        if not geometry_payload:
            continue
        inspected += 1
        raw_geometry = shape(geometry_payload)
        min_x, min_y, max_x, max_y = raw_geometry.bounds
        if max_x < canvas.bbox[0] or min_x > canvas.bbox[2] or max_y < canvas.bbox[1] or min_y > canvas.bbox[3]:
            continue
        candidate_count += 1
        geometry = renderable_geometry(raw_geometry)
        if geometry.is_empty:
            continue
        clipped = renderable_geometry(geometry.intersection(clip)).simplify(0.045, preserve_topology=True)
        if clipped.is_empty:
            continue
        clipped_count += 1
        selected_paths.extend((clipped.area, path) for path in polygon_path(clipped, canvas, include_interiors=True))
    selected_paths.sort(reverse=True)
    land_path_limit = 900
    path_commands = [path for _area, path in selected_paths[:land_path_limit]]
    return path_commands, {
        "land_features_inspected": inspected,
        "land_features_candidates": candidate_count,
        "land_features_clipped": clipped_count,
        "land_paths_available": len(selected_paths),
        "land_paths": len(path_commands),
        "land_paths_dropped": max(0, len(selected_paths) - len(path_commands)),
        "land_path_limit": land_path_limit,
    }, [BLANK_BASE_MANIFEST, EUROPE_BLANK_TOPOLOGY]


def load_atlantropa_paths(canvas: Canvas, paths: dict[str, Path]) -> tuple[dict[str, list[str]], dict[str, int], list[Path]]:
    topology_path = paths.get("atlantropa_topology")
    metadata_path = paths.get("atlantropa_metadata")
    if topology_path is None:
        return {}, {}, []
    if metadata_path is not None:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        if metadata.get("scenario_id") != "tno_1962":
            raise ValueError(f"Unexpected Atlantropa metadata scenario in {metadata_path}")
    clip = box(*canvas.bbox)
    layer_paths: dict[str, list[str]] = {"water": [], "land": [], "shoal": []}
    inspected = 0
    clipped_count = 0
    for feature in topology_features(topology_path, "scenario_atlantropa"):
        properties = feature.get("properties") or {}
        layer = properties.get("atl_render_layer")
        if layer not in layer_paths:
            continue
        geometry_payload = feature.get("geometry")
        if not geometry_payload:
            continue
        inspected += 1
        geometry = valid_geometry(shape(geometry_payload))
        if not geometry.intersects(clip):
            continue
        clipped = valid_geometry(geometry.intersection(clip)).simplify(0.04, preserve_topology=True)
        if clipped.is_empty:
            continue
        clipped_count += 1
        layer_paths[layer].extend(polygon_path(clipped, canvas))
    for layer, items in layer_paths.items():
        layer_paths[layer] = items[:90]
    source_paths = [topology_path]
    if metadata_path is not None:
        source_paths.append(metadata_path)
    counts = {
        "atlantropa_features_inspected": inspected,
        "atlantropa_features_clipped": clipped_count,
        "atlantropa_paths": sum(len(items) for items in layer_paths.values()),
    }
    return layer_paths, counts, source_paths


def hero_output_paths(output_dir: Path, mode: str) -> dict[str, Path]:
    defaults = HERO_SCENARIO_OUTPUTS[mode]
    if output_dir == LANDING_ASSETS:
        return defaults
    return {
        "svg": output_dir / defaults["svg"].name,
        "metadata": output_dir / defaults["metadata"].name,
    }


def hero_source_files(
    paths: dict[str, Path],
    capital_source_paths: list[Path],
    overlay_source_paths: list[Path] | None = None,
) -> list[str]:
    ordered: list[Path] = [
        paths["manifest"],
        paths["runtime_topology"],
        paths["owners"],
        paths["countries"],
    ]
    ordered.extend(capital_source_paths)
    ordered.extend(overlay_source_paths or [])
    return [repo_path(path) for path in ordered]


def atlantropa_nodes(paths_by_layer: dict[str, list[str]]) -> str:
    nodes: list[str] = []
    for layer in ("water", "shoal", "land"):
        for path in paths_by_layer.get(layer, []):
            nodes.append(f'      <path class="atlantropa atlantropa--{layer}" d="{path}" />')
    return "\n".join(nodes)


def build_hero_svg(
    canvas: Canvas,
    scenario: HeroScenario,
    territories: list[dict],
    capitals: list[dict],
    land_paths: list[str],
    overlay_paths: dict[str, list[str]] | None = None,
) -> str:
    title = xml_escape(scenario.title)
    if scenario.blank:
        political_layer = blank_land_nodes(land_paths)
        capital_layer = ""
    else:
        political_layer = territory_nodes(territories)
        capital_layer = capital_nodes(capitals)
    atlantropa_layer = atlantropa_nodes(overlay_paths or {})
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {canvas.width} {canvas.height}" role="img" aria-label="{title}" data-hero-scenario="{xml_escape(scenario.mode)}" data-scenario-id="{xml_escape(scenario.scenario_id)}">
  <defs>
    <radialGradient id="heroSeaGlow" cx="50%" cy="44%" r="78%">
      <stop offset="0" stop-color="#244a68" />
      <stop offset="1" stop-color="#071522" />
    </radialGradient>
    <filter id="heroCapitalGlow"><feGaussianBlur stdDeviation="7" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <style>
      .hero-graticule path {{ fill: none; stroke: rgba(255,255,255,.13); stroke-width: 1; }}
      .territory {{ stroke: #0b1725; stroke-width: 1.08; vector-effect: non-scaling-stroke; opacity: .9; }}
      .territory--focus {{ stroke: #f5d675; stroke-width: 1.55; }}
      .territory--scenario-only {{ stroke-dasharray: 5 4; }}
      .blank-land {{ fill: #aab9ae; stroke: #d8e2db; stroke-width: 1.06; vector-effect: non-scaling-stroke; opacity: .74; }}
      .atlantropa {{ vector-effect: non-scaling-stroke; opacity: .72; }}
      .atlantropa--water {{ fill: #1e5772; stroke: #8fc7cc; stroke-width: .8; opacity: .42; }}
      .atlantropa--shoal {{ fill: #b7a985; stroke: #f0dfaa; stroke-width: .8; opacity: .52; }}
      .atlantropa--land {{ fill: #b8ad85; stroke: #f2d886; stroke-width: .9; opacity: .58; }}
      .capital circle {{ fill: #050b12; stroke: #dfeaf0; stroke-width: 2.2; filter: url(#heroCapitalGlow); opacity: .84; }}
      .capital text {{ fill: #edf7fb; font: 800 14px Arial, sans-serif; paint-order: stroke; stroke: #07111f; stroke-width: 4; opacity: .82; }}
      svg[data-hero-scenario="blank"] .hero-graticule path {{ stroke: rgba(255,255,255,.18); }}
      svg[data-hero-scenario="blank"] .blank-land {{ fill: #b6c3bb; stroke: #edf4ee; opacity: .82; }}
      svg[data-hero-scenario="hoi4-1936"] .territory {{ opacity: .9; }}
      svg[data-hero-scenario="hoi4-1939"] .territory {{ opacity: .93; }}
      svg[data-hero-scenario="tno-1962"] .territory {{ stroke: #050b13; stroke-width: 1.18; opacity: .88; }}
      svg[data-hero-scenario="tno-1962"] .territory--scenario-only {{ stroke: #f0c35f; }}
    </style>
  </defs>
  <rect width="{canvas.width}" height="{canvas.height}" rx="28" fill="url(#heroSeaGlow)" />
  <g class="hero-graticule" aria-hidden="true">
      {graticule(canvas)}
  </g>
  <g class="hero-political" data-layer="political">
{political_layer}
  </g>
  <g class="hero-atlantropa" data-layer="atlantropa">
{atlantropa_layer}
  </g>
  <g class="hero-capitals" data-layer="capitals">
{capital_layer}
  </g>
</svg>
"""


def build_hero_metadata(
    canvas: Canvas,
    scenario: HeroScenario,
    source_files: list[str],
    counts: dict[str, int],
    territories: list[dict],
    capitals: list[dict],
) -> dict:
    min_x, min_y, max_x, max_y = canvas.projected_bounds
    selection_policy = {
        "viewport": "Europe hero crop shared by all scenario chips",
        "blank_canvas": scenario.blank,
        "ownership_fill": not scenario.blank,
        "capital_limit": 0 if scenario.blank else 18,
    }
    if scenario.blank:
        selection_policy.update(
            {
                "land_path_limit": counts.get("land_path_limit"),
                "land_path_ranking": "clipped geometry area descending",
            }
        )
    return {
        "schema_version": 1,
        "asset_type": "landing_hero_scenario_map",
        "scenario_id": scenario.scenario_id,
        "mode": scenario.mode,
        "title": scenario.title,
        "palette_class": scenario.palette_class,
        "viewport": {
            "bbox": list(EUROPE_BBOX),
            "projection": "lambert_azimuthal_equal_area",
            "center_lon": PROJECTION_CENTER_LON,
            "center_lat": PROJECTION_CENTER_LAT,
            "canvas_width": canvas.width,
            "canvas_height": canvas.height,
            "canvas_padding": SHOWCASE_CANVAS_PADDING,
            "projected_bounds": [min_x, min_y, max_x, max_y],
            "scale": canvas.scale,
        },
        "source_files": source_files,
        "feature_counts": dict(counts),
        "counts": dict(counts),
        "territory_tags": sorted(item["tag"] for item in territories),
        "capital_tags": sorted(item["tag"] for item in capitals),
        "selection_policy": selection_policy,
    }


def build_hero_scenario_maps(output_dir: Path = LANDING_ASSETS) -> None:
    canvas = Canvas.create(HERO_CANVAS_WIDTH, HERO_CANVAS_HEIGHT, EUROPE_BBOX)
    for scenario in HERO_SCENARIOS:
        output_paths = hero_output_paths(output_dir, scenario.mode)
        if scenario.blank:
            land_paths, counts, blank_source_paths = load_blank_land_paths(canvas)
            territories: list[dict] = []
            capitals: list[dict] = []
            source_files = [repo_path(path) for path in blank_source_paths]
        else:
            territories, political_counts, paths, countries = load_scenario_territories(
                canvas,
                scenario.manifest_path,
                capital_defaults_path=scenario.capital_defaults_path,
            )
            capitals, capital_source_paths = load_scenario_capitals(canvas, countries, paths, limit=18)
            overlay_paths, overlay_counts, overlay_source_paths = load_atlantropa_paths(canvas, paths)
            counts = {
                "territories": political_counts["territories"],
                "political_features": political_counts["source_features"],
                "capitals": len(capitals),
                **overlay_counts,
            }
            source_files = hero_source_files(paths, capital_source_paths, overlay_source_paths)
        write_text_lf(
            output_paths["svg"],
            build_hero_svg(
                canvas,
                scenario,
                territories,
                capitals,
                land_paths if scenario.blank else [],
                overlay_paths if not scenario.blank else {},
            ),
        )
        metadata = build_hero_metadata(canvas, scenario, source_files, counts, territories, capitals)
        write_text_lf(output_paths["metadata"], json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")


def build_svg(canvas: Canvas, territories: list[dict], capitals: list[dict], rails: list[str]) -> str:
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {canvas.width} {canvas.height}" role="img" aria-label="Europe 1936 scenario showcase built from Scenario Forge data" data-active-layer="political">
  <defs>
    <radialGradient id="seaGlow" cx="52%" cy="42%" r="76%">
      <stop offset="0" stop-color="#17395a" />
      <stop offset="1" stop-color="#081523" />
    </radialGradient>
    <linearGradient id="nightCycleGradient" x1="0%" x2="100%" y1="0%" y2="0%">
      <stop offset="0" stop-color="#04111f" stop-opacity=".9" />
      <stop offset="44%" stop-color="#071a2c" stop-opacity=".82" />
      <stop offset="56%" stop-color="#132f49" stop-opacity=".42" />
      <stop offset="72%" stop-color="#f8d77f" stop-opacity=".1" />
      <stop offset="100%" stop-color="#f8d77f" stop-opacity="0" />
    </linearGradient>
    <filter id="capitalGlow"><feGaussianBlur stdDeviation="8" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="nightLightGlow"><feGaussianBlur stdDeviation="7" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <style>
      .graticule path {{ fill: none; stroke: rgba(255,255,255,.12); stroke-width: 1; }}
      .territory {{ stroke: #091426; stroke-width: 1.05; vector-effect: non-scaling-stroke; opacity: .78; }}
      .territory--focus {{ stroke: #f8d77f; stroke-width: 1.45; opacity: .92; }}
      .territory--scenario-only {{ stroke-dasharray: 5 4; }}
      .rail-line {{ fill: none; stroke: #f2a65a; stroke-width: 2.1; stroke-linecap: round; opacity: .22; vector-effect: non-scaling-stroke; }}
      .capital circle {{ fill: #fff0af; stroke: #143044; stroke-width: 2; filter: url(#capitalGlow); opacity: .42; }}
      .capital text {{ fill: #f8fbff; font: 700 15px Arial, sans-serif; letter-spacing: 1px; paint-order: stroke; stroke: #07111f; stroke-width: 4; opacity: .5; }}
      .layer-rail, .layer-cities, .layer-day-night {{ transition: opacity .25s ease; }}
      .layer-day-night {{ opacity: 0; pointer-events: none; }}
      .night-band {{ fill: url(#nightCycleGradient); opacity: .9; }}
      .terminator-line {{ fill: none; stroke: rgba(248,215,127,.82); stroke-width: 7; stroke-linecap: round; opacity: .78; filter: url(#capitalGlow); }}
      .night-light {{ fill: #ffe48a; opacity: .86; filter: url(#nightLightGlow); }}
      svg[data-active-layer="political"] .territory {{ opacity: .9; }}
      svg[data-active-layer="political"] .layer-rail {{ opacity: .28; }}
      svg[data-active-layer="political"] .layer-cities {{ opacity: .42; }}
      svg[data-active-layer="political"] .layer-day-night {{ opacity: 0; }}
      svg[data-active-layer="rail"] .territory {{ opacity: .48; }}
      svg[data-active-layer="rail"] .layer-rail {{ opacity: 1; }}
      svg[data-active-layer="rail"] .rail-line {{ opacity: .92; stroke-width: 2.7; }}
      svg[data-active-layer="rail"] .layer-cities {{ opacity: .5; }}
      svg[data-active-layer="rail"] .layer-day-night {{ opacity: 0; }}
      svg[data-active-layer="cities"] .territory {{ opacity: .52; }}
      svg[data-active-layer="cities"] .layer-rail {{ opacity: .3; }}
      svg[data-active-layer="cities"] .layer-cities {{ opacity: 1; }}
      svg[data-active-layer="cities"] .capital circle {{ opacity: .95; }}
      svg[data-active-layer="cities"] .capital text {{ opacity: 1; }}
      svg[data-active-layer="cities"] .layer-day-night {{ opacity: 0; }}
      svg[data-active-layer="day-night"] .territory {{ opacity: .64; }}
      svg[data-active-layer="day-night"] .territory--focus {{ opacity: .9; }}
      svg[data-active-layer="day-night"] .layer-rail {{ opacity: .46; }}
      svg[data-active-layer="day-night"] .layer-cities {{ opacity: .78; }}
      svg[data-active-layer="day-night"] .capital circle {{ opacity: .62; }}
      svg[data-active-layer="day-night"] .capital text {{ opacity: .52; }}
      svg[data-active-layer="day-night"] .layer-day-night {{ opacity: 1; }}
    </style>
  </defs>
  <rect width="{canvas.width}" height="{canvas.height}" rx="28" fill="url(#seaGlow)" />
  <g class="viewport" data-showcase-viewport="true" transform="translate(0 0) scale(1)">
  <g class="graticule" aria-hidden="true">
      {graticule(canvas)}
  </g>
  <g class="layer layer-political" data-layer="political">
{territory_nodes(territories)}
  </g>
  <g class="layer layer-rail" data-layer="rail">
{rail_nodes(rails)}
  </g>
  <g class="layer layer-cities" data-layer="cities">
{capital_nodes(capitals)}
  </g>
  <g class="layer layer-day-night" data-layer="day-night">
{day_night_nodes(canvas, capitals)}
  </g>
  </g>
</svg>
"""


def build_metadata(
    canvas: Canvas,
    political_counts: dict[str, int],
    territories: list[dict],
    capitals: list[dict],
    selected_rail_paths: list[str],
    rail_inspected: int,
    rail_candidates: int,
    rail_selected_by_shard: dict[str, int],
) -> dict:
    paths = scenario_paths()
    rail_paths_source = rail_paths()
    territory_tags = sorted(item["tag"] for item in territories)
    capital_tags = sorted(item["tag"] for item in capitals)
    min_x, min_y, max_x, max_y = canvas.projected_bounds
    return {
        "schema_version": 1,
        "scenario_id": "hoi4_1936",
        "title": "Europe 1936 homepage showcase",
        "bbox": list(EUROPE_BBOX),
        "projection": {
            "name": "lambert_azimuthal_equal_area",
            "center_lon": PROJECTION_CENTER_LON,
            "center_lat": PROJECTION_CENTER_LAT,
            "canvas_width": canvas.width,
            "canvas_height": canvas.height,
            "canvas_padding": SHOWCASE_CANVAS_PADDING,
            "projected_bounds": [min_x, min_y, max_x, max_y],
            "scale": canvas.scale,
        },
        "selection_policy": {
            "territories": "countries with continent_id=continent_europe plus configured transregional tags inside the Europe-focused viewport",
            "transregional_tags": sorted(TRANSREGIONAL_EUROPE_SHOWCASE_TAGS),
            "capital_limit": 22,
            "rail_source": "full",
            "rail_limit": RAIL_LINE_LIMIT,
            "rail_min_lines_per_shard": RAIL_MIN_LINES_PER_SHARD,
            "rail_min_projected_px": RAIL_MIN_PROJECTED_PX,
            "rail_dedupe_pixel_grid": RAIL_DEDUPE_PIXEL_GRID,
            "rail_ranking_key": "clipped_projected_length_px",
            "rail_dedupe_key": "projected_path_grid_or_reverse",
        },
        "sources": [
            repo_path(HOI4_MANIFEST),
            repo_path(paths["runtime_topology"]),
            repo_path(paths["countries"]),
            repo_path(paths["owners"]),
            repo_path(paths["capital_hints"]),
            repo_path(RAIL_CATALOG),
            *[repo_path(path) for path in rail_paths_source],
        ],
        "counts": {
            "territories": political_counts["territories"],
            "political_features": political_counts["source_features"],
            "capitals": len(capitals),
            "rail_lines_selected": len(selected_rail_paths),
            "rail_lines_candidates": rail_candidates,
            "rail_features_inspected": rail_inspected,
        },
        "rail_selected_by_shard": dict(sorted(rail_selected_by_shard.items())),
        "territory_tags": territory_tags,
        "capital_tags": capital_tags,
        "focus_tags": sorted(tag for tag in SHOWCASE_FOCUS_TAGS if tag in territory_tags),
        "layers": list(SHOWCASE_LAYERS),
    }


def build_showcase() -> None:
    canvas = Canvas.create(SHOWCASE_CANVAS_WIDTH, SHOWCASE_CANVAS_HEIGHT, EUROPE_BBOX)
    territories, political_counts = load_political_layers(canvas)
    capitals = load_capitals(canvas)
    rails, rail_inspected, rail_candidates, rail_selected_by_shard = load_rail_paths(canvas)
    write_text_lf(SHOWCASE_SVG, build_svg(canvas, territories, capitals, rails))
    metadata = build_metadata(
        canvas,
        political_counts,
        territories,
        capitals,
        rails,
        rail_inspected,
        rail_candidates,
        rail_selected_by_shard,
    )
    write_text_lf(SHOWCASE_METADATA, json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")


def build_landing_assets() -> None:
    build_showcase()
    build_hero_scenario_maps()


if __name__ == "__main__":
    build_landing_assets()
