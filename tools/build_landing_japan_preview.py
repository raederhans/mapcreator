from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from xml.sax.saxutils import escape as xml_escape

from shapely.geometry import box, shape
from shapely.geometry.base import BaseGeometry
from shapely.validation import make_valid
from topojson.utils import serialize_as_geojson


REPO_ROOT = Path(__file__).resolve().parents[1]
LANDING_ASSETS = REPO_ROOT / "landing" / "assets"
JAPAN_PREVIEW_METADATA = LANDING_ASSETS / "japan-preview.json"
JAPAN_PREVIEW_SVGS = {
    "transport": LANDING_ASSETS / "japan-preview-transport.svg",
    "cities": LANDING_ASSETS / "japan-preview-cities.svg",
    "terrain": LANDING_ASSETS / "japan-preview-terrain.svg",
    "night": LANDING_ASSETS / "japan-preview-night.svg",
}

JAPAN_CARRIER = REPO_ROOT / "data" / "transport_layers" / "japan_corridor" / "carrier.json"
JAPAN_ROADS = REPO_ROOT / "data" / "transport_layers" / "japan_road" / "roads.preview.topo.json"
JAPAN_RAIL = REPO_ROOT / "data" / "transport_layers" / "japan_rail" / "railways.preview.topo.json"
JAPAN_STATIONS = REPO_ROOT / "data" / "transport_layers" / "japan_rail" / "rail_stations_major.preview.geojson"
WORLD_CITIES = REPO_ROOT / "data" / "world_cities.geojson"
CONTOURS_MAJOR = REPO_ROOT / "data" / "global_contours.major.topo.json"
CONTOURS_MINOR = REPO_ROOT / "data" / "global_contours.minor.topo.json"
GLOBAL_RIVERS = REPO_ROOT / "data" / "global_rivers.geojson"
GLOBAL_BATHYMETRY = REPO_ROOT / "data" / "global_bathymetry.topo.json"
MODERN_CITY_LIGHTS_ASSET = REPO_ROOT / "js" / "core" / "city_lights_modern_asset.js"
HISTORICAL_CITY_LIGHTS_ENTRIES = REPO_ROOT / "data" / "city_lights" / "historical_1930_entries.json"

CANVAS_WIDTH = 680
CANVAS_HEIGHT = 440
CANVAS_PADDING = 24
ROAD_LIMIT = 260
RAIL_LIMIT = 160
CITY_LIMIT = 32
FOCUS_CITY_LIMIT = 3
MAIN_CORRIDOR_LIMIT = 1
MAJOR_CONTOUR_LIMIT = 80
MINOR_CONTOUR_LIMIT = 120
RIVER_LIMIT = 42
BATHYMETRY_LIMIT = 12
NIGHT_GRID_LIMIT = 78
NIGHT_ANCHOR_LIMIT = 10

FOCUS_CITY_NAMES = {
    "Tokyo",
    "Osaka",
    "Nagoya",
    "Sapporo",
    "Fukuoka",
    "Sendai",
    "Hiroshima",
    "Kyoto",
    "Kobe",
}
LANDING_FOCUS_CITY_NAMES = ("Tokyo", "Osaka", "Nagoya")


@dataclass(frozen=True)
class Canvas:
    width: int
    height: int
    bbox: tuple[float, float, float, float]
    center: tuple[float, float]
    parallels: tuple[float, float]
    projected_bounds: tuple[float, float, float, float]
    scale: float
    offset_x: float
    offset_y: float

    @classmethod
    def from_carrier(cls, carrier: dict) -> "Canvas":
        projection = carrier["projection"]
        center = tuple(float(value) for value in projection["center"])
        parallels = tuple(float(value) for value in projection["parallels"])
        geometry = make_valid(shape(carrier["frames"]["main"]["fitGeometry"]))
        bbox = tuple(float(value) for value in geometry.bounds)
        projected_bounds = projection_bounds_for_geometry(geometry, center, parallels)
        min_x, min_y, max_x, max_y = projected_bounds
        projected_width = max_x - min_x
        projected_height = max_y - min_y
        usable_width = CANVAS_WIDTH - CANVAS_PADDING * 2
        usable_height = CANVAS_HEIGHT - CANVAS_PADDING * 2
        scale = min(usable_width / projected_width, usable_height / projected_height)
        fitted_width = projected_width * scale
        fitted_height = projected_height * scale
        return cls(
            width=CANVAS_WIDTH,
            height=CANVAS_HEIGHT,
            bbox=bbox,
            center=(center[0], center[1]),
            parallels=(parallels[0], parallels[1]),
            projected_bounds=projected_bounds,
            scale=scale,
            offset_x=(CANVAS_WIDTH - fitted_width) / 2.0,
            offset_y=(CANVAS_HEIGHT - fitted_height) / 2.0,
        )

    def project(self, lon: float, lat: float) -> tuple[float, float]:
        min_x, _min_y, _max_x, max_y = self.projected_bounds
        raw_x, raw_y = project_conic_conformal(lon, lat, self.center, self.parallels)
        x = self.offset_x + (raw_x - min_x) * self.scale
        y = self.offset_y + (max_y - raw_y) * self.scale
        return x, y


