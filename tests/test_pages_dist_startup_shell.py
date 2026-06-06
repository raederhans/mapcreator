from __future__ import annotations

import re
import unittest
import gzip
import hashlib
import json
import tempfile
from pathlib import Path

from tools import build_pages_dist


REPO_ROOT = Path(__file__).resolve().parents[1]
LANDING_INDEX = REPO_ROOT / "landing" / "index.html"
LANDING_APP_JS = REPO_ROOT / "landing" / "app.js"
LANDING_STYLES_CSS = REPO_ROOT / "landing" / "styles.css"
LANDING_ASSETS = REPO_ROOT / "landing" / "assets"
DIST_ROOT_INDEX = REPO_ROOT / "dist" / "index.html"
DIST_APP_JS = REPO_ROOT / "dist" / "app.js"
DIST_STYLES_CSS = REPO_ROOT / "dist" / "styles.css"
DIST_APP_INDEX = REPO_ROOT / "dist" / "app" / "index.html"
DIST_MANIFEST = REPO_ROOT / "dist" / "pages-dist-manifest.json"
VERIFY_SHARED_WORKFLOW = REPO_ROOT / ".github" / "workflows" / "verify-shared.yml"


class PagesDistStartupShellTest(unittest.TestCase):

    def test_checked_in_pages_dist_manifest_exists(self) -> None:
        self.assertTrue(
            DIST_MANIFEST.exists(),
            "dist/pages-dist-manifest.json is a checked-in Pages dist contract",
        )

    def test_landing_generated_cartography_assets_exist(self) -> None:
        for asset_name in (
            "hero-cartography.svg",
            "showcase-final-map.svg",
            "japan-preview-transport.svg",
            "japan-preview-cities.svg",
            "japan-preview-terrain.svg",
            "japan-preview-night.svg",
            "template-blank.svg",
            "template-modern.svg",
            "template-hoi4.svg",
            "template-tno.svg",
        ):
            with self.subTest(asset_name=asset_name):
                asset = LANDING_ASSETS / asset_name
                self.assertTrue(asset.exists(), f"{asset_name} should be checked in for Pages")
                text = asset.read_text(encoding="utf-8")
                self.assertIn("<svg", text)
                self.assertIn("viewBox", text)
                self.assertIn("<path", text)
                self.assertLess(asset.stat().st_size, 220_000)

    def test_pages_dist_generated_text_writes_use_lf(self) -> None:
        source = (REPO_ROOT / "tools" / "build_pages_dist.py").read_text(encoding="utf-8")
        self.assertIn('def write_text_lf(path: Path, text: str) -> None:', source)
        self.assertIn('def normalize_dist_text_files_lf() -> None:', source)
        self.assertIn("LF_NORMALIZED_ROOT_DIST_PATHS", source)
        self.assertIn('newline="\\n"', source)
        self.assertNotIn(".write_text(", source)
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
            finally:
                build_pages_dist.DIST_ROOT = original_dist_root

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
                self.assertEqual(records, [{"path": "app/stable.json", "size_bytes": 2}])
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
            './assets/hero-cartography.svg',
            'data-hero-map',
            'data-hero-chip="modern"',
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
            'data-i18n="previewEyebrow"',
            'data-preview-root',
            'data-preview-image="transport"',
            'role="tablist"',
            'data-i18n="templatesEyebrow"',
            './assets/template-modern.svg',
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
            'data-i18n="chipModern"',
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
            "initPreviewTabs",
            "initHeroMap",
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
        self.assertIn(".hero-cartography", styles_css)
        self.assertIn("[data-preview-image=\"transport\"]", styles_css)
        self.assertIn(".showcase-section", styles_css)
        self.assertRegex(
            styles_css,
            re.compile(r"\.work-card__media img\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;", re.S),
        )
        self.assertRegex(
            styles_css,
            re.compile(r"\.work-card__media\s*\{[^}]*aspect-ratio:\s*16\s*/\s*9;", re.S),
        )

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
            './assets/hero-cartography.svg',
            'data-hero-map',
            'data-hero-chip="modern"',
            'data-stat-value="21338"',
            'data-i18n="sourcesEyebrow"',
            'data-i18n="showcaseEyebrow"',
            'data-i18n="previewEyebrow"',
            'data-preview-root',
            'data-preview-image="transport"',
            'role="tablist"',
            'data-i18n="templatesEyebrow"',
            './assets/template-modern.svg',
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
        self.assertIn("[data-preview-image=\"transport\"]", styles_css)
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
            "assets/showcase-final-map.svg",
            "assets/japan-preview-transport.svg",
            "assets/japan-preview-cities.svg",
            "assets/japan-preview-terrain.svg",
            "assets/japan-preview-night.svg",
            "assets/template-blank.svg",
            "assets/template-modern.svg",
            "assets/template-hoi4.svg",
            "assets/template-tno.svg",
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
            "app/data/transport_layers/japan_road/roads.preview.topo.json",
            "app/data/transport_layers/japan_industrial_zones/industrial_zones.open.preview.geojson",
        ):
            with self.subTest(expected_path=expected_path):
                self.assertIn(expected_path, paths)

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
