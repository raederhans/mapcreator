from __future__ import annotations

import json
import math
import re
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from xml.sax.saxutils import escape as xml_escape

from shapely.geometry import box, shape
from shapely.geometry.base import BaseGeometry
from shapely.ops import unary_union
from shapely.validation import make_valid
from topojson.utils import serialize_as_geojson


REPO_ROOT = Path(__file__).resolve().parents[1]
LANDING_ASSETS = REPO_ROOT / "landing" / "assets"
HOI4_MANIFEST = REPO_ROOT / "data" / "scenarios" / "hoi4_1936" / "manifest.json"
RAIL_CATALOG = REPO_ROOT / "data" / "transport_layers" / "global_rail" / "catalog.json"

SHOWCASE_SVG = LANDING_ASSETS / "europe-1936-showcase.svg"
SHOWCASE_METADATA = LANDING_ASSETS / "europe-1936-showcase.json"
EUROPE_BBOX = (-12.5, 34.0, 41.5, 72.5)
SHOWCASE_CANVAS_WIDTH = 980
SHOWCASE_CANVAS_HEIGHT = 620
SHOWCASE_CANVAS_PADDING = 36
PROJECTION_CENTER_LON = 10.0
PROJECTION_CENTER_LAT = 52.0
RAIL_LINE_LIMIT = 220
RAIL_MIN_LINES_PER_SHARD = 55
RAIL_MIN_PROJECTED_PX = 8.0
RAIL_DEDUPE_PIXEL_GRID = 2.0
SCENARIO_FOCUS_TAGS = {"GER", "POL", "CZE", "ROM", "SOV", "YUG", "ITA", "FRA", "ENG"}
TRANSREGIONAL_EUROPE_SHOWCASE_TAGS = {"TUR"}
SHOWCASE_LAYERS = (
    {"id": "political", "label": "1936 political ownership"},
    {"id": "rail", "label": "Europe rail network"},
    {"id": "cities", "label": "capital anchors"},
    {"id": "scenario", "label": "scenario focus countries"},
)
TAG_PATTERN = re.compile(r"^[A-Z0-9_]{2,12}$")


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


def scenario_paths() -> dict[str, Path]:
    manifest = read_json(HOI4_MANIFEST)
    return {
        "runtime_topology": repo_relative_path(manifest["runtime_topology_url"]),
        "owners": repo_relative_path(manifest["owners_url"]),
        "countries": repo_relative_path(manifest["countries_url"]),
        "capital_hints": repo_relative_path(manifest["capital_hints_url"]),
    }


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


def europe_country_tags(countries: dict) -> set[str]:
    tags = {
        tag
        for tag, country in countries.items()
        if isinstance(country, dict) and country.get("continent_id") == "continent_europe"
    }
    return tags | TRANSREGIONAL_EUROPE_SHOWCASE_TAGS


def polygon_path(geometry: BaseGeometry, canvas: Canvas) -> list[str]:
    if geometry.is_empty:
        return []
    if geometry.geom_type == "Polygon":
        return [ring_path(geometry.exterior.coords, canvas)]
    if geometry.geom_type == "MultiPolygon":
        paths: list[str] = []
        for polygon in sorted(geometry.geoms, key=lambda item: item.area, reverse=True):
            paths.extend(polygon_path(polygon, canvas))
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


def load_political_layers(canvas: Canvas) -> tuple[list[dict], dict[str, int]]:
    paths = scenario_paths()
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
        paths = polygon_path(merged, canvas)
        if not paths:
            continue
        territories.append(
            {
                "tag": tag,
                "name": country.get("display_name") or tag,
                "color": clamp_hex(country.get("color_hex")),
                "paths": paths[:18],
                "scenario_only": bool(country.get("scenario_only")),
                "notes": country.get("notes") or "",
            }
        )

    return territories, {"source_features": source_feature_count, "territories": len(territories)}