@dataclass(frozen=True)
class PathEntry:
    d: str
    rank: float
    source: str
    label: str = ""


@dataclass(frozen=True)
class PointEntry:
    x: float
    y: float
    rank: float
    source: str
    name: str
    radius: float


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


def fmt(value: float) -> str:
    return f"{value:.1f}".rstrip("0").rstrip(".")


def project_conic_conformal(
    lon: float,
    lat: float,
    center: tuple[float, float],
    parallels: tuple[float, float],
) -> tuple[float, float]:
    lon0 = math.radians(center[0])
    lat0 = math.radians(center[1])
    phi1 = math.radians(parallels[0])
    phi2 = math.radians(parallels[1])
    phi = math.radians(lat)
    lam = math.radians(lon)
    if abs(phi1 - phi2) < 1e-9:
        n = math.sin(phi1)
    else:
        n = math.log(math.cos(phi1) / math.cos(phi2)) / math.log(
            math.tan(math.pi / 4 + phi2 / 2) / math.tan(math.pi / 4 + phi1 / 2)
        )
    f = math.cos(phi1) * math.tan(math.pi / 4 + phi1 / 2) ** n / n
    rho = f / max(math.tan(math.pi / 4 + phi / 2) ** n, 1e-12)
    rho0 = f / max(math.tan(math.pi / 4 + lat0 / 2) ** n, 1e-12)
    theta = n * (lam - lon0)
    return rho * math.sin(theta), rho0 - rho * math.cos(theta)


def projection_bounds_for_geometry(
    geometry: BaseGeometry,
    center: tuple[float, float],
    parallels: tuple[float, float],
) -> tuple[float, float, float, float]:
    points: list[tuple[float, float]] = []
    for lon, lat in iter_geometry_coords(geometry):
        points.append(project_conic_conformal(float(lon), float(lat), center, parallels))
    if not points:
        raise ValueError("Japan carrier fitGeometry has no coordinates")
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return (min(xs), min(ys), max(xs), max(ys))


def iter_geometry_coords(geometry: BaseGeometry) -> Iterable[tuple[float, float]]:
    if geometry.geom_type == "Point":
        yield geometry.x, geometry.y
    elif geometry.geom_type in {"LineString", "LinearRing"}:
        yield from geometry.coords
    elif geometry.geom_type == "Polygon":
        yield from geometry.exterior.coords
        for interior in geometry.interiors:
            yield from interior.coords
    elif hasattr(geometry, "geoms"):
        for part in geometry.geoms:
            yield from iter_geometry_coords(part)


def topology_features(path: Path, object_name: str) -> list[dict]:
    payload = read_json(path)
    collection = serialize_as_geojson(payload, objectname=object_name)
    features = collection.get("features") if isinstance(collection, dict) else None
    if not isinstance(features, list):
        return []
    return [feature for feature in features if isinstance(feature, dict)]


def topology_arc_coordinates(payload: dict, arc_index: int) -> list[tuple[float, float]]:
    transform = payload.get("transform", {})
    scale = transform.get("scale", [1, 1])
    translate = transform.get("translate", [0, 0])
    actual_index = ~arc_index if arc_index < 0 else arc_index
    raw_arc = payload["arcs"][actual_index]
    x = 0
    y = 0
    coordinates: list[tuple[float, float]] = []
    for dx, dy in raw_arc:
        x += dx
        y += dy
        coordinates.append((x * scale[0] + translate[0], y * scale[1] + translate[1]))
    if arc_index < 0:
        coordinates.reverse()
    return coordinates


def topology_line_coordinates(payload: dict, arc_indexes: list[int]) -> list[tuple[float, float]]:
    coordinates: list[tuple[float, float]] = []
    for arc_index in arc_indexes:
        arc_coordinates = topology_arc_coordinates(payload, arc_index)
        if not arc_coordinates:
            continue
        if coordinates:
            coordinates.extend(arc_coordinates[1:])
        else:
            coordinates.extend(arc_coordinates)
    return coordinates


def bounds_intersect(left: tuple[float, float, float, float], right: tuple[float, float, float, float]) -> bool:
    return left[0] <= right[2] and left[2] >= right[0] and left[1] <= right[3] and left[3] >= right[1]


def coordinates_bounds(coordinates: Iterable[tuple[float, float]]) -> tuple[float, float, float, float] | None:
    iterator = iter(coordinates)
    try:
        first_x, first_y = next(iterator)
    except StopIteration:
        return None
    min_x = max_x = first_x
    min_y = max_y = first_y
    for x, y in iterator:
        min_x = min(min_x, x)
        max_x = max(max_x, x)
        min_y = min(min_y, y)
        max_y = max(max_y, y)
    return (min_x, min_y, max_x, max_y)


