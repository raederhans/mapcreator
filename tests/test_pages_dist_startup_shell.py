from __future__ import annotations

import re
import subprocess
import unittest
import gzip
import hashlib
import json
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path
from unittest.mock import patch

from tools import build_pages_dist


REPO_ROOT = Path(__file__).resolve().parents[1]
LANDING_INDEX = REPO_ROOT / "landing" / "index.html"
LANDING_APP_JS = REPO_ROOT / "landing" / "app.js"
LANDING_STYLES_CSS = REPO_ROOT / "landing" / "styles.css"
LANDING_ASSETS = REPO_ROOT / "landing" / "assets"
MAP_RENDERER_JS = REPO_ROOT / "js" / "core" / "map_renderer.js"
DIST_ROOT_INDEX = REPO_ROOT / "dist" / "index.html"
DIST_APP_JS = REPO_ROOT / "dist" / "app.js"
DIST_STYLES_CSS = REPO_ROOT / "dist" / "styles.css"
DIST_APP_INDEX = REPO_ROOT / "dist" / "app" / "index.html"
DIST_APP_JS_ROOT = REPO_ROOT / "dist" / "app" / "js"
DIST_MANIFEST = REPO_ROOT / "dist" / "pages-dist-manifest.json"
VERIFY_SHARED_WORKFLOW = REPO_ROOT / ".github" / "workflows" / "verify-shared.yml"
HERO_SCENARIO_ASSETS = (
    ("blank", "blank_base", "hero-blank.svg", "hero-blank.json"),
    ("hoi4-1936", "hoi4_1936", "hero-hoi4-1936.svg", "hero-hoi4-1936.json"),
    ("hoi4-1939", "hoi4_1939", "hero-hoi4-1939.svg", "hero-hoi4-1939.json"),
    ("tno-1962", "tno_1962", "hero-tno-1962.svg", "hero-tno-1962.json"),
)


def import_landing_builder(module_name: str):
    try:
        module = __import__(f"tools.{module_name}", fromlist=[module_name])
    except ModuleNotFoundError as exc:
        missing_name = exc.name or ""
        if missing_name.split(".", 1)[0] in {"shapely", "topojson", "PIL"}:
            raise unittest.SkipTest(f"landing asset builder dependency is unavailable: {missing_name}") from exc
        raise
    return module