def load_capitals(canvas: Canvas) -> list[dict]:
    paths = scenario_paths()
    countries = read_json(paths["countries"])["countries"]
    showcase_tags = europe_country_tags(countries)
    entries = read_json(paths["capital_hints"])["entries"]
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
                "focus": tag in SCENARIO_FOCUS_TAGS,
            }
        )
    return sorted(capitals, key=lambda item: (not item["focus"], item["tag"]))[:22]


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
        focus_class = " territory--focus" if tag in SCENARIO_FOCUS_TAGS else ""
        scenario_class = " territory--scenario" if item["scenario_only"] else ""
        for path in item["paths"]:
            nodes.append(
                f'      <path class="territory territory--{tag.lower()}{focus_class}{scenario_class}" '
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


def scenario_nodes(capitals: list[dict]) -> str:
    focus = [item for item in capitals if item["focus"]]
    nodes: list[str] = []
    for item in focus:
        tag = validate_tag(item["tag"])
        escaped_tag = xml_escape(tag)
        nodes.append(
            f'      <g class="scenario-marker" data-tag="{escaped_tag}">'
            f'<circle cx="{fmt(item["x"])}" cy="{fmt(item["y"])}" r="16" />'
            f'<text x="{fmt(item["x"])}" y="{fmt(item["y"] + 4)}">{escaped_tag}</text>'
            "</g>"
        )
    return "\n".join(nodes)


def build_svg(canvas: Canvas, territories: list[dict], capitals: list[dict], rails: list[str]) -> str:
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {canvas.width} {canvas.height}" role="img" aria-label="Europe 1936 scenario showcase built from Scenario Forge data" data-active-layer="political">
  <defs>
    <radialGradient id="seaGlow" cx="52%" cy="42%" r="76%">
      <stop offset="0" stop-color="#17395a" />
      <stop offset="1" stop-color="#081523" />
    </radialGradient>
    <filter id="capitalGlow"><feGaussianBlur stdDeviation="8" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <style>
      .graticule path {{ fill: none; stroke: rgba(255,255,255,.12); stroke-width: 1; }}
      .territory {{ stroke: #091426; stroke-width: 1.05; vector-effect: non-scaling-stroke; opacity: .78; }}
      .territory--focus {{ stroke: #f8d77f; stroke-width: 1.45; opacity: .92; }}
      .territory--scenario {{ stroke-dasharray: 5 4; }}
      .rail-line {{ fill: none; stroke: #f2a65a; stroke-width: 2.1; stroke-linecap: round; opacity: .22; vector-effect: non-scaling-stroke; }}
      .capital circle {{ fill: #fff0af; stroke: #143044; stroke-width: 2; filter: url(#capitalGlow); opacity: .42; }}
      .capital text {{ fill: #f8fbff; font: 700 15px Arial, sans-serif; letter-spacing: 1px; paint-order: stroke; stroke: #07111f; stroke-width: 4; opacity: .5; }}
      .scenario-marker circle {{ fill: rgba(248,215,127,.14); stroke: #f8d77f; stroke-width: 2.4; }}
      .scenario-marker text {{ fill: #06111f; font: 800 12px Arial, sans-serif; text-anchor: middle; }}
      .layer-rail, .layer-cities, .layer-scenario {{ transition: opacity .25s ease; }}
      svg[data-active-layer="political"] .territory {{ opacity: .9; }}
      svg[data-active-layer="political"] .layer-rail {{ opacity: .28; }}
      svg[data-active-layer="political"] .layer-cities {{ opacity: .42; }}
      svg[data-active-layer="political"] .layer-scenario {{ opacity: .28; }}
      svg[data-active-layer="rail"] .territory {{ opacity: .48; }}
      svg[data-active-layer="rail"] .layer-rail {{ opacity: 1; }}
      svg[data-active-layer="rail"] .rail-line {{ opacity: .92; stroke-width: 2.7; }}
      svg[data-active-layer="rail"] .layer-cities {{ opacity: .5; }}
      svg[data-active-layer="rail"] .layer-scenario {{ opacity: .22; }}
      svg[data-active-layer="cities"] .territory {{ opacity: .52; }}
      svg[data-active-layer="cities"] .layer-rail {{ opacity: .3; }}
      svg[data-active-layer="cities"] .layer-cities {{ opacity: 1; }}
      svg[data-active-layer="cities"] .capital circle {{ opacity: .95; }}
      svg[data-active-layer="cities"] .capital text {{ opacity: 1; }}
      svg[data-active-layer="cities"] .layer-scenario {{ opacity: .26; }}
      svg[data-active-layer="scenario"] .territory {{ opacity: .4; }}
      svg[data-active-layer="scenario"] .territory--focus {{ opacity: 1; stroke-width: 2; }}
      svg[data-active-layer="scenario"] .layer-rail {{ opacity: .22; }}
      svg[data-active-layer="scenario"] .layer-cities {{ opacity: .76; }}
      svg[data-active-layer="scenario"] .layer-scenario {{ opacity: 1; }}
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
  <g class="layer layer-scenario" data-layer="scenario">
{scenario_nodes(capitals)}
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
        "focus_tags": sorted(tag for tag in SCENARIO_FOCUS_TAGS if tag in territory_tags),
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


if __name__ == "__main__":
    build_showcase()