def topology_line_features(path: Path, object_name: str, clip_bounds: tuple[float, float, float, float]) -> tuple[list[dict], int]:
    payload = read_json(path)
    geometries = payload.get("objects", {}).get(object_name, {}).get("geometries", [])
    if not isinstance(geometries, list):
        return [], 0

    features: list[dict] = []
    for geometry in geometries:
        if not isinstance(geometry, dict):
            continue
        geometry_type = geometry.get("type")
        arcs = geometry.get("arcs")
        lines: list[list[tuple[float, float]]] = []
        if geometry_type == "LineString" and isinstance(arcs, list):
            lines = [topology_line_coordinates(payload, arcs)]
        elif geometry_type == "MultiLineString" and isinstance(arcs, list):
            lines = [topology_line_coordinates(payload, line_arcs) for line_arcs in arcs if isinstance(line_arcs, list)]
        else:
            continue

        kept_lines: list[list[tuple[float, float]]] = []
        for coordinates in lines:
            if len(coordinates) < 2:
                continue
            bounds = coordinates_bounds(coordinates)
            if bounds and bounds_intersect(bounds, clip_bounds):
                kept_lines.append(coordinates)
        if not kept_lines:
            continue
        if len(kept_lines) == 1:
            geometry_payload = {"type": "LineString", "coordinates": kept_lines[0]}
        else:
            geometry_payload = {"type": "MultiLineString", "coordinates": kept_lines}
        features.append(
            {
                "type": "Feature",
                "properties": geometry.get("properties", {}),
                "geometry": geometry_payload,
            }
        )
    return features, len(geometries)


def geojson_features(path: Path) -> list[dict]:
    payload = read_json(path)
    features = payload.get("features")
    return features if isinstance(features, list) else []


def line_to_path(coords: Iterable[tuple[float, float]], canvas: Canvas, stride: int) -> str:
    projected: list[tuple[float, float]] = []
    for index, coord in enumerate(coords):
        if index % stride != 0:
            continue
        x, y = canvas.project(float(coord[0]), float(coord[1]))
        if -canvas.width * 0.2 <= x <= canvas.width * 1.2 and -canvas.height * 0.2 <= y <= canvas.height * 1.2:
            projected.append((x, y))
    if len(projected) < 2:
        return ""
    commands = [f"M{fmt(projected[0][0])} {fmt(projected[0][1])}"]
    commands.extend(f"L{fmt(x)} {fmt(y)}" for x, y in projected[1:])
    return " ".join(commands)


def polygon_to_path(coords: Iterable[tuple[float, float]], canvas: Canvas, stride: int) -> str:
    projected: list[tuple[float, float]] = []
    for index, coord in enumerate(coords):
        if index % stride != 0:
            continue
        projected.append(canvas.project(float(coord[0]), float(coord[1])))
    if len(projected) < 3:
        return ""
    commands = [f"M{fmt(projected[0][0])} {fmt(projected[0][1])}"]
    commands.extend(f"L{fmt(x)} {fmt(y)}" for x, y in projected[1:])
    commands.append("Z")
    return " ".join(commands)


def projected_length(geometry: BaseGeometry, canvas: Canvas) -> float:
    length = 0.0
    for line in geometry_lines(geometry):
        previous: tuple[float, float] | None = None
        for lon, lat in line.coords:
            current = canvas.project(float(lon), float(lat))
            if previous is not None:
                length += math.dist(previous, current)
            previous = current
    return length


def geometry_lines(geometry: BaseGeometry) -> list[BaseGeometry]:
    if geometry.is_empty:
        return []
    if geometry.geom_type == "LineString":
        return [geometry]
    if geometry.geom_type == "MultiLineString":
        return list(geometry.geoms)
    if geometry.geom_type == "GeometryCollection":
        lines: list[BaseGeometry] = []
        for part in geometry.geoms:
            lines.extend(geometry_lines(part))
        return lines
    return []


def geometry_polygon_paths(geometry: BaseGeometry, canvas: Canvas, stride: int) -> list[str]:
    if geometry.is_empty:
        return []
    if geometry.geom_type == "Polygon":
        path = polygon_to_path(geometry.exterior.coords, canvas, stride)
        return [path] if path else []
    if geometry.geom_type == "MultiPolygon":
        paths: list[str] = []
        for polygon in geometry.geoms:
            paths.extend(geometry_polygon_paths(polygon, canvas, stride))
        return paths
    if geometry.geom_type == "GeometryCollection":
        paths: list[str] = []
        for part in geometry.geoms:
            paths.extend(geometry_polygon_paths(part, canvas, stride))
        return paths
    return []


def geometry_line_paths(geometry: BaseGeometry, canvas: Canvas, stride: int) -> list[str]:
    paths: list[str] = []
    for line in geometry_lines(geometry):
        path = line_to_path(line.coords, canvas, stride)
        if path:
            paths.append(path)
    return paths


def feature_geometry(feature: dict, clip: BaseGeometry) -> BaseGeometry | None:
    geometry_payload = feature.get("geometry")
    if not geometry_payload:
        return None
    geometry = make_valid(shape(geometry_payload))
    if not geometry.intersects(clip):
        return None
    return make_valid(geometry.intersection(clip))


def build_base_paths(carrier: dict, canvas: Canvas) -> list[str]:
    geometry = make_valid(shape(carrier["frames"]["main"]["fitGeometry"]))
    return geometry_polygon_paths(geometry, canvas, stride=2)