class PagesDistStartupShellTest(unittest.TestCase):

    def test_landing_valid_geometry_recovers_from_mixed_dimension_make_valid_error(self) -> None:
        from shapely.errors import GEOSException
        from shapely.geometry import Polygon

        build_landing_europe_1936_showcase = import_landing_builder("build_landing_europe_1936_showcase")
        bowtie = Polygon([(0, 0), (1, 1), (1, 0), (0, 1), (0, 0)])

        with patch.object(
            build_landing_europe_1936_showcase,
            "make_valid",
            side_effect=GEOSException("IllegalArgumentException: Overlay input is mixed-dimension"),
        ):
            geometry = build_landing_europe_1936_showcase.valid_geometry(bowtie)

        self.assertFalse(geometry.is_empty)
        self.assertTrue(geometry.is_valid)

    def test_landing_polygon_path_renders_geometry_collection_polygons(self) -> None:
        from shapely.geometry import GeometryCollection, LineString, Polygon

        build_landing_europe_1936_showcase = import_landing_builder("build_landing_europe_1936_showcase")
        canvas = build_landing_europe_1936_showcase.Canvas.create(100, 100, (0, 0, 2, 2))
        geometry = GeometryCollection([
            LineString([(0, 0), (1, 1)]),
            Polygon([(0, 0), (1, 0), (1, 1), (0, 0)]),
        ])

        paths = build_landing_europe_1936_showcase.polygon_path(geometry, canvas)

        self.assertEqual(len(paths), 1)
        self.assertTrue(paths[0].startswith("M"))

    def test_checked_in_pages_dist_manifest_exists(self) -> None:
        self.assertTrue(
            DIST_MANIFEST.exists(),
            "dist/pages-dist-manifest.json is a checked-in Pages dist contract",
        )

    def test_pages_dist_drift_guard_covers_tracked_dist_outputs(self) -> None:
        try:
            result = subprocess.run(
                ["git", "ls-files", "dist"],
                cwd=REPO_ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
        except (FileNotFoundError, subprocess.CalledProcessError) as exc:
            raise unittest.SkipTest(f"git tracked dist list unavailable: {exc}") from exc

        pathspecs = (
            "dist/.nojekyll",
            "dist/app.js",
            "dist/index.html",
            "dist/styles.css",
            "dist/assets",
            "dist/app/index.html",
            "dist/app/js",
            "dist/app/css",
            "dist/app/vendor",
            "dist/pages-dist-manifest.json",
        )
        tracked_paths = [line.strip() for line in result.stdout.splitlines() if line.strip()]
        uncovered = [
            path
            for path in tracked_paths
            if not any(path == spec or path.startswith(f"{spec}/") for spec in pathspecs)
        ]
        self.assertEqual([], uncovered)

        package_text = (REPO_ROOT / "package.json").read_text(encoding="utf-8")
        workflow_text = VERIFY_SHARED_WORKFLOW.read_text(encoding="utf-8")
        for spec in pathspecs:
            with self.subTest(spec=spec):
                self.assertIn(spec, package_text)
                self.assertIn(spec, workflow_text)

    def test_landing_generated_cartography_assets_exist(self) -> None:
        source_svg_assets = (
            "hero-cartography.svg",
            "hero-blank.svg",
            "hero-hoi4-1936.svg",
            "hero-hoi4-1939.svg",
            "hero-tno-1962.svg",
            "showcase-final-map.svg",
            "europe-1936-showcase.svg",
            "japan-preview-transport.svg",
            "japan-preview-cities.svg",
            "japan-preview-terrain.svg",
            "japan-preview-night.svg",
            "template-blank.svg",
            "template-modern.svg",
            "template-hoi4.svg",
            "template-tno.svg",
        )
        webp_delivery_assets = (
            "hero-blank.webp",
            "hero-hoi4-1936.webp",
            "hero-hoi4-1939.webp",
            "hero-tno-1962.webp",
            "showcase-final-map.webp",
            "japan-preview-transport.webp",
            "japan-preview-cities.webp",
            "japan-preview-terrain.webp",
            "japan-preview-night.webp",
            "template-blank.webp",
            "template-modern.webp",
            "template-hoi4.webp",
            "template-tno.webp",
        )
        for asset_name in source_svg_assets:
            with self.subTest(asset_name=asset_name):
                asset = LANDING_ASSETS / asset_name
                self.assertTrue(asset.exists(), f"{asset_name} should be checked in for Pages")
                text = asset.read_text(encoding="utf-8")
                self.assertIn("<svg", text)
                self.assertIn("viewBox", text)
                self.assertIn("<path", text)
                ET.fromstring(text)
                if asset_name == "hero-blank.svg":
                    size_limit = 1_350_000
                elif asset_name.startswith("japan-preview-"):
                    size_limit = 340_000
                elif asset_name.startswith("hero-") and asset_name != "hero-cartography.svg":
                    size_limit = 320_000
                else:
                    size_limit = 520_000 if asset_name == "europe-1936-showcase.svg" else 220_000
                self.assertLess(asset.stat().st_size, size_limit)
                if asset_name == "europe-1936-showcase.svg":
                    self.assertIn('data-showcase-viewport="true"', text)
                    self.assertIn('data-layer="context-land"', text)
                    self.assertIn('data-layer="urban"', text)
                    self.assertIn('data-layer="rivers"', text)
                    self.assertIn('data-layer="country-labels"', text)
                    self.assertIn('data-layer="day-night"', text)
                    self.assertIn('class="territory-context territory-context--egy"', text)
                    self.assertIn('class="territory-context territory-context--syr"', text)
                    self.assertIn('class="map-edge-fog"', text)
                    self.assertRegex(text, r"\.map-edge-fog (?:>|&gt;) \*")
                    self.assertIn("softEdgeBlur", text)
                    self.assertIn("railGlow", text)
                    self.assertIn('data-showcase-city-detail="base"', text)
                    self.assertIn('class="urban-area"', text)
                    self.assertIn('class="river-line"', text)
                    self.assertIn('class="country-label"', text)
                    self.assertIn('class="city-label"', text)
                    self.assertIn('class="ambient-night-light', text)
                    self.assertIn("ambientLightGlow", text)
                    self.assertIn("nightCycleGradient", text)
                    self.assertIn("nightShadowGradient", text)
                    self.assertIn("nightTexture", text)
                    self.assertIn("night-light-belt", text)
                    self.assertIn("night-light-smear", text)
                    self.assertIn("day-night-shade", text)
                    self.assertIn("nightActivityClip", text)
                    self.assertIn("nightCycleGradient", text)
                    self.assertIn("animateTransform", text)
                    self.assertNotIn("data-showcase-viewport transform=", text)
                    self.assertNotIn('data-layer="scenario"', text)
                if asset_name.startswith("hero-") and asset_name != "hero-cartography.svg":
                    expected_mode = asset_name.removeprefix("hero-").removesuffix(".svg")
                    self.assertIn(f'data-hero-scenario="{expected_mode}"', text)
                    self.assertIn('data-layer="political"', text)
                    if asset_name == "hero-blank.svg":
                        self.assertIn('class="blank-coastline"', text)
                        self.assertIn("stroke-width: .25", text)
                        self.assertIn("stroke-width: .5", text)
                if asset_name.startswith("japan-preview-"):
                    self.assertIn('data-preview-map="japan"', text)
                    self.assertIn('data-source="japan-corridor-carrier"', text)
                    self.assertIn('data-source="japan-road-preview"', text)
                    self.assertIn('data-source="japan-main-corridor"', text)
                    self.assertIn('data-source="japan-rail-preview"', text)
                    self.assertIn('data-source="world-cities-japan-focus"', text)
                    self.assertIn('data-source="global-contours-major"', text)
                    self.assertIn('data-source="nasa-black-marble-2016"', text)
                    self.assertIn('class="main-corridor"', text)
                    self.assertIn('class="focus-city"', text)
                    self.assertIn("corridorGlow", text)
                    self.assertIn("cityGlow", text)
                    self.assertIn("<title>Tokyo</title>", text)
                    self.assertIn("<title>Osaka</title>", text)
                    self.assertIn("<title>Nagoya · Aichi</title>", text)

        for asset_name in webp_delivery_assets:
            with self.subTest(asset_name=asset_name):
                asset = LANDING_ASSETS / asset_name
                self.assertTrue(asset.exists(), f"{asset_name} should be checked in for Pages delivery")
                self.assertLess(asset.stat().st_size, 120_000)

    def test_landing_japan_preview_metadata_uses_checked_in_sources(self) -> None:
        metadata_path = LANDING_ASSETS / "japan-preview.json"
        self.assertTrue(metadata_path.exists(), "Japan preview metadata should be checked in")
        payload = json.loads(metadata_path.read_text(encoding="utf-8"))
        expected_sources = {
            "data/transport_layers/japan_corridor/carrier.json",
            "data/transport_layers/japan_road/roads.preview.topo.json",
            "data/transport_layers/japan_rail/railways.preview.topo.json",
            "data/transport_layers/japan_rail/rail_stations_major.preview.geojson",
            "data/world_cities.geojson",
            "data/global_contours.major.topo.json",
            "data/global_contours.minor.topo.json",
            "data/global_rivers.geojson",
            "data/global_bathymetry.topo.json",
            "js/core/city_lights_modern_asset.js",
            "data/city_lights/historical_1930_entries.json",
        }
        self.assertEqual(set(payload["sources"]), expected_sources)
        self.assertEqual(payload["scope"]["profile"], "japan main corridor")
        self.assertEqual(payload["projection"]["name"], "geoConicConformal")
        self.assertEqual(payload["projection"]["center"], [136.5, 35.0])
        self.assertEqual(payload["projection"]["parallels"], [33.0, 37.0])
        self.assertEqual(payload["selection_policy"]["road_limit"], 260)
        self.assertEqual(payload["selection_policy"]["rail_limit"], 160)
        self.assertEqual(payload["selection_policy"]["main_corridor_limit"], 1)
        self.assertEqual(payload["selection_policy"]["city_limit"], 32)
        self.assertEqual(payload["selection_policy"]["focus_city_names"], ["Tokyo", "Osaka", "Nagoya"])
        self.assertEqual(payload["counts"]["road_source_features"], 4794)
        self.assertEqual(payload["counts"]["rail_source_features"], 1105)
        self.assertGreater(payload["counts"]["road_eligible_paths"], payload["counts"]["road_lines_rendered"])
        self.assertGreater(payload["counts"]["rail_eligible_paths"], payload["counts"]["rail_lines_rendered"])
        self.assertEqual(payload["counts"]["road_lines_rendered"], 260)
        self.assertEqual(payload["counts"]["rail_lines_rendered"], 160)
        self.assertEqual(payload["counts"]["main_corridor_paths_rendered"], 1)
        self.assertEqual(len(payload["counts"]["main_corridor_titles"]), 1)
        self.assertGreater(payload["counts"]["city_source_features"], payload["counts"]["city_points_rendered"])
        self.assertGreater(payload["counts"]["city_eligible_points"], payload["counts"]["city_points_rendered"])
        self.assertEqual(payload["counts"]["city_points_rendered"], 32)
        self.assertEqual(payload["counts"]["focus_city_points_rendered"], 3)
        self.assertEqual(payload["counts"]["focus_city_titles"], ["Tokyo", "Osaka", "Nagoya · Aichi"])
        self.assertEqual(payload["counts"]["night_points_rendered"], 88)
        self.assertEqual(payload["counts"]["bathymetry_source_features"], 6)
        self.assertEqual(payload["counts"]["bathymetry_eligible_paths"], 0)
        self.assertEqual(payload["counts"]["bathymetry_lines_rendered"], 0)
        self.assertEqual(
            len(payload["counts"]["selected_city_titles"]),
            payload["counts"]["city_points_rendered"],
        )
        self.assertEqual(
            len(set(payload["counts"]["selected_city_titles"])),
            payload["counts"]["city_points_rendered"],
        )
        self.assertNotIn("Sendai", payload["counts"]["selected_city_titles"])
        self.assertIn("Sendai · Miyagi", payload["counts"]["selected_city_titles"])
        self.assertGreater(payload["counts"]["carrier_paths"], 40)
        self.assertGreater(payload["counts"]["terrain_major_lines_rendered"], 0)
        self.assertGreater(payload["counts"]["terrain_minor_lines_rendered"], 0)
        self.assertGreater(payload["counts"]["river_lines_rendered"], 0)

    def test_landing_europe_1936_showcase_metadata_uses_checked_in_sources(self) -> None:
        metadata_path = LANDING_ASSETS / "europe-1936-showcase.json"
        self.assertTrue(metadata_path.exists(), "Europe 1936 showcase metadata should be checked in")
        payload = json.loads(metadata_path.read_text(encoding="utf-8"))
        scenario_manifest = json.loads((REPO_ROOT / "data" / "scenarios" / "hoi4_1936" / "manifest.json").read_text(encoding="utf-8"))
        rail_catalog = json.loads((REPO_ROOT / "data" / "transport_layers" / "global_rail" / "catalog.json").read_text(encoding="utf-8"))
        expected_scenario_sources = {
            "data/scenarios/hoi4_1936/manifest.json",
            scenario_manifest["runtime_topology_url"],
            scenario_manifest["countries_url"],
            scenario_manifest["owners_url"],
            scenario_manifest["capital_hints_url"],
        }
        expected_rail_sources = {"data/transport_layers/global_rail/catalog.json"}
        expected_context_sources = {
            "data/europe_urban.geojson",
            "data/europe_rivers.geojson",
            "data/world_cities.geojson",
        }
        for entry in rail_catalog["entries"]:
            if entry.get("region_id") != "europe":
                continue
            manifest_path = entry["manifest_path"]
            manifest = json.loads((REPO_ROOT / manifest_path).read_text(encoding="utf-8"))
            expected_rail_sources.add(manifest["paths"]["full"]["railways"])

        self.assertEqual(payload["scenario_id"], "hoi4_1936")
        self.assertEqual([layer["id"] for layer in payload["layers"]], ["political", "rail", "cities", "day-night"])
        self.assertEqual(payload["projection"]["name"], "lambert_azimuthal_equal_area")
        self.assertEqual(payload["projection"]["center_lon"], 10.0)
        self.assertEqual(payload["projection"]["center_lat"], 52.0)
        self.assertEqual(payload["projection"]["canvas_width"], 980)
        self.assertEqual(payload["projection"]["canvas_height"], 620)
        self.assertEqual(payload["projection"]["canvas_padding"], 36)
        self.assertEqual(payload["bbox"], [-14.0, 29.0, 44.0, 72.5])
        self.assertEqual(payload["detail_bbox"], [-12.5, 34.0, 41.5, 72.5])
        self.assertEqual(set(payload["sources"]), expected_scenario_sources | expected_rail_sources | expected_context_sources)
        self.assertEqual(payload["selection_policy"]["transregional_tags"], ["TUR"])
        self.assertEqual(
            payload["selection_policy"]["context_tags"],
            ["ALG", "EGY", "IRQ", "JOR", "LBA", "LEB", "MOR", "PAL", "SAU", "SYR", "TUN"],
        )
        self.assertIn("low-detail background color", payload["selection_policy"]["context_layer"])
        self.assertEqual(payload["selection_policy"]["capital_limit"], 22)
        self.assertEqual(payload["selection_policy"]["rail_source"], "full")
        self.assertEqual(payload["selection_policy"]["rail_limit"], 220)
        self.assertEqual(payload["selection_policy"]["rail_min_lines_per_shard"], 55)
        self.assertEqual(payload["selection_policy"]["rail_min_projected_px"], 8.0)
        self.assertEqual(payload["selection_policy"]["rail_dedupe_pixel_grid"], 2.0)
        self.assertEqual(payload["selection_policy"]["rail_ranking_key"], "clipped_projected_length_px")
        self.assertEqual(payload["selection_policy"]["rail_dedupe_key"], "projected_path_grid_or_reverse")
        self.assertEqual(payload["selection_policy"]["urban_area_limit"], 96)
        self.assertEqual(payload["selection_policy"]["river_line_limit"], 82)
        self.assertEqual(payload["selection_policy"]["night_light_limit"], 72)
        self.assertEqual(payload["selection_policy"]["night_light_belt_limit"], 54)
        self.assertIn("animated curved night mask", payload["selection_policy"]["day_night_visual_policy"])
        self.assertEqual(payload["selection_policy"]["city_label_source"], "scenario capital hints plus world_cities major populated places")
        self.assertEqual(payload["selection_policy"]["city_label_tier_limits"], [8, 16, 26, 34])
        self.assertEqual(payload["selection_policy"]["city_label_tier_min_distance_px"], [44.0, 36.0, 30.0, 24.0])
        self.assertEqual(payload["selection_policy"]["country_label_source"], "territory representative points")
        self.assertEqual(payload["selection_policy"]["country_label_limit"], 8)
        self.assertEqual(
            payload["selection_policy"]["country_label_tags"],
            ["ENG", "FRA", "GER", "ITA", "POL", "ROM", "SOV", "YUG"],
        )
        self.assertEqual(payload["counts"]["territories"], len(payload["territory_tags"]))
        self.assertEqual(payload["counts"]["context_territories"], len(payload["context_territory_tags"]))
        self.assertEqual(
            payload["context_territory_tags"],
            ["ALG", "EGY", "IRQ", "JOR", "LBA", "LEB", "MOR", "PAL", "SAU", "SYR", "TUN"],
        )
        self.assertEqual(payload["counts"]["capitals"], len(payload["capital_tags"]))
        for expected_tag in ("ALB", "EST", "IRE", "LAT", "LIT", "LUX", "SWI", "TUR"):
            with self.subTest(expected_tag=expected_tag):
                self.assertIn(expected_tag, payload["territory_tags"])
        self.assertEqual(payload["focus_tags"], ["CZE", "ENG", "FRA", "GER", "ITA", "POL", "ROM", "SOV", "YUG"])
        self.assertGreaterEqual(payload["counts"]["political_features"], 6000)
        self.assertGreaterEqual(payload["counts"]["capitals"], 12)
        self.assertEqual(payload["counts"]["rail_lines_selected"], 220)
        self.assertGreater(payload["counts"]["rail_lines_candidates"], payload["counts"]["rail_lines_selected"])
        self.assertEqual(payload["counts"]["urban_areas_rendered"], 96)
        self.assertGreater(payload["counts"]["urban_paths_candidates"], payload["counts"]["urban_areas_rendered"])
        self.assertEqual(payload["counts"]["river_lines_rendered"], 82)
        self.assertGreater(payload["counts"]["river_paths_candidates"], payload["counts"]["river_lines_rendered"])
        self.assertEqual(payload["counts"]["night_light_points_rendered"], 72)
        self.assertGreater(payload["counts"]["city_light_candidates"], payload["counts"]["night_light_points_rendered"])
        self.assertEqual(payload["counts"]["city_labels_rendered"], 34)
        self.assertEqual(payload["counts"]["city_label_tier_counts"], {"0": 8, "1": 8, "2": 10, "3": 8})
        self.assertIn("Milan", payload["city_label_names"])
        self.assertIn("Hamburg", payload["city_label_names"])
        self.assertEqual(payload["counts"]["country_labels_rendered"], 8)
        self.assertEqual(set(payload["rail_selected_by_shard"]), {"eu_e010_e025", "eu_e025_e045", "eu_w012_e010"})
        for shard_id, selected_count in payload["rail_selected_by_shard"].items():
            with self.subTest(shard_id=shard_id):
                self.assertGreaterEqual(selected_count, 55)

    def test_landing_europe_1936_showcase_assets_match_builder_output(self) -> None:
        build_landing_europe_1936_showcase = import_landing_builder("build_landing_europe_1936_showcase")
        previous_svg = build_landing_europe_1936_showcase.SHOWCASE_SVG
        previous_metadata = build_landing_europe_1936_showcase.SHOWCASE_METADATA
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_root = Path(tmpdir)
            build_landing_europe_1936_showcase.SHOWCASE_SVG = tmp_root / "europe-1936-showcase.svg"
            build_landing_europe_1936_showcase.SHOWCASE_METADATA = tmp_root / "europe-1936-showcase.json"
            try:
                build_landing_europe_1936_showcase.build_showcase()
                generated_text = build_landing_europe_1936_showcase.SHOWCASE_SVG.read_text(encoding="utf-8")
                ET.fromstring(generated_text)
                self.assertEqual(len(re.findall(r'class="country-label"', generated_text)), 8)
                self.assertIn('data-layer="context-land"', generated_text)
                self.assertIn('class="territory-context territory-context--egy"', generated_text)
                self.assertIn('class="map-edge-fog"', generated_text)
                self.assertIn(".map-edge-fog > *", generated_text)
                self.assertIn('.country-label { fill: rgba(255,255,255,.82);', generated_text)
                self.assertIn('opacity: .62;', generated_text)
                self.assertIn('svg[data-active-layer="political"] .layer-cities { opacity: 0; }', generated_text)
                self.assertIn('svg[data-active-layer="rail"] .rail-line { opacity: .96; stroke: #ffc66d; stroke-width: 1.75; }', generated_text)
                self.assertIn('svg[data-active-layer="rail"] .layer-country-labels { opacity: 0; }', generated_text)
                self.assertIn('svg[data-active-layer="rail"] .layer-cities { opacity: 0; }', generated_text)
                self.assertIn("nightShadowGradient", generated_text)
                self.assertIn("nightTexture", generated_text)
                self.assertIn("nightActivityClip", generated_text)
                self.assertIn('class="night-shadow-core"', generated_text)
                self.assertIn('class="night-light-belt night-light-belt--core"', generated_text)
                self.assertIn('class="night-light-smear', generated_text)
                self.assertIn('data-showcase-city-detail="base"', generated_text)
                self.assertIn('class="showcase-city showcase-city--tier-0 showcase-city--capital', generated_text)
                self.assertIn('class="showcase-city showcase-city--tier-3', generated_text)
                self.assertIn('svg[data-active-layer="cities"][data-showcase-city-detail="dense"] .showcase-city--tier-3 { opacity: 1; }', generated_text)
                self.assertEqual(
                    build_landing_europe_1936_showcase.SHOWCASE_METADATA.read_bytes(),
                    (LANDING_ASSETS / "europe-1936-showcase.json").read_bytes(),
                )
            finally:
                build_landing_europe_1936_showcase.SHOWCASE_SVG = previous_svg
                build_landing_europe_1936_showcase.SHOWCASE_METADATA = previous_metadata

    def test_landing_hero_scenario_metadata_uses_real_sources(self) -> None:
        for mode, scenario_id, svg_name, metadata_name in HERO_SCENARIO_ASSETS:
            with self.subTest(mode=mode):
                svg_text = (LANDING_ASSETS / svg_name).read_text(encoding="utf-8")
                ET.fromstring(svg_text)
                payload = json.loads((LANDING_ASSETS / metadata_name).read_text(encoding="utf-8"))
                self.assertEqual(payload["asset_type"], "landing_hero_scenario_map")
                self.assertEqual(payload["mode"], mode)
                self.assertEqual(payload["scenario_id"], scenario_id)
                self.assertEqual(payload["viewport"]["bbox"], [-12.5, 34.0, 41.5, 72.5])
                self.assertEqual(payload["viewport"]["canvas_width"], 980)
                self.assertEqual(payload["viewport"]["canvas_height"], 680)
                self.assertGreater(len(payload["source_files"]), 1)
                self.assertIsInstance(payload["feature_counts"], dict)
                self.assertEqual(payload["counts"], payload["feature_counts"])
                if mode == "blank":
                    self.assertIn("data/scenarios/blank_base/manifest.json", payload["source_files"])
                    self.assertIn("data/europe_topology.runtime_political_v1.json", payload["source_files"])
                    self.assertIn("data/europe_land_bg.geojson", payload["source_files"])
                    self.assertTrue(payload["selection_policy"]["blank_canvas"])
                    self.assertEqual(payload["selection_policy"]["land_simplify_tolerance"], 0.08)
                    self.assertEqual(payload["selection_policy"]["land_path_limit"], 8600)
                    self.assertEqual(payload["selection_policy"]["coastline_path_limit"], 1000)
                    self.assertEqual(payload["selection_policy"]["blank_internal_stroke_width"], 0.25)
                    self.assertEqual(payload["selection_policy"]["coastline_stroke_width"], 0.5)
                    self.assertGreater(payload["feature_counts"]["land_paths"], 0)
                    self.assertGreater(payload["feature_counts"]["coastline_paths"], 0)
                    self.assertEqual(payload["feature_counts"]["land_path_limit"], 8600)
                    self.assertEqual(payload["feature_counts"]["land_paths"], 8600)
                    self.assertEqual(payload["feature_counts"]["coastline_path_limit"], 1000)
                    self.assertEqual(payload["feature_counts"]["coastline_paths"], 1000)
                    self.assertGreater(
                        payload["feature_counts"]["coastline_paths_available"],
                        payload["feature_counts"]["coastline_paths"],
                    )
                    self.assertGreater(payload["feature_counts"]["coastline_paths_dropped"], 0)
                    self.assertGreater(
                        payload["feature_counts"]["land_paths_available"],
                        payload["feature_counts"]["land_paths"],
                    )
                    self.assertGreater(payload["feature_counts"]["land_paths_dropped"], 0)
                    self.assertEqual(payload["territory_tags"], [])
                else:
                    self.assertIn(f"data/scenarios/{scenario_id}/manifest.json", payload["source_files"])
                    self.assertIn(f"data/scenarios/{scenario_id}/runtime_topology.topo.json", payload["source_files"])
                    self.assertIn(f"data/scenarios/{scenario_id}/owners.by_feature.json", payload["source_files"])
                    self.assertIn(f"data/scenarios/{scenario_id}/countries.json", payload["source_files"])
                    self.assertFalse(payload["selection_policy"]["blank_canvas"])
                    expected_capital_limit = 9 if mode == "tno-1962" else 8
                    self.assertEqual(payload["selection_policy"]["capital_limit"], expected_capital_limit)
                    self.assertEqual(payload["selection_policy"]["territory_path_limit_per_tag"], 48)
                    self.assertGreater(payload["feature_counts"]["territories"], 20)
                    self.assertGreater(payload["feature_counts"]["political_features"], payload["feature_counts"]["territories"])
                    self.assertGreaterEqual(payload["feature_counts"]["capitals"], 6)
                    self.assertLessEqual(payload["feature_counts"]["capitals"], expected_capital_limit)
                    self.assertEqual(len(re.findall(r'class="city-label"', svg_text)), payload["feature_counts"]["capitals"])
                    self.assertNotIn("territory--scenario-only", svg_text)
                    self.assertNotIn("stroke-dasharray: 5 4", svg_text)
                    self.assertNotIn('class="capital-code"', svg_text)
                    self.assertNotIn('class="country-label"', svg_text)
                if mode == "tno-1962":
                    self.assertIn("data/scenarios/tno_1962/capital_defaults.partial.json", payload["source_files"])
                    self.assertNotIn("data/scenarios/tno_1962/scenario_atlantropa.topo.json", payload["source_files"])
                    self.assertNotIn("data/scenarios/tno_1962/scenario_atlantropa_metadata.json", payload["source_files"])
                    self.assertIn("data/europe_topology.runtime_political_v1.json", payload["source_files"])
                    self.assertIn("data/europe_land_bg.geojson", payload["source_files"])
                    self.assertEqual(
                        payload["selection_policy"]["hero_geometry_source"],
                        "runtime_topology base sea and political ownership crop",
                    )
                    self.assertEqual(payload["selection_policy"]["atlantropa_overlay"], "disabled_for_landing_hero")
                    self.assertEqual(
                        payload["selection_policy"]["base_underlay"],
                        "original Europe land and coastline for small Mediterranean islands",
                    )
                    self.assertEqual(
                        payload["selection_policy"]["hero_capital_tags"],
                        ["ENG", "FRA", "GER", "ITA", "IBR", "RKU", "SOV", "WRS", "BRG"],
                    )
                    self.assertEqual(
                        payload["selection_policy"]["hero_capital_label_overrides"],
                        {"BRG": "Nanzig", "SOV": "Moskau", "WRS": "Warshau"},
                    )
                    self.assertEqual(
                        payload["selection_policy"]["hero_capital_point_overrides"],
                        {
                            "BRG": [6.18496, 48.68439],
                            "SOV": [37.61781, 55.75204],
                            "WRS": [21.01178, 52.22977],
                        },
                    )
                    for city_name in ("Madrid", "Kyiv", "Moskau", "Warshau", "Nanzig"):
                        self.assertIn(f">{city_name}</text>", svg_text)
                    for replaced_name in ("Zagreb", "Bucharest", "Sofia", "Brussels"):
                        self.assertNotIn(f">{replaced_name}</text>", svg_text)
                    self.assertEqual(payload["selection_policy"]["base_underlay_path_limit"], 360)
                    self.assertEqual(payload["selection_policy"]["base_underlay_coastline_limit"], 360)
                    self.assertGreater(payload["feature_counts"]["base_land_paths"], 0)
                    self.assertLessEqual(payload["feature_counts"]["base_land_paths"], 420)
                    self.assertGreater(payload["feature_counts"]["base_mediterranean_island_paths"], 0)
                    self.assertGreater(payload["feature_counts"]["base_coastline_paths"], 0)
                    self.assertLessEqual(payload["feature_counts"]["base_coastline_paths"], 360)
                    self.assertIn('class="base-land"', svg_text)
                    self.assertIn('class="base-coastline"', svg_text)
                    self.assertNotIn("atlantropa_paths", payload["feature_counts"])
                    self.assertNotIn("atlantropa", svg_text)

    def test_landing_hero_scenario_assets_match_builder_output(self) -> None:
        build_landing_europe_1936_showcase = import_landing_builder("build_landing_europe_1936_showcase")
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_root = Path(tmpdir)
            build_landing_europe_1936_showcase.build_hero_scenario_maps(output_dir=tmp_root)
            for _mode, _scenario_id, svg_name, metadata_name in HERO_SCENARIO_ASSETS:
                with self.subTest(svg_name=svg_name):
                    generated_svg = tmp_root / svg_name
                    generated_metadata = tmp_root / metadata_name
                    ET.fromstring(generated_svg.read_text(encoding="utf-8"))
                    self.assertEqual(generated_svg.read_bytes(), (LANDING_ASSETS / svg_name).read_bytes())
                    self.assertEqual(generated_metadata.read_bytes(), (LANDING_ASSETS / metadata_name).read_bytes())

    def test_landing_japan_preview_assets_match_builder_output(self) -> None:
        build_landing_japan_preview = import_landing_builder("build_landing_japan_preview")
        previous_svg_paths = build_landing_japan_preview.JAPAN_PREVIEW_SVGS
        previous_metadata_path = build_landing_japan_preview.JAPAN_PREVIEW_METADATA
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_root = Path(tmpdir)
            build_landing_japan_preview.JAPAN_PREVIEW_SVGS = {
                mode: tmp_root / f"japan-preview-{mode}.svg"
                for mode in ("transport", "cities", "terrain", "night")
            }
            build_landing_japan_preview.JAPAN_PREVIEW_METADATA = tmp_root / "japan-preview.json"
            try:
                build_landing_japan_preview.build_preview()
                self.assertEqual(
                    build_landing_japan_preview.JAPAN_PREVIEW_METADATA.read_bytes(),
                    (LANDING_ASSETS / "japan-preview.json").read_bytes(),
                )
                for mode, generated_path in build_landing_japan_preview.JAPAN_PREVIEW_SVGS.items():
                    with self.subTest(mode=mode):
                        generated_text = generated_path.read_text(encoding="utf-8")
                        ET.fromstring(generated_text)
                        self.assertIn('class="main-corridor"', generated_text)
                        self.assertIn('class="focus-city"', generated_text)
                        self.assertIn('data-source="japan-main-corridor"', generated_text)
                        self.assertIn('data-source="world-cities-japan-focus"', generated_text)
                        self.assertIn("<title>Tokyo</title>", generated_text)
                        self.assertIn("<title>Osaka</title>", generated_text)
                        self.assertIn("<title>Nagoya · Aichi</title>", generated_text)
                        if mode == "cities":
                            self.assertIn("<title>Sendai · Miyagi</title>", generated_text)
                            self.assertIsNone(
                                re.search(r'<circle class="city"[^>]*><title>Sendai</title></circle>', generated_text)
                            )
                        self.assertEqual(
                            generated_path.read_bytes(),
                            (LANDING_ASSETS / f"japan-preview-{mode}.svg").read_bytes(),
                        )
            finally:
                build_landing_japan_preview.JAPAN_PREVIEW_SVGS = previous_svg_paths
                build_landing_japan_preview.JAPAN_PREVIEW_METADATA = previous_metadata_path

    def test_pages_dist_generated_text_writes_use_lf(self) -> None:
        source = (REPO_ROOT / "tools" / "build_pages_dist.py").read_text(encoding="utf-8")
        self.assertIn('def write_text_lf(path: Path, text: str) -> None:', source)
        self.assertIn('def normalize_dist_text_files_lf() -> None:', source)
        self.assertIn("LF_NORMALIZED_ROOT_DIST_PATHS", source)
        self.assertIn('".css"', source)
        self.assertIn('".svg"', source)
        self.assertIn('".md"', source)
        self.assertIn('".txt"', source)
        self.assertIn('newline="\\n"', source)
        self.assertIn("Landing assets are committed delivery inputs here.", source)
        self.assertNotIn("build_landing_hero_cartography()", source)
        self.assertNotIn("build_landing_europe_1936_showcase()", source)
        self.assertNotIn("build_landing_japan_preview()", source)
        self.assertNotIn("rasterize_landing_assets()", source)
        self.assertNotIn(".write_text(", source)
        self.assertNotIn("n" + "px", Path(__file__).read_text(encoding="utf-8"))
        self.assertLess(
            source.index("normalize_dist_text_files_lf()"),
            source.index("total_bytes = write_dist_manifest()"),
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "generated.json"
            build_pages_dist.write_text_lf(path, "{\n  \"ok\": true\n}\n")
            self.assertEqual(path.read_bytes(), b'{\n  "ok": true\n}\n')
            crlf_path = Path(tmpdir) / "copied.js"
            crlf_path.write_bytes(b"const ok = true;\r\n")
            build_pages_dist.normalize_dist_text_file_lf(crlf_path)
            self.assertEqual(crlf_path.read_bytes(), b"const ok = true;\n")

        original_dist_root = build_pages_dist.DIST_ROOT
        with tempfile.TemporaryDirectory() as tmpdir:
            build_pages_dist.DIST_ROOT = Path(tmpdir)
            try:
                for relative_path in (Path("index.html"), Path("app.js"), Path("styles.css")):
                    root_dist_path = Path(tmpdir) / relative_path
                    root_dist_path.write_bytes(b"line 1\r\nline 2\r\n")
                    build_pages_dist.normalize_dist_text_file_lf(root_dist_path)
                    self.assertEqual(root_dist_path.read_bytes(), b"line 1\nline 2\n")
                for relative_path in (
                    Path("app") / "css" / "style.css",
                    Path("app") / "index.html",
                    Path("app") / "vendor" / "textures" / "README.md",
                    Path("app") / "vendor" / "textures" / "paper_vintage_01.svg",
                    Path("app") / "vendor" / "fflate.LICENSE.txt",
                ):
                    app_dist_path = Path(tmpdir) / relative_path
                    app_dist_path.parent.mkdir(parents=True, exist_ok=True)
                    app_dist_path.write_bytes(b"line 1\r\nline 2\r\n")
                    build_pages_dist.normalize_dist_text_file_lf(app_dist_path)
                    self.assertEqual(app_dist_path.read_bytes(), b"line 1\nline 2\n")
                exact_json_path = Path(tmpdir) / "app" / "data" / "hgo_runtime" / "manifest.json"
                exact_json_path.parent.mkdir(parents=True, exist_ok=True)
                exact_json_path.write_bytes(b"{\r\n}\r\n")
                build_pages_dist.normalize_dist_text_file_lf(exact_json_path)
                self.assertEqual(exact_json_path.read_bytes(), b"{\r\n}\r\n")
            finally:
                build_pages_dist.DIST_ROOT = original_dist_root

    def test_landing_hero_cartography_builder_keeps_checked_in_assets_current(self) -> None:
        build_landing_hero_cartography = import_landing_builder("build_landing_hero_cartography")
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_root = Path(tmpdir)
            previous_assets_dir = build_landing_hero_cartography.LANDING_ASSETS
            try:
                build_landing_hero_cartography.LANDING_ASSETS = tmp_root
                build_landing_hero_cartography.main()
                for asset_name in (
                    "hero-cartography.svg",
                    "showcase-final-map.svg",
                    "template-blank.svg",
                    "template-modern.svg",
                    "template-hoi4.svg",
                    "template-tno.svg",
                ):
                    with self.subTest(asset_name=asset_name):
                        generated_path = tmp_root / asset_name
                        self.assertEqual(generated_path.read_bytes(), (LANDING_ASSETS / asset_name).read_bytes())
            finally:
                build_landing_hero_cartography.LANDING_ASSETS = previous_assets_dir

    def test_pages_dist_reset_clears_previous_output_tree(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_root = Path(tmpdir) / "dist"
            old_file = tmp_root / "app" / "data" / "hgo_catalogs" / "flags_png" / "medium" / "AA" / "AAA.png"
            old_file.parent.mkdir(parents=True)
            old_file.write_bytes(b"old")
            previous_dist_root = build_pages_dist.DIST_ROOT
            previous_app_dist_root = build_pages_dist.APP_DIST_ROOT
            build_pages_dist.DIST_ROOT = tmp_root
            build_pages_dist.APP_DIST_ROOT = tmp_root / "app"
            try:
                build_pages_dist.reset_dist()
                self.assertTrue(build_pages_dist.APP_DIST_ROOT.is_dir())
                self.assertFalse(old_file.exists())
            finally:
                build_pages_dist.DIST_ROOT = previous_dist_root
                build_pages_dist.APP_DIST_ROOT = previous_app_dist_root

    def test_pages_dist_manifest_scan_retries_after_vanishing_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_root = Path(tmpdir)
            stable_path = tmp_root / "app" / "stable.json"
            stable_path.parent.mkdir(parents=True)
            stable_path.write_text("{}", encoding="utf-8")
            vanished_path = tmp_root / "app" / "vanished.json"
            previous_dist_root = build_pages_dist.DIST_ROOT
            previous_iter_dist_files = build_pages_dist.iter_dist_files
            previous_sleep = build_pages_dist.time.sleep
            calls = {"count": 0}

            def fake_iter_dist_files():
                calls["count"] += 1
                return [vanished_path, stable_path] if calls["count"] == 1 else [stable_path]

            build_pages_dist.DIST_ROOT = tmp_root
            build_pages_dist.iter_dist_files = fake_iter_dist_files
            build_pages_dist.time.sleep = lambda _seconds: None
            try:
                records, total_bytes = build_pages_dist.get_dist_file_records()
                self.assertEqual(records, [{"path": "app/stable.json", "size_bytes": 2, "source_kind": "dist"}])
                self.assertEqual(total_bytes, 2)
            finally:
                build_pages_dist.DIST_ROOT = previous_dist_root
                build_pages_dist.iter_dist_files = previous_iter_dist_files
                build_pages_dist.time.sleep = previous_sleep

    def test_landing_source_keeps_landing_contract(self) -> None:
        html = LANDING_INDEX.read_text(encoding="utf-8")
        app_js = LANDING_APP_JS.read_text(encoding="utf-8")
        styles_css = LANDING_STYLES_CSS.read_text(encoding="utf-8")

        for expected_fragment in (
            './styles.css',
            './app.js',
            './app/?view=guide',
            'data-i18n="heroTitle"',
            'data-i18n="heroTitleAccent"',
            'data-i18n="productStageLabel"',
            'class="brandmark__logo"',
            './assets/favicon.svg',
            './assets/hero-hoi4-1936.webp',
            'data-hero-map',
            'data-hero-chip="blank"',
            'data-hero-chip="hoi4-1936"',
            'data-hero-chip="hoi4-1939"',
            'data-hero-chip="tno-1962"',
            'data-stat-value="21338"',
            'data-i18n="sourcesEyebrow"',
            'class="source-marquee"',
            'class="source-marquee__track"',
            'aria-hidden="true"',
            'href="https://github.com/nvkelso/natural-earth-vector"',
            'href="https://github.com/wmgeolab/geoBoundaries"',
            'href="https://download.geonames.org/export/dump/"',
            'href="https://www.ncei.noaa.gov/products/etopo-global-relief-model"',
            'href="https://blackmarble.gsfc.nasa.gov/"',
            'href="https://planet.openstreetmap.org/"',
            'href="https://download.geofabrik.de/"',
            'href="https://nlftp.mlit.go.jp/ksj/index.html"',
            'href="https://www.usgs.gov/programs/mineral-resources-program/mineral-resources-data"',
            'href="https://www.data.gouv.fr/"',
            'href="https://docs.camino.beta.gouv.fr/qgis/"',
            'href="https://www.data.gouv.fr/datasets/base-de-donnees-des-installations-terminales-embranchees-fret-en-france-ite-3000"',
            'href="https://railroads.dot.gov/maps-and-data/maps-geographic-information-system/maps-geographic-information-system"',
            'href="https://www.opendatani.gov.uk/"',
            'href="https://data-portal.networkrail.co.uk/"',
            'href="https://www.data.gov.uk/dataset/naptan"',
            'data-i18n="showcaseEyebrow"',
            './assets/europe-1936-showcase.svg',
            'data-showcase-root',
            'data-showcase-object',
            'data-showcase-object tabindex="0"',
            'id="showcase-map-object"',
            'role="tabpanel"',
            'id="showcase-layer-panel"',
            'aria-controls="showcase-layer-panel"',
            'data-showcase-layer-tab="political"',
            'data-showcase-layer-tab="rail"',
            'data-showcase-layer-tab="cities"',
            'data-showcase-layer-tab="day-night"',
            'data-i18n="showcaseLayerPoliticalTitle"',
            'data-i18n="previewEyebrow"',
            'data-preview-root',
            'data-preview-surface',
            'data-preview-viewport',
            'data-preview-image="transport"',
            'class="mini-map__controls"',
            'data-preview-zoom="1"',
            'data-preview-zoom="-1"',
            'data-preview-zoom="reset"',
            'data-i18n-aria-label="previewZoomIn"',
            'data-i18n-aria-label="previewZoomOut"',
            'data-i18n-aria-label="previewZoomReset"',
            'role="tablist"',
            'data-i18n="templatesEyebrow"',
            './assets/template-modern.webp',
            'data-i18n="dataEyebrow"',
            'data-i18n="editionsEyebrow"',
            'data-i18n="casesEyebrow"',
            'data-i18n="faqEyebrow"',
            'data-i18n="updatesEyebrow"',
            'class="footer__brand"',
            'class="footer__sources"',
            'class="footer__actions"',
            'data-i18n-aria-label="productPreviewLabel"',
            'data-i18n-aria-label="brandHomeLabel"',
            'data-i18n-aria-label="primaryNavLabel"',
            'data-i18n-aria-label="languageSwitcherLabel"',
            'data-i18n-alt="productPreviewAlt"',
            'data-i18n-alt="workOneAlt"',
            'data-i18n-alt="workTwoAlt"',
            'data-i18n-alt="workThreeAlt"',
            'data-i18n="chipBlank"',
            'data-i18n="chipHoi41936"',
            'data-i18n="chipHoi41939"',
            'data-i18n="chipTno1962"',
            'data-reveal',
            'footer',
            'data-lang="zh"',
        ):
            with self.subTest(expected_fragment=expected_fragment):
                self.assertIn(expected_fragment, html)

        self.assertNotIn('class="hero__metrics"', html)
        self.assertNotIn('data-i18n-aria-label="heroMetricsLabel"', html)

        for expected_fragment in (
            "scenario_forge_landing_lang",
            "heroTitleAccent",
            "formatMetricNumbers",
            "statsLabel",
            "sourcesEyebrow",
            "showcaseEyebrow",
            "showcaseLayerPoliticalTitle",
            "showcaseLayerRailTitle",
            "showcaseLayerCitiesTitle",
            "showcaseLayerDayNightTitle",
            "initShowcaseLayers",
            "SHOWCASE_METADATA_URL",
            "getShowcaseLayerIds",
            "resolveShowcaseLayer",
            "loadShowcaseMetadata",
            "showcaseLayerError",
            "setShowcaseSvgLayer",
            "SHOWCASE_VIEW_SCALES",
            "data-showcase-viewport",
            "showcaseViewZoomed",
            "clampShowcaseViewPosition",
            "applyShowcaseViewState",
            "isModifiedZoomWheelEvent",
            "onKeyDown",
            "initShowcaseView",
            "PREVIEW_VIEW_SCALES",
            "clampPreviewViewPosition",
            "applyPreviewViewState",
            "initPreviewView",
            "previewZoomed",
            "previewDragging",
            "pointerdown",
            "wheel",
            "dblclick",
            "initPreviewTabs",
            "initHeroMap",
            "DEFAULT_HERO_MODE",
            "HERO_SCENARIO_ASSETS",
            "hero-hoi4-1936.json",
            "hero-hoi4-1939.webp",
            "hero-tno-1962.webp",
            "syncHeroMap",
            "initMetricCountUp",
            "previewPanelTransportTitle",
            "dataCardOneTitle",
            "editionOneTitle",
            "faqOneQuestion",
            "templatesEyebrow",
            "updatesEyebrow",
            "productPreviewLabel",
            "productStageLabel",
            "heroChipsLabel",
            "brandHomeLabel",
            "languageSwitcherLabel",
            "productPreviewAlt",
            "heroAltHoi41936",
            "heroAltHoi41939",
            "heroAltTno1962",
            "data-i18n-alt",
            "data-i18n-aria-label",
            "zh:",
        ):
            with self.subTest(expected_fragment=expected_fragment):
                self.assertIn(expected_fragment, app_js)

        self.assertIn("prefers-reduced-motion", styles_css)
        self.assertIn('html[data-reveal="enabled"]', styles_css)
        self.assertIn(".is-revealed", styles_css)
        self.assertIn(".source-marquee__track", styles_css)
        self.assertIn("@keyframes sourceMarquee", styles_css)
        self.assertIn("min-height: 126px", styles_css)
        self.assertIn("height: 48px", styles_css)
        self.assertIn("height: 46px", styles_css)
        self.assertIn("height: 44px", styles_css)
        self.assertIn("min-height: 44px", styles_css)
        self.assertIn("line-height: 1.1", styles_css)
        self.assertIn("overflow-wrap: anywhere", styles_css)
        self.assertIn(".hero-cartography", styles_css)
        self.assertIn("translateY(-18px) perspective(1200px)", styles_css)
        hero_chips_style = re.search(r"\.hero__chips\s*\{(?P<body>[^}]*)\}", styles_css, re.S)
        self.assertIsNotNone(hero_chips_style)
        self.assertNotIn("position: absolute", hero_chips_style.group("body"))
        self.assertIn(".brandmark__logo", styles_css)
        self.assertNotIn(".brandmark__dot", styles_css)
        self.assertIn('[data-hero-transition="loading"]', styles_css)
        self.assertIn('[data-hero-mode="blank"]', styles_css)
        self.assertIn('[data-hero-mode="hoi4-1936"]', styles_css)
        self.assertIn('[data-hero-mode="hoi4-1939"]', styles_css)
        self.assertIn('[data-hero-mode="tno-1962"]', styles_css)
        self.assertIn(".showcase-layer-tabs", styles_css)
        self.assertIn('[data-showcase-view-zoomed="true"]', styles_css)
        self.assertIn("[data-showcase-object]", app_js)
        self.assertNotIn("SHOWCASE_LAYER_COPY_KEYS[layer] || SHOWCASE_LAYER_COPY_KEYS.political", app_js)
        self.assertIn("height: 44px", styles_css)
        self.assertIn(".showcase-map__viewport", styles_css)
        self.assertIn(".showcase-map__viewport::after", styles_css)
        self.assertIn("radial-gradient(ellipse at center", styles_css)
        self.assertIn("inset 0 0 112px", styles_css)
        self.assertIn(".showcase-map__object", styles_css)
        self.assertIn(".showcase-map__object:focus-visible", styles_css)
        self.assertIn("[data-preview-image=\"transport\"]", styles_css)
        self.assertIn("--preview-scale", styles_css)
        self.assertIn(".mini-map__viewport", styles_css)
        self.assertIn(".mini-map__controls", styles_css)
        self.assertIn('[data-preview-zoomed="true"]', styles_css)
        self.assertIn('[data-preview-dragging="true"]', styles_css)
        self.assertIn(".showcase-section", styles_css)
        self.assertNotIn("data-showcase-view-controls", html)
        self.assertNotIn("data-showcase-view-action", html)
        self.assertNotIn("SHOWCASE_VIEW_PAN_STEP", app_js)
        self.assertNotIn(".showcase-map__controls", styles_css)
        self.assertNotIn('data-showcase-layer-tab="scenario"', html)
        self.assertRegex(
            styles_css,
            re.compile(r"\.work-card__media img\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;", re.S),
        )
        self.assertRegex(
            styles_css,
            re.compile(r"\.work-card__media\s*\{[^}]*aspect-ratio:\s*16\s*/\s*9;", re.S),
        )

    def test_hgo_runtime_preview_renders_through_dedicated_pass(self) -> None:
        source = MAP_RENDERER_JS.read_text(encoding="utf-8")
        start = source.index("function drawCanvas(")
        end = source.index("function buildExactAfterSettleRefreshPlan", start)
        body = source[start:end]
        pass_start = source.index("function drawHgoPreviewPass(")
        pass_end = source.index("function drawEffectsPass(", pass_start)
        pass_body = source[pass_start:pass_end]

        # Pages 构建会复制源码 drawCanvas；这里把 HGO preview pass 合同纳入 Pages shell 验证。
        self.assertNotIn("preferLastGoodFrameForHgoPreview", body)
        self.assertNotIn('renderHgoRuntimePreviewIfReady("draw-canvas")', body)
        self.assertIn('renderHgoRuntimePreviewIfReady("hgo-preview-pass", {', pass_body)
        self.assertIn("targetCanvas,", pass_body)
        self.assertIn("projectionTransform: null,", pass_body)

    def test_landing_i18n_table_keeps_english_and_chinese_values_separate(self) -> None:
        app_js = LANDING_APP_JS.read_text(encoding="utf-8")
        en_start = app_js.index("  en: {")
        zh_start = app_js.index("  zh: {")
        en_table = app_js[en_start:zh_start]
        zh_table = app_js[zh_start:]

        for expected_fragment in (
            "featureGroupOneTitle:",
            "featureGroupTwoTitle:",
            "featureGroupThreeTitle:",
            "featureGroupFourTitle:",
            "featurePointPalettes:",
            'previewPanelTransportTitle:',
            "dataTitle:",
            "faqOneQuestion:",
            "roadmapOneTitle:",
            "roadmapTwoTitle:",
            "templatesTitle:",
            "showcaseTitle:",
            "showcaseLayerPoliticalTitle:",
            "showcaseLayerRailTitle:",
            "showcaseLayerCitiesTitle:",
            "showcaseLayerDayNightTitle:",
            "previewSurfaceLabel:",
            "previewZoomControlsLabel:",
            "previewZoomIn:",
            "previewZoomOut:",
            "previewZoomReset:",
            "chipHoi41936:",
            "chipHoi41939:",
            "chipTno1962:",
            "heroAltBlank:",
            "heroAltHoi41936:",
            "heroAltHoi41939:",
            "heroAltTno1962:",
            "templateModernAlt:",
            "updatesTitle:",
        ):
            with self.subTest(expected_fragment=expected_fragment):
                self.assertIn(expected_fragment, en_table)

        for expected_fragment in (
            "featureGroupOneTitle:",
            "featureGroupTwoTitle:",
            "featureGroupThreeTitle:",
            "featureGroupFourTitle:",
            "featurePointPalettes:",
            "previewPanelTransportTitle:",
            "dataTitle:",
            "faqOneQuestion:",
            "workflowTitle:",
            "audienceTitle:",
            "roadmapOneTitle:",
            "roadmapTwoTitle:",
            "ctaBody:",
            "templatesTitle:",
            "showcaseTitle:",
            "showcaseLayerPoliticalTitle:",
            "showcaseLayerRailTitle:",
            "showcaseLayerCitiesTitle:",
            "showcaseLayerDayNightTitle:",
            "chipHoi41936:",
            "chipHoi41939:",
            "chipTno1962:",
            "heroAltBlank:",
            "heroAltHoi41936:",
            "heroAltHoi41939:",
            "heroAltTno1962:",
            "templateModernAlt:",
            "updatesTitle:",
            'metaTitle: "Scenario Forge — 场景优先政治地图工作台"',
        ):
            with self.subTest(expected_fragment=expected_fragment):
                self.assertIn(expected_fragment, zh_table)

        for stale_fragment in (
            'featureGroupOneTitle: "Scenario baselines"',
            'featureGroupTwoTitle: "Political editing"',
            'featureGroupThreeTitle: "Presentation layers"',
            'featureGroupFourTitle: "Project and export"',
            'featuresTitle: "Organized around tasks, not just panels."',
        ):
            with self.subTest(stale_fragment=stale_fragment):
                self.assertNotIn(stale_fragment, zh_table)

    def test_landing_copy_stays_user_facing(self) -> None:
        sources = {
            "landing/index.html": LANDING_INDEX.read_text(encoding="utf-8"),
            "landing/app.js": LANDING_APP_JS.read_text(encoding="utf-8"),
        }
        if DIST_ROOT_INDEX.exists():
            sources["dist/index.html"] = DIST_ROOT_INDEX.read_text(encoding="utf-8")
        if DIST_APP_JS.exists():
            sources["dist/app.js"] = DIST_APP_JS.read_text(encoding="utf-8")

        stale_fragments = (
            "Every source claim below is tied to checked-in manifests",
            "The Japan transport pack is the strongest current sample",
            "Use the checked-in Japan transport manifests",
            "Source ledgers, asset catalogs",
            "Source signatures and build audits",
            "Transport packs with manifests",
            "Cataloged, reproducible, and inspectable",
            "source ledgers, transport manifests",
            "manifest review",
            "manifest-led pipeline",
            "已入库",
            "入库清单",
            "来源台账",
            "构建审计",
            "清单驱动流水线",
            "数据入库基础",
        )

        for source_name, source in sources.items():
            for stale_fragment in stale_fragments:
                with self.subTest(source=source_name, stale_fragment=stale_fragment):
                    self.assertNotIn(stale_fragment, source)

    def test_dist_root_index_keeps_landing_startup_contract(self) -> None:
        if not DIST_ROOT_INDEX.exists():
            self.skipTest("dist/index.html is only available after build_pages_dist runs")
        html = DIST_ROOT_INDEX.read_text(encoding="utf-8")

        for expected_fragment in (
            "./styles.css",
            "./app.js",
            "./app/?view=guide",
            'data-i18n="heroTitle"',
            'data-i18n="heroTitleAccent"',
            'data-i18n="productStageLabel"',
            'class="brandmark__logo"',
            './assets/favicon.svg',
            './assets/hero-hoi4-1936.webp',
            'data-hero-map',
            'data-hero-chip="blank"',
            'data-hero-chip="hoi4-1936"',
            'data-hero-chip="hoi4-1939"',
            'data-hero-chip="tno-1962"',
            'data-stat-value="21338"',
            'data-i18n="sourcesEyebrow"',
            'data-i18n="showcaseEyebrow"',
            './assets/europe-1936-showcase.svg',
            'data-showcase-root',
            'data-showcase-object',
            'data-showcase-layer-tab="political"',
            'data-showcase-layer-tab="rail"',
            'data-showcase-layer-tab="cities"',
            'data-showcase-layer-tab="day-night"',
            'data-i18n="previewEyebrow"',
            'data-preview-root',
            'data-preview-surface',
            'data-preview-viewport',
            'data-preview-image="transport"',
            'class="mini-map__controls"',
            'data-preview-zoom="1"',
            'data-preview-zoom="-1"',
            'data-preview-zoom="reset"',
            'data-i18n-aria-label="previewZoomIn"',
            'data-i18n-aria-label="previewZoomOut"',
            'data-i18n-aria-label="previewZoomReset"',
            'role="tablist"',
            'data-i18n="templatesEyebrow"',
            './assets/template-modern.webp',
            'data-i18n="dataEyebrow"',
            'data-i18n="editionsEyebrow"',
            'data-i18n="casesEyebrow"',
            'data-i18n="faqEyebrow"',
            'data-i18n="updatesEyebrow"',
            'data-i18n-aria-label="productPreviewLabel"',
            'data-i18n-aria-label="brandHomeLabel"',
            'data-i18n-aria-label="primaryNavLabel"',
            'data-i18n-aria-label="languageSwitcherLabel"',
            'data-i18n-alt="productPreviewAlt"',
            'data-i18n-alt="workOneAlt"',
            'data-i18n="workOneTitle"',
            'data-i18n="ctaPrimary"',
            "data-reveal",
        ):
            with self.subTest(expected_fragment=expected_fragment):
                self.assertIn(expected_fragment, html)

        self.assertNotIn('class="hero__metrics"', html)
        self.assertNotIn('data-i18n-aria-label="heroMetricsLabel"', html)
        self.assertNotIn('data-showcase-layer-tab="scenario"', html)

    def test_dist_app_js_keeps_landing_i18n_contract(self) -> None:
        if not DIST_APP_JS.exists():
            self.skipTest("dist/app.js is only available after build_pages_dist runs")
        app_js = DIST_APP_JS.read_text(encoding="utf-8")

        for expected_fragment in (
            "scenario_forge_landing_lang",
            "heroTitle",
            "heroTitleAccent",
            "formatMetricNumbers",
            "statsLabel",
            "sourcesEyebrow",
            "showcaseEyebrow",
            "showcaseLayerPoliticalTitle",
            "showcaseLayerRailTitle",
            "showcaseLayerCitiesTitle",
            "showcaseLayerDayNightTitle",
            "initShowcaseLayers",
            "initShowcaseView",
            "SHOWCASE_VIEW_SCALES",
            "showcaseViewZoomed",
            "clampShowcaseViewPosition",
            "dblclick",
            "PREVIEW_VIEW_SCALES",
            "clampPreviewViewPosition",
            "applyPreviewViewState",
            "initPreviewView",
            "previewZoomed",
            "previewDragging",
            "initPreviewTabs",
            "initHeroMap",
            "initMetricCountUp",
            "previewPanelTransportTitle",
            "dataCardOneTitle",
            "faqOneQuestion",
            "editionsEyebrow",
            "casesEyebrow",
            "templatesEyebrow",
            "updatesEyebrow",
            "productPreviewLabel",
            "productStageLabel",
            "heroChipsLabel",
            "brandHomeLabel",
            "languageSwitcherLabel",
            "productPreviewAlt",
            "DEFAULT_HERO_MODE",
            "HERO_SCENARIO_ASSETS",
            "hero-hoi4-1936.json",
            "hero-hoi4-1939.webp",
            "hero-tno-1962.webp",
            "syncHeroMap",
            "heroAltHoi41936",
            "heroAltHoi41939",
            "heroAltTno1962",
            "data-i18n-alt",
            "zh:",
        ):
            with self.subTest(expected_fragment=expected_fragment):
                self.assertIn(expected_fragment, app_js)

    def test_dist_styles_keeps_reveal_and_motion_contract(self) -> None:
        if not DIST_STYLES_CSS.exists():
            self.skipTest("dist/styles.css is only available after build_pages_dist runs")
        styles_css = DIST_STYLES_CSS.read_text(encoding="utf-8")

        self.assertIn("prefers-reduced-motion", styles_css)
        self.assertRegex(styles_css, re.compile(r'\[data-reveal(?:=["\']enabled["\'])?\]'))
        self.assertIn(".is-revealed", styles_css)
        self.assertIn(".hero-cartography", styles_css)
        self.assertIn("translateY(-18px) perspective(1200px)", styles_css)
        hero_chips_style = re.search(r"\.hero__chips\s*\{(?P<body>[^}]*)\}", styles_css, re.S)
        self.assertIsNotNone(hero_chips_style)
        self.assertNotIn("position: absolute", hero_chips_style.group("body"))
        self.assertIn(".brandmark__logo", styles_css)
        self.assertNotIn(".brandmark__dot", styles_css)
        self.assertIn('[data-hero-transition="loading"]', styles_css)
        self.assertIn('[data-hero-mode="blank"]', styles_css)
        self.assertIn('[data-hero-mode="hoi4-1936"]', styles_css)
        self.assertIn('[data-hero-mode="hoi4-1939"]', styles_css)
        self.assertIn('[data-hero-mode="tno-1962"]', styles_css)
        self.assertIn(".showcase-layer-tabs", styles_css)
        self.assertIn('[data-showcase-view-zoomed="true"]', styles_css)
        self.assertIn(".showcase-map__viewport", styles_css)
        self.assertIn(".showcase-map__viewport::after", styles_css)
        self.assertIn("radial-gradient(ellipse at center", styles_css)
        self.assertIn("inset 0 0 112px", styles_css)
        self.assertIn(".showcase-map__object", styles_css)
        self.assertNotIn(".showcase-map__controls", styles_css)
        self.assertIn("[data-preview-image=\"transport\"]", styles_css)
        self.assertIn("--preview-scale", styles_css)
        self.assertIn(".mini-map__viewport", styles_css)
        self.assertIn(".mini-map__controls", styles_css)
        self.assertIn('[data-preview-zoomed="true"]', styles_css)
        self.assertIn('[data-preview-dragging="true"]', styles_css)
        self.assertIn(".showcase-section", styles_css)
        self.assertRegex(
            styles_css,
            re.compile(r"\.work-card__media img\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;", re.S),
        )
        self.assertRegex(
            styles_css,
            re.compile(r"\.work-card__media\s*\{[^}]*aspect-ratio:\s*16\s*/\s*9;", re.S),
        )

    def test_dist_app_index_keeps_pages_startup_contract(self) -> None:
        if not DIST_APP_INDEX.exists():
            self.skipTest("dist/app/index.html is only available after build_pages_dist runs")
        html = DIST_APP_INDEX.read_text(encoding="utf-8")

        self.assertIn('<meta name="default-scenario" content="tno_1962" />', html)
        self.assertIn('<meta name="robots" content="noindex,nofollow" />', html)
        self.assertIn('<link rel="modulepreload" href="js/main.js" />', html)
        self.assertIn('<link rel="preload" href="data/scenarios/index.json" as="fetch" crossorigin />', html)
        self.assertNotIn('<link rel="preload" href="data/europe_topology.json" as="fetch" crossorigin />', html)
        self.assertNotIn('href="data/locales.startup.json"', html)
        self.assertNotIn('href="data/geo_aliases.startup.json"', html)

    def test_dist_manifest_keeps_pages_size_and_required_files_contract(self) -> None:
        if not DIST_MANIFEST.exists():
            self.skipTest("dist/pages-dist-manifest.json is only available after build_pages_dist runs")
        payload = json.loads(DIST_MANIFEST.read_text(encoding="utf-8"))
        paths = {record["path"] for record in payload["files"]}
        records_by_path = {record["path"]: record for record in payload["files"]}
        required_files = set(payload.get("required_files", []))

        for record in payload["files"]:
            manifest_path = record["path"]
            with self.subTest(manifest_path=manifest_path):
                expected_source_kind = "generated_ignored" if manifest_path.startswith("app/data/") else "dist"
                self.assertEqual(record.get("source_kind"), expected_source_kind)
                dist_path = REPO_ROOT / "dist" / manifest_path
                self.assertTrue(dist_path.exists())
                self.assertEqual(record["size_bytes"], dist_path.stat().st_size)

        self.assertEqual(
            payload["total_bytes"],
            sum((REPO_ROOT / "dist" / record["path"]).stat().st_size for record in payload["files"]),
        )
        self.assertLessEqual(payload["total_bytes"], payload["max_allowed_bytes"])
        self.assertEqual(payload["max_allowed_bytes"], build_pages_dist.MAX_PAGES_DIST_BYTES)
        self.assertEqual(
            records_by_path["pages-dist-manifest.json"]["size_bytes"],
            DIST_MANIFEST.stat().st_size,
        )
        self.assertIn("app/data/CATALOG.json", required_files)
        expected_hgo_runtime_paths = tuple(
            f"app/data/hgo_runtime/{file_name}" for file_name in build_pages_dist.HGO_RUNTIME_FILES
        )
        expected_landing_asset_paths = (
            "assets/hero-cartography.svg",
            "assets/hero-blank.svg",
            "assets/hero-blank.webp",
            "assets/hero-blank.json",
            "assets/hero-hoi4-1936.svg",
            "assets/hero-hoi4-1936.webp",
            "assets/hero-hoi4-1936.json",
            "assets/hero-hoi4-1939.svg",
            "assets/hero-hoi4-1939.webp",
            "assets/hero-hoi4-1939.json",
            "assets/hero-tno-1962.svg",
            "assets/hero-tno-1962.webp",
            "assets/hero-tno-1962.json",
            "assets/showcase-final-map.svg",
            "assets/showcase-final-map.webp",
            "assets/europe-1936-showcase.svg",
            "assets/europe-1936-showcase.json",
            "assets/japan-preview-transport.svg",
            "assets/japan-preview-transport.webp",
            "assets/japan-preview-cities.svg",
            "assets/japan-preview-cities.webp",
            "assets/japan-preview-terrain.svg",
            "assets/japan-preview-terrain.webp",
            "assets/japan-preview-night.svg",
            "assets/japan-preview-night.webp",
            "assets/japan-preview.json",
            "assets/template-blank.svg",
            "assets/template-blank.webp",
            "assets/template-modern.svg",
            "assets/template-modern.webp",
            "assets/template-hoi4.svg",
            "assets/template-hoi4.webp",
            "assets/template-tno.svg",
            "assets/template-tno.webp",
        )
        for expected_path in (
            "index.html",
            *expected_landing_asset_paths,
            "app/index.html",
            ".nojekyll",
            "app/js/main.js",
            "app/js/api/backend_client.js",
            "app/js/ui/sidebar/project_support_diagnostics_controller.js",
            "app/data/CATALOG.json",
            "app/data/scenarios/index.json",
            "app/data/runtime_asset_registry.json",
            "app/data/country_feature_policies.json",
            "app/data/hgo_catalogs/index.json",
            "app/data/hgo_catalogs/hgo_place_names.json",
            "app/data/hgo_catalogs/hgo_flags.png_manifest.json",
            "app/data/hgo_catalogs/hgo_identity_aliases.json",
            *expected_hgo_runtime_paths,
            "app/data/hgo_catalogs/flags_png/small/AB/ABK.png",
            "app/data/hgo_catalogs/flags_png/medium/AB/ABK.png",
            "app/data/city_lights/historical_1930_entries.json",
            "app/data/scenarios/tno_1962/startup.bundle.en.json",
            "app/data/scenarios/tno_1962/chunks/political.coarse.r0c0.json",
            "app/data/europe_topology.na_v2.json",
            "app/data/transport_layers/global_road/catalog.json",
            "app/data/transport_layers/global_rail/catalog.json",
            "app/data/transport_layers/global_rail/regions/south_america/shards/sa_w082_w058/manifest.json",
            "app/data/transport_layers/global_rail/regions/south_america/shards/sa_w082_w058/build_audit.json",
            "app/data/transport_layers/global_rail/regions/south_america/shards/sa_w082_w058/railways.preview.topo.json",
            "app/data/transport_layers/global_airport/airports.geojson",
            "app/data/transport_layers/global_port/ports.geojson",
            "app/data/transport_layers/japan_airport/airports.geojson",
            "app/data/transport_layers/japan_port/ports.core.geojson",
            "app/data/transport_layers/japan_port/ports.expanded.geojson",
            "app/data/transport_layers/japan_port/ports.geojson",
            "app/data/transport_layers/japan_corridor/carrier.json",
            "app/data/transport_layers/japan_road/roads.preview.topo.json",
            "app/data/transport_layers/japan_road/manifest.json",
            "app/data/transport_layers/japan_rail/railways.preview.topo.json",
            "app/data/transport_layers/japan_rail/rail_stations_major.preview.geojson",
            "app/data/transport_layers/japan_rail/manifest.json",
            "app/data/global_contours.major.topo.json",
            "app/data/global_contours.minor.topo.json",
            "app/data/global_rivers.geojson",
            "app/data/global_bathymetry.topo.json",
            "app/data/transport_layers/japan_industrial_zones/industrial_zones.open.preview.geojson",
        ):
            with self.subTest(expected_path=expected_path):
                self.assertIn(expected_path, paths)

        for expected_path in expected_landing_asset_paths:
            with self.subTest(asset_copy=expected_path):
                self.assertEqual(
                    (REPO_ROOT / "dist" / expected_path).read_bytes(),
                    (REPO_ROOT / "landing" / expected_path).read_bytes(),
                )

        for relative_path in ("index.html", "app.js", "styles.css"):
            with self.subTest(root_copy=relative_path):
                self.assertEqual(
                    (REPO_ROOT / "dist" / relative_path).read_text(encoding="utf-8").replace("\r\n", "\n"),
                    (REPO_ROOT / "landing" / relative_path).read_text(encoding="utf-8").replace("\r\n", "\n"),
                )

        for dist_js_path in sorted(DIST_APP_JS_ROOT.rglob("*.js")):
            source_relative_path = Path("js") / dist_js_path.relative_to(DIST_APP_JS_ROOT)
            source_path = REPO_ROOT / source_relative_path
            with self.subTest(app_js_mirror=str(source_relative_path).replace("\\", "/")):
                self.assertTrue(source_path.exists(), f"{source_relative_path} should be the source for {dist_js_path}")
                self.assertEqual(
                    dist_js_path.read_text(encoding="utf-8").replace("\r\n", "\n"),
                    source_path.read_text(encoding="utf-8").replace("\r\n", "\n"),
                )

        for excluded_path in (
            "app/data/PROBAV_LC100_global_v3.0.1_2019_discrete.tif",
            "app/data/ETOPO_2022_v1_60s_N90W180_surface.tif",
            "app/data/scenarios/tno_1962/derived/marine_regions_named_waters.snapshot.geojson",
            "app/data/scenarios/tno_1962/audit.json",
            "app/data/scenarios/modern_world/runtime_topology.topo.json",
            "app/data/i18n/locales_baseline.json",
            "app/data/transport_layers/global_road/shards/w120_w090/roads.topo.json",
            "app/data/transport_layers/global_rail/regions/south_america/shards/sa_w082_w058/railways.topo.json",
            "app/data/transport_layers/japan_road/roads.topo.json",
            "app/data/transport_layers/japan_industrial_zones/industrial_zones.open.geojson",
            "app/data/hgo_catalogs/hgo_flags.index.json",
            "app/data/hgo_catalogs/flags_png/full/AB/ABK.png",
            "app/data/europe_topology.highres.json",
            "app/data/europe_topology.json.bak",
            "app/data/europe_topology.na_v1.json",
            "app/js/ui/dev_workspace/scenario_country_color_editor.js",
        ):
            with self.subTest(excluded_path=excluded_path):
                self.assertNotIn(excluded_path, paths)

    def test_dist_hgo_png_manifest_references_only_published_assets(self) -> None:
        if not DIST_MANIFEST.exists():
            self.skipTest("dist/pages-dist-manifest.json is only available after build_pages_dist runs")
        payload = json.loads(DIST_MANIFEST.read_text(encoding="utf-8"))
        dist_paths = {record["path"] for record in payload["files"]}
        hgo_manifest_path = REPO_ROOT / "dist" / "app" / "data" / "hgo_catalogs" / "hgo_flags.png_manifest.json"
        hgo_manifest = json.loads(hgo_manifest_path.read_text(encoding="utf-8"))
        seen_paths: set[str] = set()
        allowed_tiers = set(build_pages_dist.HGO_IDENTITY_FLAG_TIERS)

        def assert_record_published(tier: str, record: dict) -> None:
            self.assertIn(tier, allowed_tiers)
            png_path = record["png_path"]
            self.assertIn(f"app/{png_path}", dist_paths)
            seen_paths.add(png_path)

        for tag, tag_entry in hgo_manifest["tags"].items():
            with self.subTest(tag=tag):
                for tier, record in tag_entry.get("base", {}).items():
                    assert_record_published(tier, record)
                for variant_key, variants in tag_entry.get("variants", {}).items():
                    for tier, record in variants.items():
                        with self.subTest(variant_key=variant_key, tier=tier):
                            assert_record_published(tier, record)

        counts = hgo_manifest["counts"]
        self.assertGreater(len(seen_paths), 0)
        self.assertEqual(counts["files"], len(seen_paths))
        self.assertEqual(counts["tags"], len(hgo_manifest["tags"]))
        self.assertEqual(set(counts["files_by_tier"].keys()), allowed_tiers)
        self.assertNotIn("data/hgo_catalogs/flags_png/full/DK/DKU.png", seen_paths)

        source_hgo_manifest = json.loads(
            (REPO_ROOT / "data" / "hgo_catalogs" / "hgo_flags.png_manifest.json").read_text(encoding="utf-8")
        )
        expected_published_tags: set[str] = set()
        full_only_tags: set[str] = set()
        for tag, tag_entry in source_hgo_manifest["tags"].items():
            source_tiers = set(tag_entry.get("base", {}).keys())
            for variants in tag_entry.get("variants", {}).values():
                source_tiers.update(variants.keys())
            if source_tiers.intersection(allowed_tiers):
                expected_published_tags.add(tag)
            else:
                full_only_tags.add(tag)

        self.assertGreater(len(full_only_tags), 0)
        self.assertEqual(set(hgo_manifest["tags"].keys()), expected_published_tags)
        self.assertEqual(set(source_hgo_manifest["tags"].keys()) - set(hgo_manifest["tags"].keys()), full_only_tags)

    def test_dist_hgo_runtime_registry_references_only_published_files(self) -> None:
        if not DIST_MANIFEST.exists():
            self.skipTest("dist/pages-dist-manifest.json is only available after build_pages_dist runs")
        payload = json.loads(DIST_MANIFEST.read_text(encoding="utf-8"))
        dist_paths = {record["path"] for record in payload["files"]}
        registry_path = REPO_ROOT / "dist" / "app" / "data" / "runtime_asset_registry.json"
        registry = json.loads(registry_path.read_text(encoding="utf-8"))
        expected = {
            "hgo_runtime_manifest": "data/hgo_runtime/manifest.json",
            "hgo_runtime_seed": "data/hgo_runtime/seed.json",
            "hgo_runtime_provinces_bmp": "data/hgo_runtime/provinces.bmp",
        }

        for key, url in expected.items():
            with self.subTest(key=key):
                self.assertEqual(registry.get("assets", {}).get(key, {}).get("url"), url)
                self.assertIn(f"app/{url}", dist_paths)
                self.assertTrue((REPO_ROOT / "dist" / "app" / url).is_file())

        catalog = json.loads((REPO_ROOT / "dist" / "app" / "data" / "CATALOG.json").read_text(encoding="utf-8"))
        catalog_entries = {entry["key"]: entry for entry in catalog.get("entries") or []}
        for key, url in expected.items():
            with self.subTest(catalog_key=key):
                self.assertEqual(catalog_entries.get(key, {}).get("url"), url)

    def test_dist_hgo_runtime_manifest_hashes_match_published_files(self) -> None:
        if not DIST_MANIFEST.exists():
            self.skipTest("dist/pages-dist-manifest.json is only available after build_pages_dist runs")
        hgo_manifest_path = REPO_ROOT / "dist" / "app" / "data" / "hgo_runtime" / "manifest.json"
        hgo_manifest = json.loads(hgo_manifest_path.read_text(encoding="utf-8"))
        assets = hgo_manifest.get("assets") or {}

        for key in ("hgo_runtime_seed", "hgo_runtime_provinces_bmp"):
            with self.subTest(key=key):
                metadata = assets.get(key) or {}
                dist_asset_path = REPO_ROOT / "dist" / "app" / str(metadata.get("url") or "")
                self.assertTrue(dist_asset_path.is_file())
                self.assertEqual(metadata.get("size_bytes"), dist_asset_path.stat().st_size)
                self.assertEqual(metadata.get("sha256"), hashlib.sha256(dist_asset_path.read_bytes()).hexdigest())

    def test_dist_manifest_keeps_japan_point_workbench_full_pack_targets(self) -> None:
        if not DIST_MANIFEST.exists():
            self.skipTest("dist/pages-dist-manifest.json is only available after build_pages_dist runs")
        payload = json.loads(DIST_MANIFEST.read_text(encoding="utf-8"))
        dist_paths = {record["path"] for record in payload["files"]}

        for manifest_relative_path in (
            "data/transport_layers/japan_airport/manifest.json",
            "data/transport_layers/japan_port/manifest.json",
        ):
            manifest = json.loads((REPO_ROOT / manifest_relative_path).read_text(encoding="utf-8"))
            path_sections = [manifest.get("paths", {})]
            variants = manifest.get("variants", {})
            if isinstance(variants, dict):
                path_sections.extend(
                    variant.get("paths", {}) for variant in variants.values() if isinstance(variant, dict)
                )

            for path_section in path_sections:
                full_paths = path_section.get("full", {})
                if not isinstance(full_paths, dict):
                    continue
                for runtime_path in full_paths.values():
                    with self.subTest(manifest=manifest_relative_path, runtime_path=runtime_path):
                        self.assertIn(f"app/{runtime_path}", dist_paths)

    def test_dist_transport_manifests_reference_only_published_pack_files(self) -> None:
        transport_root = REPO_ROOT / "dist" / "app" / "data" / "transport_layers"
        if not transport_root.exists():
            self.skipTest("dist transport layers are only available after build_pages_dist runs")
        missing: list[str] = []
        for manifest_path in transport_root.rglob("manifest.json"):
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            path_sections = [manifest.get("paths", {})]
            variants = manifest.get("variants", {})
            if isinstance(variants, dict):
                path_sections.extend(
                    variant.get("paths", {}) for variant in variants.values() if isinstance(variant, dict)
                )
            for path_section in path_sections:
                if not isinstance(path_section, dict):
                    continue
                for mode in ("preview", "full"):
                    mode_paths = path_section.get(mode, {})
                    if not isinstance(mode_paths, dict):
                        continue
                    for runtime_path in mode_paths.values():
                        if isinstance(runtime_path, str) and runtime_path.startswith("data/transport_layers/"):
                            if not (REPO_ROOT / "dist" / "app" / runtime_path).is_file():
                                missing.append(f"{manifest_path.relative_to(transport_root)} -> {runtime_path}")

        self.assertFalse(missing[:20], missing[:20])

    def test_dist_catalog_references_only_published_files(self) -> None:
        catalog_path = REPO_ROOT / "dist" / "app" / "data" / "CATALOG.json"
        if not catalog_path.exists():
            self.skipTest("dist catalog is only available after build_pages_dist runs")
        payload = json.loads(catalog_path.read_text(encoding="utf-8"))
        missing: list[str] = []
        entries = payload.get("entries") or []
        for entry in entries:
            runtime_path = entry.get("url") if isinstance(entry, dict) else None
            if isinstance(runtime_path, str) and runtime_path.startswith("data/"):
                if not (REPO_ROOT / "dist" / "app" / runtime_path).is_file():
                    missing.append(runtime_path)

        self.assertEqual(payload.get("counts", {}).get("entries"), len(entries))
        self.assertFalse(missing[:20], missing[:20])

    def test_dist_transport_manifests_do_not_alias_full_paths_to_preview(self) -> None:
        transport_root = REPO_ROOT / "dist" / "app" / "data" / "transport_layers"
        if not transport_root.exists():
            self.skipTest("dist transport layers are only available after build_pages_dist runs")
        aliased: list[str] = []
        orphaned_counts: list[str] = []
        for manifest_path in transport_root.rglob("manifest.json"):
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            sections = [(manifest.get("paths", {}), manifest.get("feature_counts", {}), manifest_path)]
            variants = manifest.get("variants", {})
            if isinstance(variants, dict):
                sections.extend(
                    (variant.get("paths", {}), variant.get("feature_counts", {}), manifest_path)
                    for variant in variants.values()
                    if isinstance(variant, dict)
                )
            for path_section, count_section, source_path in sections:
                if not isinstance(path_section, dict):
                    continue
                preview_paths = path_section.get("preview") if isinstance(path_section.get("preview"), dict) else {}
                full_paths = path_section.get("full") if isinstance(path_section.get("full"), dict) else {}
                if isinstance(count_section, dict):
                    for mode, counts in count_section.items():
                        mode_paths = path_section.get(mode)
                        if isinstance(counts, dict) and isinstance(mode_paths, dict):
                            missing_count_keys = set(counts).difference(mode_paths)
                            orphaned_counts.extend(
                                f"{source_path.relative_to(transport_root)}:{mode}:{key}"
                                for key in sorted(missing_count_keys)
                            )
                for key, runtime_path in full_paths.items():
                    if preview_paths.get(key) == runtime_path:
                        aliased.append(f"{source_path.relative_to(transport_root)}:{key}:{runtime_path}")

        self.assertFalse(aliased[:20], aliased[:20])
        self.assertFalse(orphaned_counts[:20], orphaned_counts[:20])

    def test_dist_uk_industrial_manifest_uses_preview_only_reduced_contract(self) -> None:
        source_manifest_path = REPO_ROOT / "data" / "transport_layers" / "uk_industrial_zones" / "manifest.json"
        dist_manifest_path = REPO_ROOT / "dist" / "app" / "data" / "transport_layers" / "uk_industrial_zones" / "manifest.json"
        if not dist_manifest_path.exists():
            self.skipTest("dist transport layers are only available after build_pages_dist runs")

        source_manifest = json.loads(source_manifest_path.read_text(encoding="utf-8"))
        dist_manifest = json.loads(dist_manifest_path.read_text(encoding="utf-8"))
        self.assertIn("full", source_manifest.get("paths", {}))
        self.assertIn("preview", dist_manifest.get("paths", {}))
        self.assertNotIn("full", dist_manifest.get("paths", {}))

        variants = dist_manifest.get("variants", {})
        self.assertIsInstance(variants, dict)
        for variant in variants.values():
            if not isinstance(variant, dict):
                continue
            with self.subTest(variant=variant.get("label") or "default"):
                self.assertIn("preview", variant.get("paths", {}))
                self.assertNotIn("full", variant.get("paths", {}))

    def test_dist_scenario_manifests_reference_only_published_runtime_files(self) -> None:
        if not DIST_MANIFEST.exists():
            self.skipTest("dist/pages-dist-manifest.json is only available after build_pages_dist runs")
        payload = json.loads(DIST_MANIFEST.read_text(encoding="utf-8"))
        dist_paths = {record["path"] for record in payload["files"]}
        scenario_manifest_paths = sorted(
            path for path in dist_paths
            if path.startswith("app/data/scenarios/") and path.endswith("/manifest.json")
        )
        self.assertGreater(len(scenario_manifest_paths), 0)
        checked_urls = 0
        for manifest_path in scenario_manifest_paths:
            manifest = json.loads((REPO_ROOT / "dist" / manifest_path).read_text(encoding="utf-8"))
            with self.subTest(manifest_path=manifest_path):
                for key, value in manifest.items():
                    if key.endswith("_url") and isinstance(value, str) and value.startswith("data/scenarios/"):
                        checked_urls += 1
                        self.assertIn(f"app/{value}", dist_paths)
                detail_manifest_url = manifest.get("detail_chunk_manifest_url")
                if isinstance(detail_manifest_url, str) and detail_manifest_url:
                    detail_manifest = json.loads((REPO_ROOT / "dist" / "app" / detail_manifest_url).read_text(encoding="utf-8"))
                    for chunk in detail_manifest.get("chunks", []):
                        chunk_url = chunk.get("url") if isinstance(chunk, dict) else ""
                        if isinstance(chunk_url, str) and chunk_url:
                            checked_urls += 1
                            self.assertIn(f"app/{chunk_url}", dist_paths)
                for language in ("en", "zh"):
                    bundle_url = manifest.get(f"startup_bundle_url_{language}")
                    if not isinstance(bundle_url, str) or not bundle_url:
                        continue
                    bundle = json.loads((REPO_ROOT / "dist" / "app" / bundle_url).read_text(encoding="utf-8"))
                    manifest_subset = bundle.get("manifest_subset")
                    self.assertIsInstance(manifest_subset, dict)
                    for key, value in manifest_subset.items():
                        if key.endswith("_url") and isinstance(value, str) and value.startswith("data/scenarios/"):
                            checked_urls += 1
                            self.assertIn(f"app/{value}", dist_paths)
        self.assertGreater(checked_urls, 0)

    def test_pages_scenario_metadata_strips_unpublished_audit_urls(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            scenarios_dir = Path(tmp_dir) / "data" / "scenarios"
            scenario_dir = scenarios_dir / "sample_scenario"
            scenario_dir.mkdir(parents=True)
            (scenarios_dir / "index.json").write_text(
                json.dumps(
                    {
                        "version": 1,
                        "scenarios": [
                            {
                                "scenario_id": "sample_scenario",
                                "manifest_url": "data/scenarios/sample_scenario/manifest.json",
                                "audit_url": "data/scenarios/sample_scenario/audit.json",
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )
            (scenario_dir / "manifest.json").write_text(
                json.dumps(
                    {
                        "scenario_id": "sample_scenario",
                        "audit_url": "data/scenarios/sample_scenario/audit.json",
                        "countries_url": "data/scenarios/sample_scenario/countries.json",
                        "controllers_url": "data/scenarios/sample_scenario/controllers.by_feature.json",
                        "runtime_topology_url": "data/scenarios/sample_scenario/runtime_topology.topo.json",
                    }
                ),
                encoding="utf-8",
            )
            bundle_payload = {
                "scenario_id": "sample_scenario",
                "manifest_subset": {
                    "scenario_id": "sample_scenario",
                    "audit_url": "data/scenarios/sample_scenario/audit.json",
                    "controllers_url": "data/scenarios/sample_scenario/controllers.by_feature.json",
                    "runtime_topology_url": "data/scenarios/sample_scenario/runtime_topology.topo.json",
                    "countries_url": "data/scenarios/sample_scenario/countries.json",
                },
            }
            bundle_path = scenario_dir / "startup.bundle.en.json"
            bundle_bytes = json.dumps(bundle_payload, separators=(",", ":")).encode("utf-8")
            bundle_path.write_bytes(bundle_bytes)
            (scenario_dir / "startup.bundle.en.json.gz").write_bytes(gzip.compress(bundle_bytes, mtime=0))

            build_pages_dist.strip_scenario_publish_audit_urls(scenarios_dir)

            index_payload = json.loads((scenarios_dir / "index.json").read_text(encoding="utf-8"))
            manifest_payload = json.loads((scenario_dir / "manifest.json").read_text(encoding="utf-8"))
            bundle_payload = json.loads(bundle_path.read_text(encoding="utf-8"))
            gzip_bundle_payload = json.loads(gzip.decompress((scenario_dir / "startup.bundle.en.json.gz").read_bytes()))

            self.assertNotIn("audit_url", index_payload["scenarios"][0])
            self.assertNotIn("audit_url", manifest_payload)
            self.assertNotIn("controllers_url", manifest_payload)
            self.assertNotIn("runtime_topology_url", manifest_payload)
            self.assertEqual(manifest_payload["countries_url"], "data/scenarios/sample_scenario/countries.json")
            self.assertNotIn("audit_url", bundle_payload["manifest_subset"])
            self.assertNotIn("controllers_url", bundle_payload["manifest_subset"])
            self.assertNotIn("runtime_topology_url", bundle_payload["manifest_subset"])
            self.assertEqual(
                bundle_payload["manifest_subset"]["countries_url"],
                "data/scenarios/sample_scenario/countries.json",
            )
            self.assertEqual(gzip_bundle_payload, bundle_payload)

    def test_pages_scenario_metadata_preserves_published_controllers_url(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            previous_app_dist_root = build_pages_dist.APP_DIST_ROOT
            app_dist_root = Path(tmp_dir)
            scenarios_dir = app_dist_root / "data" / "scenarios"
            scenario_dir = scenarios_dir / "sample_scenario"
            scenario_dir.mkdir(parents=True)
            build_pages_dist.APP_DIST_ROOT = app_dist_root
            try:
                controllers_url = "data/scenarios/sample_scenario/controllers.by_feature.json"
                (scenario_dir / "controllers.by_feature.json").write_text("{}", encoding="utf-8")
                (scenario_dir / "manifest.json").write_text(
                    json.dumps(
                        {
                            "scenario_id": "sample_scenario",
                            "controllers_url": controllers_url,
                        }
                    ),
                    encoding="utf-8",
                )
                bundle_payload = {
                    "scenario_id": "sample_scenario",
                    "manifest_subset": {
                        "scenario_id": "sample_scenario",
                        "controllers_url": controllers_url,
                    },
                }
                bundle_path = scenario_dir / "startup.bundle.en.json"
                bundle_bytes = json.dumps(bundle_payload, separators=(",", ":")).encode("utf-8")
                bundle_path.write_bytes(bundle_bytes)
                (scenario_dir / "startup.bundle.en.json.gz").write_bytes(gzip.compress(bundle_bytes, mtime=0))

                build_pages_dist.strip_scenario_publish_audit_urls(scenarios_dir)

                manifest_payload = json.loads((scenario_dir / "manifest.json").read_text(encoding="utf-8"))
                bundle_payload = json.loads(bundle_path.read_text(encoding="utf-8"))
                gzip_bundle_payload = json.loads(
                    gzip.decompress((scenario_dir / "startup.bundle.en.json.gz").read_bytes())
                )
                self.assertEqual(manifest_payload["controllers_url"], controllers_url)
                self.assertEqual(bundle_payload["manifest_subset"]["controllers_url"], controllers_url)
                self.assertEqual(gzip_bundle_payload, bundle_payload)
            finally:
                build_pages_dist.APP_DIST_ROOT = previous_app_dist_root

    def test_pages_scenario_url_probe_rejects_empty_manifest_url(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            previous_app_dist_root = build_pages_dist.APP_DIST_ROOT
            app_dist_root = Path(tmp_dir) / "app"
            scenarios_dir = app_dist_root / "data" / "scenarios"
            scenarios_dir.mkdir(parents=True)
            (scenarios_dir / "index.json").write_text(
                json.dumps({"version": 1, "scenarios": [{"scenario_id": "broken", "manifest_url": ""}]}),
                encoding="utf-8",
            )
            build_pages_dist.APP_DIST_ROOT = app_dist_root
            try:
                with self.assertRaises(FileNotFoundError) as raised:
                    build_pages_dist.validate_dist_scenario_startup_urls()
            finally:
                build_pages_dist.APP_DIST_ROOT = previous_app_dist_root

            self.assertIn("broken.manifest_url: <empty>", str(raised.exception))

    def test_deploy_dist_artifact_preserves_nojekyll(self) -> None:
        workflow_lines = VERIFY_SHARED_WORKFLOW.read_text(encoding="utf-8").splitlines()
        upload_block_start = workflow_lines.index("          name: deploy-dist")
        upload_block = "\n".join(workflow_lines[upload_block_start : upload_block_start + 4])

        self.assertIn("path: dist", upload_block)
        self.assertIn("include-hidden-files: true", upload_block)


if __name__ == "__main__":
    unittest.main()
