from __future__ import annotations

import json
import math
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

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
FEATURED_TAGS = {
    "AUS",
    "BEL",
    "BUL",
    "CZE",
    "DEN",
    "ENG",
    "FIN",
    "FRA",
    "GER",
    "GRE",
    "HOL",
    "HUN",
    "ITA",
    "NOR",
    "POL",
    "POR",
    "ROM",
    "SOV",
    "SPR",
    "SWE",
    "TUR",
    "YUG",
}
SCENARIO_FOCUS_TAGS = {"GER", "POL", "CZE", "ROM", "SOV", "YUG", "ITA", "FRA", "ENG"}


@dataclass(frozen=True)
class Canvas:
    width: int
    height: int
    bbox: tuple[float, float, float, float]

    def project(self, lon: float, lat: float) -> tuple[float, float]:
        min_lon, min_lat, max_lon, max_lat = self.bbox
        x = (lon - min_lon) / (max_lon - min_lon) * self.width
        min_y = mercator_y(min_lat)
        max_y = mercator_y(max_lat)
        y = (max_y - mercator_y(lat)) / (max_y - min_y) * self.height
        return x, y


def mercator_y(lat: float) -> float:
    clamped = max(min(lat, 84.0), -84.0)
    radians = math.radians(clamped)
    return math.log(math.tan(math.pi / 4.0 + radians / 2.0))


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


def rail_preview_paths() -> list[Path]:
    catalog = read_json(RAIL_CATALOG)
    paths: list[Path] = []
    for entry in catalog.get("entries", []):
        if entry.get("region_id") != "europe":
            continue
        manifest = read_json(repo_relative_path(entry["manifest_path"]))
        preview_path = manifest.get("paths", {}).get("preview", {}).get("railways")
        if isinstance(preview_path, str) and preview_path:
            paths.append(repo_relative_path(preview_path))
    return paths


def valid_geometry(geometry: BaseGeometry) -> BaseGeometry:
    if geometry.is_valid:
        return geometry
    return make_valid(geometry)


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


def line_path(geometry: BaseGeometry, canvas: Canvas) -> list[str]:
    if geometry.is_empty:
        return []
    if geometry.geom_type == "LineString":
        return [project_line(geometry.coords, canvas)]
    if geometry.geom_type == "MultiLineString":
        paths: list[str] = []
        for line in geometry.geoms:
            paths.extend(line_path(line, canvas))
        return [path for path in paths if path]
    return []


def project_line(points: Iterable[tuple[float, float]], canvas: Canvas) -> str:
    projected = [canvas.project(float(lon), float(lat)) for lon, lat, *_ in points]
    if len(projected) < 2:
        return ""
    commands = [f"M{fmt(projected[0][0])} {fmt(projected[0][1])}"]
    commands.extend(f"L{fmt(x)} {fmt(y)}" for x, y in projected[1:])
    return " ".join(commands)


def load_political_layers(canvas: Canvas) -> tuple[list[dict], dict[str, int]]:
    paths = scenario_paths()
    countries = read_json(paths["countries"])["countries"]
    owners = read_json(paths["owners"])["owners"]
    clip = box(*canvas.bbox)
    by_tag: dict[str, list[BaseGeometry]] = defaultdict(list)
    source_feature_count = 0

    for feature in topology_features(paths["runtime_topology"], "political"):
        properties = feature.get("properties") or {}
        feature_id = properties.get("id") or feature.get("id")
        tag = owners.get(feature_id)
        country = countries.get(tag)
        if tag not in FEATURED_TAGS or not country:
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
    entries = read_json(paths["capital_hints"])["entries"]
    capitals: list[dict] = []
    for entry in entries:
        tag = entry.get("tag")
        country = countries.get(tag)
        lon = entry.get("lon")
        lat = entry.get("lat")
        if tag not in FEATURED_TAGS or not country or lon is None or lat is None:
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


def load_rail_paths(canvas: Canvas) -> tuple[list[str], int]:
    clip = box(*canvas.bbox)
    candidates: list[tuple[float, str]] = []
    inspected = 0
    for shard in rail_preview_paths():
        for feature in topology_features(shard, "railways"):
            inspected += 1
            properties = feature.get("properties") or {}
            geometry_payload = feature.get("geometry")
            if not geometry_payload:
                continue
            geometry = valid_geometry(shape(geometry_payload))
            if not geometry.intersects(clip):
                continue
            clipped = valid_geometry(geometry.intersection(clip)).simplify(0.035, preserve_topology=True)
            for path in line_path(clipped, canvas):
                if path:
                    candidates.append((float(properties.get("length_m") or 0), path))
    candidates.sort(reverse=True)
    return [path for _, path in candidates[:95]], inspected


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
        focus_class = " territory--focus" if item["tag"] in SCENARIO_FOCUS_TAGS else ""
        scenario_class = " territory--scenario" if item["scenario_only"] else ""
        for path in item["paths"]:
            nodes.append(
                f'      <path class="territory territory--{item["tag"].lower()}{focus_class}{scenario_class}" '
                f'data-tag="{item["tag"]}" fill="{item["color"]}" d="{path}" />'
            )
    return "\n".join(nodes)


def rail_nodes(paths: list[str]) -> str:
    return "\n".join(f'      <path class="rail-line" d="{path}" />' for path in paths)


def capital_nodes(capitals: list[dict]) -> str:
    nodes: list[str] = []
    for item in capitals:
        focus_class = " capital--focus" if item["focus"] else ""
        nodes.append(
            f'      <g class="capital{focus_class}" data-tag="{item["tag"]}">'
            f'<circle cx="{fmt(item["x"])}" cy="{fmt(item["y"])}" r="5.8" />'
            f'<text x="{fmt(item["x"] + 9)}" y="{fmt(item["y"] - 7)}">{item["tag"]}</text>'
            "</g>"
        )
    return "\n".join(nodes)


def scenario_nodes(capitals: list[dict]) -> str:
    focus = [item for item in capitals if item["focus"]]
    nodes: list[str] = []
    for item in focus:
        nodes.append(
            f'      <g class="scenario-marker" data-tag="{item["tag"]}">'
            f'<circle cx="{fmt(item["x"])}" cy="{fmt(item["y"])}" r="16" />'
            f'<text x="{fmt(item["x"])}" y="{fmt(item["y"] + 4)}">{item["tag"]}</text>'
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
</svg>
"""


def build_metadata(political_counts: dict[str, int], capitals: list[dict], rail_paths: list[str], rail_inspected: int) -> dict:
    paths = scenario_paths()
    rail_paths_source = rail_preview_paths()
    return {
        "schema_version": 1,
        "scenario_id": "hoi4_1936",
        "title": "Europe 1936 homepage showcase",
        "bbox": list(EUROPE_BBOX),
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
            "rail_lines_selected": len(rail_paths),
            "rail_features_inspected": rail_inspected,
        },
        "layers": [
            {"id": "political", "label": "1936 political ownership"},
            {"id": "rail", "label": "Europe rail preview"},
            {"id": "cities", "label": "capital anchors"},
            {"id": "scenario", "label": "scenario focus countries"},
        ],
    }


def build_showcase() -> None:
    canvas = Canvas(980, 620, EUROPE_BBOX)
    territories, political_counts = load_political_layers(canvas)
    capitals = load_capitals(canvas)
    rails, rail_inspected = load_rail_paths(canvas)
    write_text_lf(SHOWCASE_SVG, build_svg(canvas, territories, capitals, rails))
    metadata = build_metadata(political_counts, capitals, rails, rail_inspected)
    write_text_lf(SHOWCASE_METADATA, json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    build_showcase()