def road_rank(properties: dict, length_px: float) -> float:
    class_weight = {
        "motorway": 8,
        "trunk": 7,
        "primary": 6,
        "secondary": 5,
        "tertiary": 4,
    }.get(str(properties.get("road_class") or "").lower(), 2)
    dense_bonus = 0.3 if properties.get("dense_metro") else 0.0
    return class_weight * 10000 + dense_bonus * 1000 + length_px


def corridor_label(properties: dict) -> str:
    name = str(properties.get("name") or properties.get("official_name") or "").strip()
    ref = str(properties.get("ref") or properties.get("official_ref") or "").strip()
    road_class = str(properties.get("road_class") or "road").strip()
    if name and ref:
        return f"{name} / {ref}"
    return name or ref or road_class


def rail_rank(properties: dict, length_px: float) -> float:
    class_weight = {
        "high_speed": 8,
        "trunk": 7,
        "regional": 5,
        "urban": 4,
    }.get(str(properties.get("line_class") or "").lower(), 3)
    return class_weight * 10000 + length_px


def city_display_name(base_name: str, properties: dict) -> str:
    region = str(properties.get("admin1_name") or properties.get("political_feature_name") or "").strip()
    if region and region != base_name:
        return f"{base_name} · {region}"
    return base_name


def select_line_layer(
    path: Path,
    object_name: str,
    canvas: Canvas,
    clip: BaseGeometry,
    limit: int,
    source: str,
    rank_fn,
    stride: int,
) -> tuple[list[PathEntry], int, int]:
    entries: list[PathEntry] = []
    features, source_feature_count = topology_line_features(path, object_name, clip.bounds)
    for feature in features:
        geometry = feature_geometry(feature, clip)
        if geometry is None or geometry.is_empty:
            continue
        length_px = projected_length(geometry, canvas)
        if length_px < 2.0:
            continue
        rank = rank_fn(feature.get("properties", {}), length_px)
        for d in geometry_line_paths(geometry, canvas, stride):
            entries.append(PathEntry(d=d, rank=rank, source=source))
    entries.sort(key=lambda entry: entry.rank, reverse=True)
    return entries[:limit], source_feature_count, len(entries)


def select_main_corridor_path(canvas: Canvas, clip: BaseGeometry) -> list[PathEntry]:
    entries: list[PathEntry] = []
    for feature in topology_features(JAPAN_ROADS, "roads"):
        properties = feature.get("properties", {})
        road_class = str(properties.get("road_class") or "").lower()
        if road_class not in {"motorway", "trunk"}:
            continue
        geometry = feature_geometry(feature, clip)
        if geometry is None or geometry.is_empty:
            continue
        length_px = projected_length(geometry, canvas)
        if length_px < 2.0:
            continue
        rank = road_rank(properties, length_px)
        label = corridor_label(properties)
        for d in geometry_line_paths(geometry, canvas, stride=2):
            entries.append(PathEntry(d=d, rank=rank, source="japan-main-corridor", label=label))
    entries.sort(key=lambda entry: entry.rank, reverse=True)
    return entries[:MAIN_CORRIDOR_LIMIT]


def select_topology_lines(
    path: Path,
    object_name: str,
    canvas: Canvas,
    clip: BaseGeometry,
    limit: int,
    source: str,
    stride: int,
) -> tuple[list[PathEntry], int, int]:
    entries: list[PathEntry] = []
    features, source_feature_count = topology_line_features(path, object_name, clip.bounds)
    for feature in features:
        geometry = feature_geometry(feature, clip)
        if geometry is None or geometry.is_empty:
            continue
        length_px = projected_length(geometry, canvas)
        if length_px < 1.5:
            continue
        for d in geometry_line_paths(geometry, canvas, stride):
            entries.append(PathEntry(d=d, rank=length_px, source=source))
    entries.sort(key=lambda entry: entry.rank, reverse=True)
    return entries[:limit], source_feature_count, len(entries)


def select_geojson_lines(
    path: Path,
    canvas: Canvas,
    clip: BaseGeometry,
    limit: int,
    source: str,
    stride: int,
) -> tuple[list[PathEntry], int, int]:
    entries: list[PathEntry] = []
    features = geojson_features(path)
    for feature in features:
        geometry = feature_geometry(feature, clip)
        if geometry is None or geometry.is_empty:
            continue
        length_px = projected_length(geometry, canvas)
        if length_px < 1.5:
            continue
        rank = (10 - float(feature.get("properties", {}).get("scalerank") or 10)) * 1000 + length_px
        for d in geometry_line_paths(geometry, canvas, stride):
            entries.append(PathEntry(d=d, rank=rank, source=source))
    entries.sort(key=lambda entry: entry.rank, reverse=True)
    return entries[:limit], len(features), len(entries)


def select_cities(canvas: Canvas) -> tuple[list[PointEntry], int, int]:
    points: list[PointEntry] = []
    source_features = 0
    min_lon, min_lat, max_lon, max_lat = canvas.bbox
    for feature in geojson_features(WORLD_CITIES):
        properties = feature.get("properties", {})
        if properties.get("country_code") != "JP":
            continue
        source_features += 1
        coords = feature.get("geometry", {}).get("coordinates")
        if not isinstance(coords, list) or len(coords) < 2:
            continue
        lon, lat = float(coords[0]), float(coords[1])
        if not (min_lon <= lon <= max_lon and min_lat <= lat <= max_lat):
            continue
        base_name = str(properties.get("name_ascii") or properties.get("name") or "city")
        name = city_display_name(base_name, properties)
        population = float(properties.get("population") or 0)
        focus_bonus = 2_500_000 if base_name in FOCUS_CITY_NAMES else 0
        capital_bonus = 1_500_000 if properties.get("capital_kind") else 0
        x, y = canvas.project(lon, lat)
        radius = 5.8 if base_name in FOCUS_CITY_NAMES else 4.4
        points.append(PointEntry(x=x, y=y, rank=population + focus_bonus + capital_bonus, source="world-cities-japan", name=name, radius=radius))
    points.sort(key=lambda point: point.rank, reverse=True)
    selected = dedupe_points(points, grid_px=18.0, limit=CITY_LIMIT)
    return selected, source_features, len(points)


def select_focus_cities(canvas: Canvas) -> list[PointEntry]:
    points_by_name: dict[str, PointEntry] = {}
    min_lon, min_lat, max_lon, max_lat = canvas.bbox
    for feature in geojson_features(WORLD_CITIES):
        properties = feature.get("properties", {})
        if properties.get("country_code") != "JP":
            continue
        base_name = str(properties.get("name_ascii") or properties.get("name") or "")
        if base_name not in LANDING_FOCUS_CITY_NAMES:
            continue
        coords = feature.get("geometry", {}).get("coordinates")
        if not isinstance(coords, list) or len(coords) < 2:
            continue
        lon, lat = float(coords[0]), float(coords[1])
        if not (min_lon <= lon <= max_lon and min_lat <= lat <= max_lat):
            continue
        x, y = canvas.project(lon, lat)
        population = float(properties.get("population") or 0)
        points_by_name[base_name] = PointEntry(
            x=x,
            y=y,
            rank=population,
            source="world-cities-japan-focus",
            name=city_display_name(base_name, properties),
            radius=7.6,
        )
    return [points_by_name[name] for name in LANDING_FOCUS_CITY_NAMES if name in points_by_name][:FOCUS_CITY_LIMIT]


def select_station_points(canvas: Canvas, limit: int) -> list[PointEntry]:
    points: list[PointEntry] = []
    for feature in geojson_features(JAPAN_STATIONS):
        coords = feature.get("geometry", {}).get("coordinates")
        if not isinstance(coords, list) or len(coords) < 2:
            continue
        x, y = canvas.project(float(coords[0]), float(coords[1]))
        importance = str(feature.get("properties", {}).get("importance") or "")
        rank = 2.0 if importance == "capital_core" else 1.0
        points.append(PointEntry(x=x, y=y, rank=rank, source="japan-major-stations", name="station", radius=3.4))
    points.sort(key=lambda point: point.rank, reverse=True)
    return dedupe_points(points, grid_px=14.0, limit=limit)


def dedupe_points(points: list[PointEntry], grid_px: float, limit: int) -> list[PointEntry]:
    selected: list[PointEntry] = []
    used: set[tuple[int, int]] = set()
    for point in points:
        key = (round(point.x / grid_px), round(point.y / grid_px))
        if key in used:
            continue
        used.add(key)
        selected.append(point)
        if len(selected) >= limit:
            break
    return selected


def parse_modern_city_lights() -> tuple[list[int], int, int, float, float, int]:
    text = MODERN_CITY_LIGHTS_ASSET.read_text(encoding="utf-8")
    width = int(re.search(r"MODERN_CITY_LIGHTS_GRID_WIDTH\s*=\s*(\d+)", text).group(1))
    height = int(re.search(r"MODERN_CITY_LIGHTS_GRID_HEIGHT\s*=\s*(\d+)", text).group(1))
    step_lon = float(re.search(r"MODERN_CITY_LIGHTS_STEP_LON_DEG\s*=\s*([0-9.]+)", text).group(1))
    step_lat = float(re.search(r"MODERN_CITY_LIGHTS_STEP_LAT_DEG\s*=\s*([0-9.]+)", text).group(1))
    threshold = int(re.search(r"MODERN_CITY_LIGHTS_CORRIDOR_THRESHOLD\s*=\s*(\d+)", text).group(1))
    grid_match = re.search(r"MODERN_CITY_LIGHTS_GRID\s*=\s*new Uint8Array\(\[(.*?)\]\);", text, re.S)
    if not grid_match:
        raise ValueError("Unable to parse MODERN_CITY_LIGHTS_GRID")
    values = [int(value) for value in re.findall(r"\d+", grid_match.group(1))]
    if len(values) != width * height:
        raise ValueError("Modern city lights grid size does not match width and height")
    return values, width, height, step_lon, step_lat, threshold


def select_night_points(canvas: Canvas) -> tuple[list[PointEntry], int, int]:
    values, width, height, step_lon, step_lat, threshold = parse_modern_city_lights()
    min_lon, min_lat, max_lon, max_lat = canvas.bbox
    raw: list[PointEntry] = []
    for row in range(height):
        lat = 90.0 - (row + 0.5) * step_lat
        if lat < min_lat or lat > max_lat:
            continue
        for col in range(width):
            lon = -180.0 + (col + 0.5) * step_lon
            if lon < min_lon or lon > max_lon:
                continue
            value = values[row * width + col]
            if value < threshold:
                continue
            x, y = canvas.project(lon, lat)
            raw.append(PointEntry(x=x, y=y, rank=float(value), source="nasa-black-marble-2016", name="light", radius=2.8 + min(value, 220) / 75))
    raw.sort(key=lambda point: point.rank, reverse=True)
    grid_points = dedupe_points(raw, grid_px=16.0, limit=NIGHT_GRID_LIMIT)

    anchors: list[PointEntry] = []
    entries = read_json(HISTORICAL_CITY_LIGHTS_ENTRIES).get("entries", [])
    for entry in entries:
        if entry.get("countryCode") != "JP":
            continue
        lon, lat = float(entry["lon"]), float(entry["lat"])
        if min_lon <= lon <= max_lon and min_lat <= lat <= max_lat:
            x, y = canvas.project(lon, lat)
            weight = float(entry.get("weight") or 0.5)
            anchors.append(PointEntry(x=x, y=y, rank=weight, source="historical-1930-city-light-entries", name=str(entry.get("nameAscii") or "anchor"), radius=5.0 + weight * 3))
    anchors.sort(key=lambda point: point.rank, reverse=True)
    selected = grid_points + dedupe_points(anchors, grid_px=20.0, limit=NIGHT_ANCHOR_LIMIT)
    return selected, len(raw), len(anchors)


def path_nodes(entries: Iterable[PathEntry], class_name: str, layer: str) -> str:
    nodes: list[str] = []
    for entry in entries:
        title = f"<title>{xml_escape(entry.label)}</title>" if entry.label else ""
        nodes.append(
            f'    <path class="{class_name}" data-layer="{layer}" data-source="{entry.source}" d="{entry.d}">{title}</path>'
        )
    return "\n".join(nodes)


def base_nodes(paths: Iterable[str]) -> str:
    return "\n".join(
        f'    <path class="land" data-layer="base" data-source="japan-corridor-carrier" d="{path}" />'
        for path in paths
    )


def point_nodes(points: Iterable[PointEntry], class_name: str, layer: str) -> str:
    return "\n".join(
        f'    <circle class="{class_name}" data-layer="{layer}" data-source="{point.source}" cx="{fmt(point.x)}" cy="{fmt(point.y)}" r="{fmt(point.radius)}"><title>{xml_escape(point.name)}</title></circle>'
        for point in points
    )


def graticule(canvas: Canvas) -> str:
    min_lon, min_lat, max_lon, max_lat = canvas.bbox
    lines: list[str] = []
    lon = math.floor(min_lon / 5) * 5
    while lon <= max_lon:
        points = [canvas.project(lon, min_lat), canvas.project(lon, max_lat)]
        lines.append(f'<path class="graticule" d="M{fmt(points[0][0])} {fmt(points[0][1])} L{fmt(points[1][0])} {fmt(points[1][1])}" />')
        lon += 5
    lat = math.floor(min_lat / 5) * 5
    while lat <= max_lat:
        points = [canvas.project(min_lon, lat), canvas.project(max_lon, lat)]
        lines.append(f'<path class="graticule" d="M{fmt(points[0][0])} {fmt(points[0][1])} L{fmt(points[1][0])} {fmt(points[1][1])}" />')
        lat += 5
    return "\n    ".join(lines)


def build_svg(mode: str, canvas: Canvas, layers: dict, metadata: dict) -> str:
    mode_styles = {
        "transport": ".road{opacity:.62}.rail{opacity:.78}.main-corridor{opacity:1}.station{opacity:.9}.city{opacity:.58}.focus-city{opacity:1}.terrain-major,.terrain-minor,.river,.bathymetry{opacity:.15}.night-light{opacity:.16}",
        "cities": ".road,.rail{opacity:.18}.main-corridor{opacity:.72}.station{opacity:.38}.city{opacity:.82}.focus-city{opacity:1}.terrain-major,.terrain-minor,.river,.bathymetry{opacity:.16}.night-light{opacity:.12}",
        "terrain": ".road,.rail,.station,.city{opacity:.2}.main-corridor{opacity:.52}.focus-city{opacity:.72}.terrain-major{opacity:.72}.terrain-minor{opacity:.38}.river{opacity:.64}.bathymetry{opacity:.34}.night-light{opacity:.08}",
        "night": ".road,.rail,.station{opacity:.18}.main-corridor{opacity:.62}.city{opacity:.42}.focus-city{opacity:.86}.terrain-major,.terrain-minor,.river,.bathymetry{opacity:.16}.night-light{opacity:.82}.sea{fill:#081324}.land{fill:#182b34;stroke:#334654}",
    }
    embedded = xml_escape(json.dumps({"mode": mode, "counts": metadata["counts"]}, sort_keys=True, separators=(",", ":")))
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {canvas.width} {canvas.height}" role="img" aria-label="Japan {mode} preview map generated from Scenario Forge data" data-preview-map="japan" data-preview-mode="{mode}">
  <metadata>{embedded}</metadata>
  <style>
    .sea{{fill:#c6e4e3}}.graticule{{fill:none;stroke:#56706e;stroke-width:.6;opacity:.18}}.land{{fill:#f4ead5;stroke:#7c8a71;stroke-width:1.5}}.road,.rail,.main-corridor,.terrain-major,.terrain-minor,.river,.bathymetry{{fill:none;stroke-linecap:round;stroke-linejoin:round}}.road{{stroke:#e96b31;stroke-width:1.7}}.rail{{stroke:#fff7df;stroke-width:2.1;stroke-dasharray:6 6}}.main-corridor{{stroke:#ffb547;stroke-width:5;paint-order:stroke;filter:url(#corridorGlow)}}.station{{fill:#fff7df;stroke:#17324a;stroke-width:1.2}}.city{{fill:#28c7b7;stroke:#fff;stroke-width:1.6}}.focus-city{{fill:#ffd166;stroke:#073142;stroke-width:2.4;filter:url(#cityGlow)}}.terrain-major{{stroke:#6f8d4e;stroke-width:2.2}}.terrain-minor{{stroke:#8fa86b;stroke-width:1.2}}.river{{stroke:#4aa3bd;stroke-width:1.5}}.bathymetry{{stroke:#2d6f8f;stroke-width:1.2;stroke-dasharray:5 7}}.night-light{{fill:#ffd166;filter:url(#glow)}}{mode_styles[mode]}
  </style>
  <defs><filter id="glow"><feGaussianBlur stdDeviation="8"/></filter><filter id="corridorGlow"><feGaussianBlur stdDeviation="2"/></filter><filter id="cityGlow"><feGaussianBlur stdDeviation="2.4"/></filter></defs>
  <rect class="sea" width="{canvas.width}" height="{canvas.height}" rx="26" />
  <g data-layer="graticule">
    {graticule(canvas)}
  </g>
  <g data-layer="base" data-source="data/transport_layers/japan_corridor/carrier.json">
{base_nodes(layers["base"])}
  </g>
  <g data-layer="terrain" data-source="data/global_contours.major.topo.json data/global_contours.minor.topo.json data/global_rivers.geojson data/global_bathymetry.topo.json">
{path_nodes(layers["bathymetry"], "bathymetry", "terrain")}
{path_nodes(layers["terrain_minor"], "terrain-minor", "terrain")}
{path_nodes(layers["terrain_major"], "terrain-major", "terrain")}
{path_nodes(layers["rivers"], "river", "terrain")}
  </g>
  <g data-layer="transport" data-source="data/transport_layers/japan_road/roads.preview.topo.json data/transport_layers/japan_rail/railways.preview.topo.json">
{path_nodes(layers["roads"], "road", "transport")}
{path_nodes(layers["rails"], "rail", "transport")}
{path_nodes(layers["main_corridor"], "main-corridor", "transport")}
{point_nodes(layers["stations"], "station", "transport")}
  </g>
  <g data-layer="cities" data-source="data/world_cities.geojson">
{point_nodes(layers["cities"], "city", "cities")}
{point_nodes(layers["focus_cities"], "focus-city", "cities")}
  </g>
  <g data-layer="night" data-source="js/core/city_lights_modern_asset.js data/city_lights/historical_1930_entries.json">
{point_nodes(layers["night"], "night-light", "night")}
  </g>
</svg>
"""


def build_preview() -> None:
    LANDING_ASSETS.mkdir(parents=True, exist_ok=True)
    carrier = read_json(JAPAN_CARRIER)
    canvas = Canvas.from_carrier(carrier)
    clip = box(*canvas.bbox)

    base = build_base_paths(carrier, canvas)
    roads, road_source_features, road_eligible_paths = select_line_layer(JAPAN_ROADS, "roads", canvas, clip, ROAD_LIMIT, "japan-road-preview", road_rank, stride=5)
    rails, rail_source_features, rail_eligible_paths = select_line_layer(JAPAN_RAIL, "railways", canvas, clip, RAIL_LIMIT, "japan-rail-preview", rail_rank, stride=4)
    main_corridor = select_main_corridor_path(canvas, clip)
    cities, city_source_features, city_eligible_points = select_cities(canvas)
    focus_cities = select_focus_cities(canvas)
    stations = select_station_points(canvas, limit=20)
    terrain_major, major_source_features, major_eligible_paths = select_topology_lines(CONTOURS_MAJOR, "contours", canvas, clip, MAJOR_CONTOUR_LIMIT, "global-contours-major", stride=8)
    terrain_minor, minor_source_features, minor_eligible_paths = select_topology_lines(CONTOURS_MINOR, "contours", canvas, clip, MINOR_CONTOUR_LIMIT, "global-contours-minor", stride=12)
    rivers, river_source_features, river_eligible_paths = select_geojson_lines(GLOBAL_RIVERS, canvas, clip, RIVER_LIMIT, "global-rivers", stride=4)
    bathymetry_contours, bathymetry_source_features, bathymetry_eligible_paths = select_topology_lines(GLOBAL_BATHYMETRY, "bathymetry_contours", canvas, clip, BATHYMETRY_LIMIT, "global-bathymetry-contours", stride=4)
    night_points, night_grid_candidates, night_anchor_candidates = select_night_points(canvas)

    layers = {
        "base": base,
        "roads": roads,
        "rails": rails,
        "main_corridor": main_corridor,
        "cities": cities,
        "focus_cities": focus_cities,
        "stations": stations,
        "terrain_major": terrain_major,
        "terrain_minor": terrain_minor,
        "rivers": rivers,
        "bathymetry": bathymetry_contours,
        "night": night_points,
    }
    metadata = {
        "title": "Japan landing preview",
        "scope": {
            "country": "Japan",
            "profile": "japan main corridor",
            "note": "Matches the existing Japan transport workbench carrier scope.",
            "bbox": [round(value, 6) for value in canvas.bbox],
        },
        "projection": {
            "name": "geoConicConformal",
            "center": [canvas.center[0], canvas.center[1]],
            "parallels": [canvas.parallels[0], canvas.parallels[1]],
            "canvas_width": canvas.width,
            "canvas_height": canvas.height,
            "canvas_padding": CANVAS_PADDING,
        },
        "sources": [
            repo_path(JAPAN_CARRIER),
            repo_path(JAPAN_ROADS),
            repo_path(JAPAN_RAIL),
            repo_path(JAPAN_STATIONS),
            repo_path(WORLD_CITIES),
            repo_path(CONTOURS_MAJOR),
            repo_path(CONTOURS_MINOR),
            repo_path(GLOBAL_RIVERS),
            repo_path(GLOBAL_BATHYMETRY),
            repo_path(MODERN_CITY_LIGHTS_ASSET),
            repo_path(HISTORICAL_CITY_LIGHTS_ENTRIES),
        ],
        "layers": [
            {"id": "base", "label": "Japan map base"},
            {"id": "transport", "label": "Roads, railways, and major stations"},
            {"id": "cities", "label": "City anchors"},
            {"id": "terrain", "label": "Contours and rivers"},
            {"id": "night", "label": "Night-light context"},
        ],
        "selection_policy": {
            "road_source": "preview",
            "road_limit": ROAD_LIMIT,
            "road_ranking_key": "road_class_weight_plus_projected_length_px",
            "rail_source": "preview",
            "rail_limit": RAIL_LIMIT,
            "rail_ranking_key": "line_class_weight_plus_projected_length_px",
            "main_corridor_limit": MAIN_CORRIDOR_LIMIT,
            "main_corridor_ranking_key": "motorway_or_trunk_rank_plus_projected_length_px",
            "city_limit": CITY_LIMIT,
            "city_ranking_key": "population_plus_focus_city_bonus",
            "focus_city_names": list(LANDING_FOCUS_CITY_NAMES),
            "night_grid_limit": NIGHT_GRID_LIMIT,
            "night_source": "NASA Black Marble 2016 grid sampled over the Japan map bbox",
            "bathymetry_scope_note": "The checked-in global bathymetry topology has no lines intersecting the Japan main corridor bbox.",
        },
        "counts": {
            "carrier_paths": len(base),
            "road_source_features": road_source_features,
            "road_eligible_paths": road_eligible_paths,
            "road_lines_rendered": len(roads),
            "rail_source_features": rail_source_features,
            "rail_eligible_paths": rail_eligible_paths,
            "rail_lines_rendered": len(rails),
            "main_corridor_paths_rendered": len(main_corridor),
            "main_corridor_titles": [path.label for path in main_corridor],
            "major_station_points_rendered": len(stations),
            "city_source_features": city_source_features,
            "city_eligible_points": city_eligible_points,
            "selected_city_titles": [point.name for point in cities],
            "focus_city_titles": [point.name for point in focus_cities],
            "focus_city_points_rendered": len(focus_cities),
            "city_points_rendered": len(cities),
            "terrain_major_source_features": major_source_features,
            "terrain_major_eligible_paths": major_eligible_paths,
            "terrain_major_lines_rendered": len(terrain_major),
            "terrain_minor_source_features": minor_source_features,
            "terrain_minor_eligible_paths": minor_eligible_paths,
            "terrain_minor_lines_rendered": len(terrain_minor),
            "river_source_features": river_source_features,
            "river_eligible_paths": river_eligible_paths,
            "river_lines_rendered": len(rivers),
            "bathymetry_source_features": bathymetry_source_features,
            "bathymetry_eligible_paths": bathymetry_eligible_paths,
            "bathymetry_lines_rendered": len(bathymetry_contours),
            "night_grid_candidates": night_grid_candidates,
            "night_anchor_candidates": night_anchor_candidates,
            "night_points_rendered": len(night_points),
        },
    }
    write_text_lf(JAPAN_PREVIEW_METADATA, json.dumps(metadata, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
    for mode, path in JAPAN_PREVIEW_SVGS.items():
        write_text_lf(path, build_svg(mode, canvas, layers, metadata))


if __name__ == "__main__":
    build_preview()
