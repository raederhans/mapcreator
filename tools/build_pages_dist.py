from __future__ import annotations

import gzip
import hashlib
import json
import os
import posixpath
import re
import shutil
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tools.app_entry_resolver import (
    repo_display_path,
    resolve_editor_entry_path,
    resolve_landing_entry_path,
)
DIST_ROOT = ROOT / "dist"
APP_DIST_ROOT = DIST_ROOT / "app"
DIST_MANIFEST_PATH = DIST_ROOT / "pages-dist-manifest.json"
GITHUB_PAGES_HARD_MAX_BYTES = 1024 * 1024 * 1024
PAGES_DIST_WARNING_BYTES = 950 * 1024 * 1024
MAX_PAGES_DIST_BYTES = GITHUB_PAGES_HARD_MAX_BYTES
DIST_MANIFEST_LARGEST_FILE_LIMIT = 20
PAGES_DIST_MANIFEST_SCHEMA_VERSION = 2
PAGES_REACHABILITY_SCHEMA_VERSION = 2
STARTUP_REACHABILITY_CATEGORIES = (
    "startup-critical",
    "startup-deferred-runtime",
    "on-demand-product",
    "scenario-specific",
    "export-only",
    "developer-only",
    "unknown",
)
PAGES_MODULE_ENTRYPOINT = "app/js/main.js"
PAGES_HTML_ENTRYPOINTS = (
    ("landing", "index.html"),
    ("editor", "app/index.html"),
)
ROOT_PUBLIC_FILES = (
    ".nojekyll",
    "CNAME",
    "favicon.ico",
    "favicon.svg",
    "favicon.png",
    "site.webmanifest",
    "robots.txt",
    "humans.txt",
)
ROOT_PUBLIC_FILE_SUFFIXES = {
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".svg",
    ".gif",
    ".avif",
}
APP_SHARED_DIRS = ("css", "js", "vendor")
REQUIRED_DIST_FILES = (
    "index.html",
    "app/index.html",
    ".nojekyll",
    "app/js/main.js",
    "app/data/CATALOG.json",
    "app/data/scenarios/index.json",
)
DATA_RUNTIME_FILES = (
    "CATALOG.json",
    "manifest.json",
    "runtime_asset_registry.json",
    "country_feature_policies.json",
    "europe_topology.json",
    "europe_topology.na_v2.json",
    "hierarchy.json",
    "locales.json",
    "geo_aliases.json",
    "europe_topology.runtime_political_v1.json",
    "world_cities.geojson",
    "city_aliases.json",
    "ru_city_overrides.geojson",
    "special_zones.geojson",
    "global_rivers.geojson",
    "europe_physical.geojson",
    "europe_urban.geojson",
    "global_physical_semantics.topo.json",
    "global_contours.major.topo.json",
    "global_contours.minor.topo.json",
    "global_bathymetry.topo.json",
    "historical_city_lights_1930_exclusions.json",
)
# 这两组 allowlist 定义的是 Pages 运行时公开面，不是仓库 data 目录的全量镜像。
# 新增浏览器直接读取的 runtime import 或 manifest URL 时，要同步把文件放进这里。
DATA_RUNTIME_DIRS = (
    "city_lights",
    "feature-migrations",
    "palette-maps",
    "palettes",
    "releasables",
    "scenario-rules",
    "thematic_layers",
    "unit_counter_libraries",
)
HGO_IDENTITY_RUNTIME_FILES = (
    "index.json",
    "hgo_place_names.json",
    "hgo_identity_aliases.json",
)
HGO_RUNTIME_FILES = (
    "manifest.json",
    "seed.json",
    "provinces.bmp",
)
PAGES_HGO_RUNTIME_FILES: tuple[str, ...] = ()
HGO_IDENTITY_FLAG_TIERS = ("small", "medium")
PAGES_CITY_ALIAS_STABLE_KEY_LIMIT = 2500
PAGES_CITY_ALIAS_ENTRY_LIMIT = PAGES_CITY_ALIAS_STABLE_KEY_LIMIT
PAGES_LOCAL_PREVIEW_SCENARIO_IDS = {"hgo_1936"}
SCENARIO_EXCLUDED_DIR_NAMES = {"derived"}
SCENARIO_PUBLISHED_DERIVED_RELATIVE_FILES = {
    Path("tno_1962") / "derived" / "atlantropa_donor_ledger.json",
    Path("tno_1962") / "derived" / "geometry_drop_audit.json",
}
SCENARIO_EXCLUDED_FILE_NAMES = {"audit.json"}
SCENARIO_EXCLUDED_RELATIVE_FILES = {
    Path("modern_world") / "runtime_topology.topo.json",
}
TRANSPORT_METADATA_FILE_NAMES = {
    "catalog.json",
    "manifest.json",
    "build_audit.json",
    "subtype_catalog.json",
    "carrier.json",
    "provenance.json",
}
TRANSPORT_SMALL_DIRECT_RUNTIME_FILES = {
    "data/transport_layers/global_airport/airports.geojson",
    "data/transport_layers/global_port/ports.geojson",
    "data/transport_layers/japan_airport/airports.geojson",
    "data/transport_layers/japan_port/ports.core.geojson",
    "data/transport_layers/japan_port/ports.expanded.geojson",
    "data/transport_layers/japan_port/ports.geojson",
}
TRANSPORT_LOCAL_ONLY_PREVIEW_FILES = {
    Path("japan_industrial_zones") / "industrial_zones.internal.preview.geojson",
    Path("japan_industrial_zones") / "industrial_zones.open.preview.geojson",
}
DISPOSABLE_DIST_NAMES = {"__pycache__"}
DISPOSABLE_DIST_SUFFIXES = {".pyc", ".pyo"}
LF_NORMALIZED_ROOT_DIST_PATHS = {
    Path("index.html"),
    Path("app.js"),
    Path("styles.css"),
}
LF_NORMALIZED_ROOT_ASSET_SUFFIXES = {".json"}
LF_NORMALIZED_APP_SUFFIXES = {".css", ".geojson", ".html", ".js", ".json", ".md", ".svg", ".txt"}
BYTE_EXACT_APP_DATA_PATHS = {
    Path("app") / "data" / "hgo_runtime" / file_name
    for file_name in PAGES_HGO_RUNTIME_FILES
    if file_name.endswith(".json")
}
GENERATED_IGNORED_DIST_DIRS = (
    Path("app") / "data",
)

MODULE_STATIC_IMPORT_RE = re.compile(
    r"(?m)^\s*import\s+(?:[^;\"']+?\s+from\s+)?[\"'](?P<reference>[^\"']+)[\"']"
)
MODULE_REEXPORT_RE = re.compile(
    r"(?ms)^\s*export\s+(?:\*|\{.*?\})\s+from\s+[\"'](?P<reference>[^\"']+)[\"']"
)
MODULE_URL_REFERENCE_RE = re.compile(
    r"new\s+URL\(\s*[\"'](?P<reference>[^\"']+)[\"']\s*,\s*"
    r"(?:import\.meta\.url|self\.location\.href)\s*\)"
)
HTML_RESOURCE_REFERENCE_RE = re.compile(
    r"<(?:script|link|img|source)\b[^>]*?\b(?:src|href)=[\"'](?P<reference>[^\"']+)[\"']",
    re.I,
)

PAGES_DYNAMIC_IMPORT_REGISTRY = (
    {
        "id": "deferred-ui-bootstrap",
        "source": "app/js/bootstrap/deferred_ui_bootstrap.js",
        "expression_index": 0,
        "expected_expression": "path",
        "targets": (
            "app/js/ui/toolbar.js",
            "app/js/ui/sidebar.js",
            "app/js/ui/scenario_controls.js",
            "app/js/ui/styled_selects.js",
            "app/js/ui/shortcuts.js",
        ),
    },
    {
        "id": "data-service-runtime-modules",
        "source": "app/js/core/data_service.js",
        "expression_index": 0,
        "expected_expression": "specifier",
        "targets": (
            "app/js/core/city_lights_historical_1930_asset.js",
            "app/js/core/city_lights_modern_asset.js",
        ),
    },
)

LANDING_PRODUCT_ASSET_PATHS = (
    "assets/atlas-physical.webp",
    "assets/europe-1936-showcase.json",
    "assets/europe-1936-showcase.svg",
    "assets/favicon.png",
    "assets/favicon.svg",
    "assets/logo-mark.png",
    "assets/night-lights-political.webp",
    "assets/sample-runs.json",
    "assets/showcase-final-map.svg",
    "assets/showcase-final-map.webp",
    "assets/social-preview.png",
    "assets/social-preview.svg",
    "assets/workspace-overview.webp",
)

PAGES_PRODUCT_INVENTORY_RULES = (
    {
        "id": "developer-modules",
        "category": "developer-only",
        "owner": "development-tools",
        "override_reachability": True,
        "paths": (
            "app/js/bootstrap/main_runtime_diagnostics.js",
            "app/js/bootstrap/ui_shell_boot.js",
            "app/js/bootstrap/ui_shell_debug_seed.js",
            "app/js/core/state/dev_state.js",
            "app/js/ui/dev_workspace.js",
        ),
        "prefixes": ("app/js/ui/dev_workspace/",),
    },
    {
        "id": "export-modules",
        "category": "export-only",
        "owner": "export-capability",
        "override_reachability": True,
        "paths": (
            "app/js/core/export_artifact_package.js",
            "app/js/core/sample_export_recommendation.js",
        ),
        "prefixes": ("app/js/ui/toolbar/export_",),
    },
    {
        "id": "scenario-modules",
        "category": "scenario-specific",
        "owner": "scenario-runtime",
        "override_reachability": True,
        "paths": (
            "app/js/bootstrap/deferred_detail_promotion.js",
            "app/js/bootstrap/startup_scenario_boot.js",
            "app/js/core/state/scenario_runtime_state.js",
            "app/js/ui/scenario_controls.js",
            "app/js/ui/toolbar/hgo_runtime_preview_controller.js",
        ),
        "prefixes": (
            "app/js/core/hgo_",
            "app/js/core/map_renderer/hgo_",
            "app/js/core/map_renderer/scenario_",
            "app/js/core/renderer/scenario_",
            "app/js/core/scenario/",
            "app/js/core/scenario_",
            "app/js/core/state/actions/scenario_",
            "app/js/ui/toolbar/scenario_",
        ),
    },
    {
        "id": "scenario-runtime-data",
        "category": "scenario-specific",
        "owner": "scenario-runtime",
        "override_reachability": True,
        "prefixes": (
            "app/data/scenario-rules/",
            "app/data/scenarios/",
        ),
    },
    {
        "id": "hgo-runtime-data",
        "category": "scenario-specific",
        "owner": "hgo-scenario-runtime",
        "override_reachability": True,
        "prefixes": (
            "app/data/hgo_catalogs/",
            "app/data/hgo_runtime/",
        ),
    },
    {
        "id": "on-demand-module-entries",
        "category": "on-demand-product",
        "owner": "editor-on-demand-features",
        "paths": (
            "app/js/core/thematic_admin_metrics_loader.js",
            "app/js/ui/i18n_catalog.js",
        ),
    },
    {
        "id": "transport-product-data",
        "category": "on-demand-product",
        "owner": "transport-workbench",
        "prefixes": ("app/data/transport_layers/",),
    },
    {
        "id": "thematic-product-data",
        "category": "on-demand-product",
        "owner": "thematic-workbench",
        "prefixes": ("app/data/thematic_layers/",),
    },
    {
        "id": "unit-counter-product-data",
        "category": "on-demand-product",
        "owner": "unit-counter-workbench",
        "prefixes": ("app/data/unit_counter_libraries/",),
    },
    {
        "id": "editor-product-data",
        "category": "on-demand-product",
        "owner": "editor-data-runtime",
        "paths": tuple(f"app/data/{file_name}" for file_name in DATA_RUNTIME_FILES),
        "prefixes": tuple(
            f"app/data/{directory_name}/"
            for directory_name in DATA_RUNTIME_DIRS
            if directory_name not in {"scenario-rules", "thematic_layers", "unit_counter_libraries"}
        ),
    },
    {
        "id": "landing-sample-projects",
        "category": "on-demand-product",
        "owner": "landing-sample-projects",
        "prefixes": ("assets/sample-projects/",),
    },
    {
        "id": "landing-product-assets",
        "category": "on-demand-product",
        "owner": "landing-assets",
        "paths": LANDING_PRODUCT_ASSET_PATHS,
        "prefixes": (
            "assets/hero-",
            "assets/japan-preview",
            "assets/template-",
            "assets/work-",
        ),
    },
    {
        "id": "milsymbol-deferred-vendor",
        "category": "startup-deferred-runtime",
        "owner": "editor-vendor",
        "paths": ("app/vendor/milsymbol.js",),
    },
    {
        "id": "editor-vendor-product",
        "category": "on-demand-product",
        "owner": "editor-vendor",
        "paths": (
            "app/vendor/d3.v7.min.js",
            "app/vendor/fflate.LICENSE.txt",
            "app/vendor/fflate.browser.js",
            "app/vendor/textures/README.md",
            "app/vendor/textures/paper_vintage_01.svg",
            "app/vendor/topojson-client.min.js",
        ),
    },
    {
        "id": "editor-styles",
        "category": "on-demand-product",
        "owner": "editor-startup",
        "paths": ("app/css/style.css",),
    },
    {
        "id": "pages-release-files",
        "category": "on-demand-product",
        "owner": "pages-release",
        "paths": (
            ".nojekyll",
            "app.js",
            "pages-dist-manifest.json",
            "styles.css",
        ),
    },
)


def write_text_lf(path: Path, text: str) -> None:
    for attempt in range(5):
        try:
            with path.open("w", encoding="utf-8", newline="\n") as handle:
                handle.write(text)
            return
        except OSError:
            if attempt >= 4:
                raise
            time.sleep(0.15 * (attempt + 1))


def write_bytes_with_parent(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(5):
        try:
            path.write_bytes(data)
            return
        except OSError:
            if attempt >= 4:
                raise
            path.parent.mkdir(parents=True, exist_ok=True)
            time.sleep(0.15 * (attempt + 1))


def should_normalize_dist_text_file_lf(path: Path) -> bool:
    try:
        relative_path = path.resolve().relative_to(DIST_ROOT.resolve())
    except ValueError:
        return path.suffix.lower() in LF_NORMALIZED_APP_SUFFIXES
    if relative_path in BYTE_EXACT_APP_DATA_PATHS:
        return False
    if relative_path in LF_NORMALIZED_ROOT_DIST_PATHS:
        return True
    if (
        len(relative_path.parts) >= 2
        and relative_path.parts[0] == "assets"
        and path.suffix.lower() in LF_NORMALIZED_ROOT_ASSET_SUFFIXES
    ):
        return True
    return (
        len(relative_path.parts) >= 2
        and relative_path.parts[0] == "app"
        and path.suffix.lower() in LF_NORMALIZED_APP_SUFFIXES
    )


def normalize_dist_text_file_lf(path: Path, *, allow_missing: bool = False) -> None:
    if not should_normalize_dist_text_file_lf(path):
        return
    try:
        data = path.read_bytes()
    except FileNotFoundError:
        if allow_missing:
            return
        raise FileNotFoundError(f"Dist text file disappeared during LF normalization: {path}") from None
    if b"\r\n" not in data:
        return
    path.write_bytes(data.replace(b"\r\n", b"\n"))


def normalize_dist_text_files_lf() -> None:
    for path in iter_dist_files():
        normalize_dist_text_file_lf(path)


def should_skip_disposable_dist_path(path: Path) -> bool:
    return any(part in DISPOSABLE_DIST_NAMES for part in path.parts) or path.suffix.lower() in DISPOSABLE_DIST_SUFFIXES


def reset_dist() -> None:
    if DIST_ROOT.exists():
        remove_tree_with_retries(DIST_ROOT)
    APP_DIST_ROOT.mkdir(parents=True, exist_ok=True)


def remove_tree_with_retries(path: Path, attempts: int = 20) -> None:
    last_error: OSError | None = None
    for attempt in range(attempts):
        if not path.exists():
            return
        try:
            shutil.rmtree(path)
            return
        except OSError as exc:
            last_error = exc
            prune_tree_once(path)
            if not path.exists():
                return
            time.sleep(0.2)
    if last_error:
        raise last_error


def prune_tree_once(path: Path) -> None:
    if not path.exists():
        return
    for current, directories, files in os.walk(path, topdown=False):
        current_path = Path(current)
        for file_name in files:
            try:
                (current_path / file_name).unlink()
            except FileNotFoundError:
                pass
            except OSError:
                pass
        for directory_name in directories:
            try:
                (current_path / directory_name).rmdir()
            except FileNotFoundError:
                pass
            except OSError:
                pass
    try:
        path.rmdir()
    except FileNotFoundError:
        pass
    except OSError:
        pass


def copy_tree_contents(source_dir: Path, destination_dir: Path) -> None:
    if not source_dir.exists() or not source_dir.is_dir():
        return
    destination_dir.mkdir(parents=True, exist_ok=True)
    for child in source_dir.iterdir():
        if should_skip_disposable_dist_path(child):
            continue
        target_path = destination_dir / child.name
        if child.is_dir():
            shutil.copytree(
                child,
                target_path,
                dirs_exist_ok=True,
                ignore=shutil.ignore_patterns(*DISPOSABLE_DIST_NAMES, "*.pyc", "*.pyo"),
            )
        else:
            shutil.copy2(child, target_path)


def copy_tree_filtered(source_dir: Path, destination_dir: Path, should_copy_file) -> None:
    if not source_dir.exists() or not source_dir.is_dir():
        return
    for source_file in source_dir.rglob("*"):
        if not source_file.is_file():
            continue
        relative_path = source_file.relative_to(source_dir)
        if should_skip_disposable_dist_path(relative_path):
            continue
        if not should_copy_file(relative_path, source_file):
            continue
        target_path = destination_dir / relative_path
        target_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_file, target_path)


def copy_relative_file(relative_path: str) -> None:
    source_file = ROOT / relative_path
    if not source_file.is_file():
        return
    target_path = APP_DIST_ROOT / relative_path
    target_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source_file, target_path)


def copy_root_public_assets() -> None:
    DIST_ROOT.mkdir(parents=True, exist_ok=True)
    for file_name in ROOT_PUBLIC_FILES:
        source_file = ROOT / file_name
        if source_file.is_file():
            shutil.copy2(source_file, DIST_ROOT / file_name)
    for source_file in ROOT.iterdir():
        if not source_file.is_file():
            continue
        if source_file.name == "index.html":
            continue
        if source_file.suffix.lower() in ROOT_PUBLIC_FILE_SUFFIXES:
            shutil.copy2(source_file, DIST_ROOT / source_file.name)


def build_landing_dist(landing_entry: Path) -> None:
    copy_root_public_assets()
    if landing_entry.parent != ROOT:
        copy_tree_contents(landing_entry.parent, DIST_ROOT)
    shutil.copy2(landing_entry, DIST_ROOT / "index.html")


def inject_editor_noindex(index_path: Path) -> None:
    content = index_path.read_text(encoding="utf-8")
    marker = '<meta name="viewport" content="width=device-width, initial-scale=1.0" />'
    noindex = "\n    <meta name=\"robots\" content=\"noindex,nofollow\" />"
    if 'meta name="robots" content="noindex,nofollow"' in content:
        return
    if marker in content:
        content = content.replace(marker, marker + noindex, 1)
        write_text_lf(index_path, content)


def build_editor_dist(editor_entry: Path) -> None:
    if editor_entry.parent != ROOT:
        copy_tree_contents(editor_entry.parent, APP_DIST_ROOT)
    for directory_name in APP_SHARED_DIRS:
        source_dir = ROOT / directory_name
        if source_dir.is_dir():
            shutil.copytree(source_dir, APP_DIST_ROOT / directory_name, dirs_exist_ok=True)
    target_index = APP_DIST_ROOT / "index.html"
    shutil.copy2(editor_entry, target_index)
    inject_editor_noindex(target_index)


def copy_scenario_runtime_data() -> None:
    source_dir = ROOT / "data" / "scenarios"
    destination_dir = APP_DIST_ROOT / "data" / "scenarios"
    chunked_full_topology_excludes = set()
    # 只要场景 manifest 已声明 chunk runtime，Pages 包里就不再复制完整 runtime_topology。
    # 发布面要保持“运行时真实会加载什么，就只运什么”，避免 dist 体积和 metadata 一起漂移。
    for manifest_path in source_dir.glob("*/manifest.json"):
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
        if isinstance(payload, dict) and str(payload.get("detail_chunk_manifest_url") or "").strip():
            chunked_full_topology_excludes.add(manifest_path.parent.relative_to(source_dir) / "runtime_topology.topo.json")

    def should_copy_file(relative_path: Path, _source_file: Path) -> bool:
        if relative_path.parts and relative_path.parts[0] in PAGES_LOCAL_PREVIEW_SCENARIO_IDS:
            return False
        if relative_path in SCENARIO_PUBLISHED_DERIVED_RELATIVE_FILES:
            return True
        parts = set(relative_path.parts)
        if parts.intersection(SCENARIO_EXCLUDED_DIR_NAMES):
            return False
        if relative_path.name in SCENARIO_EXCLUDED_FILE_NAMES:
            return False
        if relative_path in SCENARIO_EXCLUDED_RELATIVE_FILES or relative_path in chunked_full_topology_excludes:
            return False
        return True

    copy_tree_filtered(source_dir, destination_dir, should_copy_file)
    strip_scenario_publish_audit_urls(destination_dir)


def strip_scenario_publish_audit_urls(scenarios_dir: Path) -> None:
    """Keep Pages metadata aligned with the runtime allowlist.

    Scenario `audit.json` files and selected heavyweight local-only topology
    files stay available in the repository. Pages excludes them to keep the
    deploy artifact small, so published metadata must not advertise those URLs.
    """

    def strip_unpublished_manifest_urls(payload: dict) -> bool:
        changed = False
        if "audit_url" in payload:
            payload.pop("audit_url", None)
            changed = True
        runtime_topology_url = payload.get("runtime_topology_url")
        if isinstance(runtime_topology_url, str) and not (APP_DIST_ROOT / runtime_topology_url).is_file():
            payload.pop("runtime_topology_url", None)
            changed = True
        for field_name, value in list(payload.items()):
            if (
                field_name in {"controllers_url"}
                and isinstance(value, str)
                and value.startswith("data/scenarios/")
                and not (APP_DIST_ROOT / value).is_file()
            ):
                # Pages publishes a reduced scenario payload. Keep manifest URLs aligned
                # with the files that are actually shipped so manifest walks stay strict.
                payload.pop(field_name, None)
                changed = True
        return changed

    index_path = scenarios_dir / "index.json"
    if index_path.is_file():
        payload = json.loads(index_path.read_text(encoding="utf-8"))
        if isinstance(payload, dict):
            scenarios = payload.get("scenarios")
            if isinstance(scenarios, list):
                published_scenarios = []
                for scenario in scenarios:
                    if isinstance(scenario, dict):
                        scenario.pop("audit_url", None)
                        if str(scenario.get("scenario_id") or "").strip() in PAGES_LOCAL_PREVIEW_SCENARIO_IDS:
                            continue
                    published_scenarios.append(scenario)
                payload["scenarios"] = published_scenarios
            policy = dict(payload.get("pages_dist_policy") or {})
            policy["local_preview_scenario_ids"] = sorted(PAGES_LOCAL_PREVIEW_SCENARIO_IDS)
            payload["pages_dist_policy"] = policy
            payload.pop("audit_url", None)
            write_text_lf(index_path, json.dumps(payload, indent=2, sort_keys=True) + "\n")

    for manifest_path in scenarios_dir.glob("*/manifest.json"):
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
        if isinstance(payload, dict) and strip_unpublished_manifest_urls(payload):
            write_text_lf(manifest_path, json.dumps(payload, indent=2, sort_keys=True) + "\n")

    for bundle_path in scenarios_dir.glob("*/startup.bundle.*.json"):
        if not bundle_path.is_file():
            continue
        payload = json.loads(bundle_path.read_text(encoding="utf-8"))
        manifest_subset = payload.get("manifest_subset") if isinstance(payload, dict) else None
        if not isinstance(manifest_subset, dict):
            continue
        if strip_unpublished_manifest_urls(manifest_subset):
            bundle_bytes = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            write_bytes_with_parent(bundle_path, bundle_bytes)
            gzip_path = bundle_path.with_suffix(bundle_path.suffix + ".gz")
            if gzip_path.is_file():
                write_bytes_with_parent(gzip_path, gzip.compress(bundle_bytes, mtime=0))


def _dist_path_for_app_url(url: str) -> Path:
    value = str(url or "").strip()
    path = (APP_DIST_ROOT / value).resolve()
    app_root_text = normalize_windows_path_text(APP_DIST_ROOT.resolve())
    path_text = normalize_windows_path_text(path)
    try:
        common_path = os.path.commonpath([app_root_text, path_text])
    except ValueError as exc:
        raise ValueError(f"Pages dist URL must stay under app dist root: {value}") from exc
    if common_path != app_root_text:
        raise ValueError(f"Pages dist URL must stay under app dist root: {value}")
    return path


def normalize_windows_path_text(path: Path) -> str:
    text = str(path)
    if os.name == "nt":
        if text.startswith("\\\\?\\UNC\\"):
            text = "\\\\" + text[len("\\\\?\\UNC\\") :]
        elif text.startswith("\\\\?\\"):
            text = text[4:]
    return os.path.normcase(os.path.normpath(text))


def _require_dist_url(url: str, *, source: str, missing: list[str], required: bool = False) -> None:
    if not url:
        if required:
            missing.append(f"{source}: <empty>")
        return
    if not _dist_path_for_app_url(url).is_file():
        missing.append(f"{source}: {url}")


def validate_dist_scenario_startup_urls() -> None:
    """Fail Pages builds when published scenario metadata points at absent files."""
    scenarios_dir = APP_DIST_ROOT / "data" / "scenarios"
    index_path = scenarios_dir / "index.json"
    if not index_path.is_file():
        raise FileNotFoundError("Pages dist is missing scenario index: app/data/scenarios/index.json")
    payload = json.loads(index_path.read_text(encoding="utf-8"))
    scenarios = payload.get("scenarios") if isinstance(payload, dict) else []
    missing: list[str] = []
    if not isinstance(scenarios, list):
        raise ValueError("Pages dist scenario index must contain a scenarios list.")
    for entry in scenarios:
        if not isinstance(entry, dict):
            continue
        scenario_id = str(entry.get("scenario_id") or "").strip() or "unknown"
        manifest_url = str(entry.get("manifest_url") or "").strip()
        _require_dist_url(manifest_url, source=f"{scenario_id}.manifest_url", missing=missing, required=True)
        manifest_path = _dist_path_for_app_url(manifest_url)
        if not manifest_path.is_file():
            continue
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if not isinstance(manifest, dict):
            continue
        for field_name in (
            "startup_bundle_url_en",
            "startup_bundle_url_zh",
            "runtime_bootstrap_topology_url",
            "startup_topology_url",
            "detail_chunk_manifest_url",
        ):
            value = str(manifest.get(field_name) or "").strip()
            if value:
                _require_dist_url(value, source=f"{scenario_id}.manifest.{field_name}", missing=missing)
        for field_name, value in list(manifest.items()):
            if field_name.endswith("_url") and isinstance(value, str) and value.startswith("data/scenarios/"):
                _require_dist_url(value, source=f"{scenario_id}.manifest.{field_name}", missing=missing)
        detail_manifest_url = str(manifest.get("detail_chunk_manifest_url") or "").strip()
        detail_manifest_path = _dist_path_for_app_url(detail_manifest_url)
        if detail_manifest_path.is_file():
            # manifest 自己存在还不够，chunk manifest 里列出来的每个 chunk URL 也要真的能在 dist 里找到。
            detail_manifest = json.loads(detail_manifest_path.read_text(encoding="utf-8"))
            chunks = detail_manifest.get("chunks") if isinstance(detail_manifest, dict) else []
            if isinstance(chunks, list):
                for chunk in chunks:
                    if isinstance(chunk, dict):
                        _require_dist_url(
                            str(chunk.get("url") or "").strip(),
                            source=f"{scenario_id}.detail_chunk[{chunk.get('id', '')}]",
                            missing=missing,
                        )
        for language in ("en", "zh"):
            bundle_url = str(manifest.get(f"startup_bundle_url_{language}") or "").strip()
            bundle_path = _dist_path_for_app_url(bundle_url)
            if not bundle_path.is_file():
                continue
            # startup bundle 内嵌的 manifest_subset 也是公开合同的一部分。
            # 这里继续递归校验，防止页面首屏能拿到 bundle，却在后续跳转时引用未发布文件。
            bundle = json.loads(bundle_path.read_text(encoding="utf-8"))
            manifest_subset = bundle.get("manifest_subset") if isinstance(bundle, dict) else None
            if not isinstance(manifest_subset, dict):
                continue
            for field_name, value in list(manifest_subset.items()):
                if field_name.endswith("_url") and isinstance(value, str) and value.startswith("data/scenarios/"):
                    _require_dist_url(value, source=f"{scenario_id}.startup_bundle_{language}.{field_name}", missing=missing)
    if missing:
        raise FileNotFoundError(
            "Pages dist scenario metadata references unpublished files:\n"
            + "\n".join(f"- {item}" for item in missing[:50])
        )


def copy_transport_runtime_data() -> None:
    source_dir = ROOT / "data" / "transport_layers"
    destination_dir = APP_DIST_ROOT / "data" / "transport_layers"

    def should_copy_file(relative_path: Path, source_file: Path) -> bool:
        # transport dist 只发布主运行时所需的小直载资产、metadata、preview 和 overrides。
        # 这样 Pages 既能保留 workbench/overview 所需最小面，又不会把全量 builder 中间产物带上去。
        if relative_path in TRANSPORT_LOCAL_ONLY_PREVIEW_FILES:
            return False
        repo_relative = source_file.relative_to(ROOT).as_posix()
        if repo_relative in TRANSPORT_SMALL_DIRECT_RUNTIME_FILES:
            return True
        if relative_path.name == "industrial_zones.open.geojson":
            return False
        if relative_path.name in TRANSPORT_METADATA_FILE_NAMES:
            return True
        if ".preview." in relative_path.name:
            return True
        if "overrides" in relative_path.parts and relative_path.suffix.lower() == ".json":
            return True
        return False

    copy_tree_filtered(source_dir, destination_dir, should_copy_file)
    prune_transport_manifests_to_published_paths(destination_dir)
    prune_dist_catalog_to_published_files()


def prune_transport_manifest_path_section(
    paths: dict,
    feature_counts: dict | None,
) -> bool:
    changed = False
    for mode in ("preview", "full"):
        mode_paths = paths.get(mode)
        if not isinstance(mode_paths, dict):
            continue
        mode_counts = feature_counts.get(mode) if isinstance(feature_counts, dict) else None
        if not isinstance(mode_counts, dict):
            mode_counts = None
        for key, runtime_path in list(mode_paths.items()):
            if not isinstance(runtime_path, str) or not runtime_path.startswith("data/transport_layers/"):
                continue
            if (APP_DIST_ROOT / runtime_path).is_file():
                continue
            del mode_paths[key]
            changed = True
            if mode_counts is not None and key in mode_counts:
                del mode_counts[key]
        if not mode_paths:
            del paths[mode]
            changed = True
        if mode_counts is not None and not mode_counts and isinstance(feature_counts, dict):
            del feature_counts[mode]
            changed = True
    return changed


def prune_transport_manifests_to_published_paths(destination_dir: Path) -> None:
    """Keep Pages transport manifests aligned with the reduced transport payload."""
    for manifest_path in destination_dir.rglob("manifest.json"):
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        paths = manifest.get("paths")
        if not isinstance(paths, dict):
            continue
        feature_counts = manifest.get("feature_counts") if isinstance(manifest.get("feature_counts"), dict) else None
        changed = prune_transport_manifest_path_section(paths, feature_counts)
        variants = manifest.get("variants") if isinstance(manifest.get("variants"), dict) else {}
        for variant in variants.values():
            if not isinstance(variant, dict):
                continue
            variant_paths = variant.get("paths") if isinstance(variant.get("paths"), dict) else {}
            variant_counts = variant.get("feature_counts") if isinstance(variant.get("feature_counts"), dict) else None
            changed = prune_transport_manifest_path_section(variant_paths, variant_counts) or changed
        if changed:
            write_text_lf(manifest_path, json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")


def recalculate_catalog_counts(entries: list[dict]) -> dict:
    counts = {
        "entries": len(entries),
        "by_role": {},
        "by_format": {},
        "by_read_mode": {},
    }
    for entry in entries:
        for field_name, bucket_name in (
            ("role", "by_role"),
            ("format", "by_format"),
            ("readMode", "by_read_mode"),
        ):
            value = str(entry.get(field_name) or "").strip()
            if value:
                counts[bucket_name][value] = counts[bucket_name].get(value, 0) + 1
    return {
        "entries": counts["entries"],
        "by_role": dict(sorted(counts["by_role"].items())),
        "by_format": dict(sorted(counts["by_format"].items())),
        "by_read_mode": dict(sorted(counts["by_read_mode"].items())),
    }


def prune_dist_catalog_to_published_files() -> None:
    catalog_path = APP_DIST_ROOT / "data" / "CATALOG.json"
    if not catalog_path.is_file():
        return
    payload = json.loads(catalog_path.read_text(encoding="utf-8"))
    entries = payload.get("entries")
    if not isinstance(entries, list):
        return
    published_entries = []
    changed = False
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        runtime_url = entry.get("url")
        if isinstance(runtime_url, str) and runtime_url.startswith("data/") and not (APP_DIST_ROOT / runtime_url).is_file():
            changed = True
            continue
        published_entries.append(entry)
    if not changed:
        return
    payload["entries"] = published_entries
    payload["counts"] = recalculate_catalog_counts(published_entries)
    write_text_lf(catalog_path, json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def prune_dist_runtime_asset_registry_to_published_files() -> None:
    registry_path = APP_DIST_ROOT / "data" / "runtime_asset_registry.json"
    if not registry_path.is_file():
        return
    payload = json.loads(registry_path.read_text(encoding="utf-8"))
    assets = payload.get("assets")
    if not isinstance(assets, dict):
        return
    published_assets = {}
    removed_keys = []
    for asset_key, asset in assets.items():
        runtime_url = asset.get("url") if isinstance(asset, dict) else None
        if isinstance(runtime_url, str) and runtime_url.startswith("data/") and not (APP_DIST_ROOT / runtime_url).is_file():
            removed_keys.append(asset_key)
            continue
        published_assets[asset_key] = asset
    if not removed_keys:
        return
    payload["assets"] = published_assets
    policy = dict(payload.get("pages_dist_policy") or {})
    policy["removed_unpublished_asset_keys"] = sorted(removed_keys)
    payload["pages_dist_policy"] = policy
    write_text_lf(registry_path, json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n")


def resolve_dist_data_manifest_output_path(output_key: str) -> Path | None:
    normalized_key = str(output_key or "").replace("\\", "/").strip("/")
    if not normalized_key:
        return None
    relative_path = Path(normalized_key)
    if relative_path.is_absolute() or ".." in relative_path.parts:
        return None
    if relative_path.parts and relative_path.parts[0] == "js":
        return APP_DIST_ROOT / relative_path
    return APP_DIST_ROOT / "data" / relative_path


def prune_dist_data_manifest_to_published_files() -> None:
    manifest_path = APP_DIST_ROOT / "data" / "manifest.json"
    if not manifest_path.is_file():
        return
    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    changed = False

    outputs = payload.get("outputs")
    if isinstance(outputs, dict):
        published_outputs = {}
        removed_output_keys = []
        for output_key, output_record in outputs.items():
            output_path = resolve_dist_data_manifest_output_path(output_key)
            if output_path is None or not output_path.is_file():
                removed_output_keys.append(output_key)
                continue
            published_outputs[output_key] = output_record
        if removed_output_keys:
            payload["outputs"] = published_outputs
            policy = dict(payload.get("pages_dist_policy") or {})
            policy["removed_unpublished_output_keys"] = sorted(removed_output_keys)
            payload["pages_dist_policy"] = policy
            changed = True

    embedded_registry = payload.get("runtime_asset_registry")
    embedded_assets = (
        embedded_registry.get("assets")
        if isinstance(embedded_registry, dict) and isinstance(embedded_registry.get("assets"), dict)
        else None
    )
    if isinstance(embedded_assets, dict):
        published_assets = {}
        removed_asset_keys = []
        for asset_key, asset in embedded_assets.items():
            runtime_url = asset.get("url") if isinstance(asset, dict) else None
            if isinstance(runtime_url, str) and runtime_url.startswith("data/") and not (APP_DIST_ROOT / runtime_url).is_file():
                removed_asset_keys.append(asset_key)
                continue
            published_assets[asset_key] = asset
        if removed_asset_keys:
            embedded_registry["assets"] = published_assets
            policy = dict(embedded_registry.get("pages_dist_policy") or {})
            policy["removed_unpublished_asset_keys"] = sorted(removed_asset_keys)
            embedded_registry["pages_dist_policy"] = policy
            changed = True

    if changed:
        write_text_lf(manifest_path, json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n")


def filter_hgo_png_manifest_for_pages(payload: dict) -> dict:
    allowed_tiers = set(HGO_IDENTITY_FLAG_TIERS)
    next_payload = dict(payload)
    files_by_tier = {tier: 0 for tier in HGO_IDENTITY_FLAG_TIERS}
    total_png_bytes = 0
    largest_png: dict[str, int | str] = {"path": "", "byte_length": 0}

    def filter_tiers(tiers: object) -> dict:
        nonlocal total_png_bytes, largest_png
        filtered: dict = {}
        if not isinstance(tiers, dict):
            return filtered
        for tier, record in tiers.items():
            if tier not in allowed_tiers or not isinstance(record, dict):
                continue
            png_path = str(record.get("png_path") or "").strip()
            if not png_path:
                continue
            filtered[tier] = record
            files_by_tier[tier] += 1
            byte_length = int(record.get("byte_length") or 0)
            total_png_bytes += byte_length
            if byte_length > int(largest_png["byte_length"]):
                largest_png = {"path": png_path, "byte_length": byte_length}
        return filtered

    filtered_tags = {}
    source_tags = payload.get("tags") if isinstance(payload, dict) else {}
    for tag, tag_record in sorted((source_tags or {}).items()):
        if not isinstance(tag_record, dict):
            continue
        base = filter_tiers(tag_record.get("base"))
        variants = {}
        source_variants = tag_record.get("variants")
        for variant_key, variant_tiers in sorted((source_variants or {}).items()):
            filtered_variant = filter_tiers(variant_tiers)
            if filtered_variant:
                variants[variant_key] = filtered_variant
        if base or variants:
            next_record = dict(tag_record)
            next_record["base"] = base
            next_record["variants"] = variants
            filtered_tags[tag] = next_record

    counts = dict(payload.get("counts") or {})
    counts["files"] = sum(files_by_tier.values())
    counts["files_by_tier"] = files_by_tier
    counts["tags"] = len(filtered_tags)
    counts["total_png_bytes"] = total_png_bytes
    counts["largest_png"] = largest_png
    policy = dict(payload.get("distribution_policy") or {})
    policy["pages_dist_flag_tiers"] = list(HGO_IDENTITY_FLAG_TIERS)
    next_payload["counts"] = counts
    next_payload["distribution_policy"] = policy
    next_payload["tags"] = filtered_tags
    return next_payload


def write_pages_hgo_png_manifest(source_path: Path, destination_path: Path) -> None:
    if not source_path.is_file():
        return
    payload = json.loads(source_path.read_text(encoding="utf-8"))
    destination_path.parent.mkdir(parents=True, exist_ok=True)
    write_text_lf(
        destination_path,
        json.dumps(filter_hgo_png_manifest_for_pages(payload), indent=2, sort_keys=True) + "\n",
    )


def normalize_city_alias_text(value: object) -> str:
    return str(value or "").strip()


def parse_city_alias_int(value: object) -> int:
    try:
        return int(float(str(value or "0").replace(",", "")))
    except (TypeError, ValueError):
        return 0


def parse_city_alias_bool(value: object) -> bool:
    if isinstance(value, bool):
        return value
    return str(value or "").strip().casefold() in {"1", "true", "yes", "y"}


def city_alias_capital_score(capital_kind: object) -> int:
    value = normalize_city_alias_text(capital_kind)
    if value == "country_capital":
        return 3
    if value == "admin_capital":
        return 2
    return 1


def city_alias_tier_score(base_tier: object) -> int:
    value = normalize_city_alias_text(base_tier)
    if value == "major":
        return 3
    if value == "regional":
        return 2
    return 1


def load_pages_city_alias_priority() -> dict[str, dict[str, object]]:
    world_cities_path = ROOT / "data" / "world_cities.geojson"
    if not world_cities_path.is_file():
        return {}
    payload = json.loads(world_cities_path.read_text(encoding="utf-8"))
    features = payload.get("features")
    if not isinstance(features, list):
        return {}

    priority: dict[str, dict[str, object]] = {}
    source_rank = {"merged": 0, "natural_earth": 1, "geonames": 2}
    for feature in features:
        properties = feature.get("properties") if isinstance(feature, dict) else None
        if not isinstance(properties, dict):
            continue
        city_id = normalize_city_alias_text(properties.get("city_id") or properties.get("id"))
        stable_key = normalize_city_alias_text(properties.get("stable_key"))
        if not stable_key and city_id:
            stable_key = f"id::{city_id}"
        if not stable_key:
            continue
        source = normalize_city_alias_text(properties.get("source"))
        priority[stable_key] = {
            "stable_key": stable_key,
            "country_code": normalize_city_alias_text(properties.get("country_code")),
            "name": normalize_city_alias_text(
                properties.get("name_ascii")
                or properties.get("name_en")
                or properties.get("name")
            ),
            "population": parse_city_alias_int(properties.get("population")),
            "capital_score": city_alias_capital_score(properties.get("capital_kind")),
            "is_world_city": parse_city_alias_bool(properties.get("is_world_city")),
            "tier_score": city_alias_tier_score(properties.get("base_tier")),
            "source_rank": source_rank.get(source, 9),
        }
    return priority


def city_alias_priority_sort_key(
    stable_key: str,
    entry: dict[str, object],
    priority: dict[str, dict[str, object]],
) -> tuple[object, ...]:
    row = priority.get(stable_key) or {}
    entry_aliases = entry.get("aliases")
    alias_count = len(entry_aliases) if isinstance(entry_aliases, list) else 0
    country_code = normalize_city_alias_text(row.get("country_code") or entry.get("country_code"))
    name = normalize_city_alias_text(
        row.get("name")
        or entry.get("name_ascii")
        or entry.get("name_en")
        or entry.get("primary_name")
        or entry.get("name")
    )
    return (
        -int(bool(row.get("is_world_city"))),
        -parse_city_alias_int(row.get("capital_score")),
        -parse_city_alias_int(row.get("tier_score")),
        -parse_city_alias_int(row.get("population")),
        parse_city_alias_int(row.get("source_rank")),
        -alias_count,
        country_code.casefold(),
        name.casefold(),
        stable_key.casefold(),
    )


def build_pages_city_aliases_subset(payload: dict) -> dict:
    entries = payload.get("entries")
    source_entries = entries if isinstance(entries, list) else []
    source_entries_by_stable_key = {
        stable_key: entry
        for entry in source_entries
        if isinstance(entry, dict)
        for stable_key in [
            normalize_city_alias_text(entry.get("stable_key") or entry.get("locale_key") or entry.get("city_id"))
        ]
        if stable_key
    }
    priority = load_pages_city_alias_priority()
    prioritized_stable_keys = sorted(
        source_entries_by_stable_key,
        key=lambda stable_key: city_alias_priority_sort_key(
            stable_key,
            source_entries_by_stable_key[stable_key],
            priority,
        ),
    )
    selected_stable_keys = set(prioritized_stable_keys[:PAGES_CITY_ALIAS_STABLE_KEY_LIMIT])
    source_geo = payload.get("geo") if isinstance(payload.get("geo"), dict) else {}
    source_alias_to_stable_key = (
        payload.get("alias_to_stable_key")
        if isinstance(payload.get("alias_to_stable_key"), dict)
        else {}
    )
    source_alias_to_city_id = (
        payload.get("alias_to_city_id")
        if isinstance(payload.get("alias_to_city_id"), dict)
        else {}
    )
    geo = {
        stable_key: source_geo[stable_key]
        for stable_key in sorted(selected_stable_keys)
        if stable_key in source_geo
    }
    alias_to_stable_key = {
        normalize_city_alias_text(alias): stable_key
        for alias, raw_stable_key in source_alias_to_stable_key.items()
        for stable_key in [normalize_city_alias_text(raw_stable_key)]
        if normalize_city_alias_text(alias) and stable_key in selected_stable_keys
    }
    alias_to_city_id = {
        alias: normalize_city_alias_text(source_alias_to_city_id.get(alias))
        for alias in alias_to_stable_key
        if normalize_city_alias_text(source_alias_to_city_id.get(alias))
    }

    next_payload = dict(payload)
    next_payload["entries"] = []
    next_payload["geo"] = geo
    next_payload["alias_to_city_id"] = dict(sorted(alias_to_city_id.items()))
    next_payload["alias_to_stable_key"] = dict(sorted(alias_to_stable_key.items()))
    next_payload["entry_count"] = 0
    next_payload["alias_count"] = len(alias_to_stable_key)
    next_payload["ambiguous_alias_count"] = 0
    next_payload["conflict_count"] = 0
    next_payload["conflicts"] = []
    next_payload["ambiguous_aliases_sample"] = []
    next_payload["pages_dist_policy"] = {
        "policy": "reduced_alias_subset",
        "alias_mapping_source": "source_alias_to_stable_key_filtered_by_selected_stable_keys",
        "entry_alias_generation": "disabled",
        "priority_source": "data/world_cities.geojson",
        "stable_key_selection": "world_city_capital_tier_population_priority",
        "stable_key_limit": PAGES_CITY_ALIAS_STABLE_KEY_LIMIT,
        "source_entry_count": len(source_entries),
        "source_alias_count": int(payload.get("alias_count") or 0),
        "source_stable_key_count": len(source_entries_by_stable_key),
        "priority_stable_key_count": len(priority),
        "selected_stable_key_count": len(selected_stable_keys),
    }
    return next_payload


def update_pages_city_aliases_manifest_record(city_aliases_payload: dict, city_aliases_path: Path) -> None:
    manifest_path = APP_DIST_ROOT / "data" / "manifest.json"
    if not manifest_path.is_file():
        raise FileNotFoundError("Pages city aliases subset requires dist app/data/manifest.json")
    manifest_payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    outputs = manifest_payload.get("outputs")
    if not isinstance(outputs, dict):
        raise ValueError("Pages dist data manifest is missing outputs")
    manifest_record = dict(outputs.get("city_aliases.json") or {})
    city_aliases_bytes = city_aliases_path.read_bytes()
    manifest_record["size_bytes"] = len(city_aliases_bytes)
    manifest_record["sha256"] = hashlib.sha256(city_aliases_bytes).hexdigest()
    manifest_record["entry_count"] = int(city_aliases_payload.get("entry_count") or 0)
    manifest_record["alias_count"] = int(city_aliases_payload.get("alias_count") or 0)
    manifest_record["ambiguous_alias_count"] = int(city_aliases_payload.get("ambiguous_alias_count") or 0)
    manifest_record["conflict_count"] = int(city_aliases_payload.get("conflict_count") or 0)
    pages_policy = city_aliases_payload.get("pages_dist_policy")
    if isinstance(pages_policy, dict):
        manifest_record["pages_dist_policy"] = dict(pages_policy)
    outputs["city_aliases.json"] = manifest_record
    write_text_lf(manifest_path, json.dumps(manifest_payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n")


def write_pages_city_aliases_subset() -> None:
    source_path = ROOT / "data" / "city_aliases.json"
    destination_path = APP_DIST_ROOT / "data" / "city_aliases.json"
    if not source_path.is_file():
        return
    payload = json.loads(source_path.read_text(encoding="utf-8"))
    city_aliases_payload = build_pages_city_aliases_subset(payload)
    destination_path.parent.mkdir(parents=True, exist_ok=True)
    write_text_lf(
        destination_path,
        json.dumps(city_aliases_payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
    )
    update_pages_city_aliases_manifest_record(city_aliases_payload, destination_path)


def copy_hgo_identity_runtime_data() -> None:
    source_dir = ROOT / "data" / "hgo_catalogs"
    destination_dir = APP_DIST_ROOT / "data" / "hgo_catalogs"
    for file_name in HGO_IDENTITY_RUNTIME_FILES:
        copy_relative_file(f"data/hgo_catalogs/{file_name}")
    for tier in HGO_IDENTITY_FLAG_TIERS:
        copy_tree_contents(source_dir / "flags_png" / tier, destination_dir / "flags_png" / tier)
    write_pages_hgo_png_manifest(
        source_dir / "hgo_flags.png_manifest.json",
        destination_dir / "hgo_flags.png_manifest.json",
    )


def copy_hgo_runtime_data() -> None:
    for file_name in PAGES_HGO_RUNTIME_FILES:
        copy_relative_file(f"data/hgo_runtime/{file_name}")


def copy_runtime_data() -> None:
    for relative_file in DATA_RUNTIME_FILES:
        if relative_file == "city_aliases.json":
            write_pages_city_aliases_subset()
        else:
            copy_relative_file(f"data/{relative_file}")
    for directory_name in DATA_RUNTIME_DIRS:
        copy_tree_contents(ROOT / "data" / directory_name, APP_DIST_ROOT / "data" / directory_name)
    copy_hgo_identity_runtime_data()
    copy_hgo_runtime_data()
    copy_scenario_runtime_data()
    copy_transport_runtime_data()
    prune_dist_data_manifest_to_published_files()
    prune_dist_runtime_asset_registry_to_published_files()
    validate_dist_scenario_startup_urls()


def write_nojekyll() -> None:
    write_text_lf(DIST_ROOT / ".nojekyll", "")


def iter_dist_files() -> list[Path]:
    return sorted(
        (
            path
            for path in DIST_ROOT.rglob("*")
            if path.is_file() and not should_skip_disposable_dist_path(path.relative_to(DIST_ROOT))
        ),
        key=lambda path: path.relative_to(DIST_ROOT).as_posix(),
    )


def dist_record_source_kind(relative_path: Path) -> str:
    for generated_dir in GENERATED_IGNORED_DIST_DIRS:
        try:
            relative_path.relative_to(generated_dir)
            return "generated_ignored"
        except ValueError:
            continue
    return "dist"


def _published_dist_paths(dist_root: Path) -> set[str]:
    return {
        path.relative_to(dist_root).as_posix()
        for path in dist_root.rglob("*")
        if path.is_file() and not should_skip_disposable_dist_path(path.relative_to(dist_root))
    }


def _resolve_dist_reference(
    source_path: str,
    reference: str,
    available_paths: set[str],
    *,
    allow_document_relative: bool = False,
) -> tuple[bool, str | None]:
    value = str(reference or "").strip().split("#", 1)[0].split("?", 1)[0]
    if not value or value.startswith(("#", "//", "data:", "blob:", "http://", "https://")):
        return False, None

    if value.startswith("/"):
        absolute_value = value.lstrip("/")
        if absolute_value.startswith(("js/", "vendor/", "data/", "css/")):
            normalized = f"app/{absolute_value}"
        else:
            normalized = absolute_value
    elif value.startswith(("./", "../")) or allow_document_relative:
        normalized = posixpath.normpath(posixpath.join(posixpath.dirname(source_path), value))
    else:
        return False, None

    candidates = [normalized]
    if not posixpath.splitext(normalized)[1]:
        candidates.extend((f"{normalized}.js", f"{normalized}/index.js"))
    for candidate in candidates:
        if candidate in available_paths:
            return True, candidate
    return True, candidates[0]


def _scan_js_string(source_text: str, start: int) -> int:
    quote = source_text[start]
    index = start + 1
    while index < len(source_text):
        if source_text[index] == "\\":
            index += 2
            continue
        if source_text[index] == quote:
            return index + 1
        index += 1
    return len(source_text)


def _scan_dynamic_import_call_end(source_text: str, open_paren_index: int) -> int | None:
    depth = 1
    index = open_paren_index + 1
    while index < len(source_text):
        character = source_text[index]
        next_character = source_text[index + 1] if index + 1 < len(source_text) else ""
        if character in {'"', "'", "`"}:
            index = _scan_js_string(source_text, index)
            continue
        if character == "/" and next_character == "/":
            newline_index = source_text.find("\n", index + 2)
            index = len(source_text) if newline_index < 0 else newline_index + 1
            continue
        if character == "/" and next_character == "*":
            comment_end = source_text.find("*/", index + 2)
            index = len(source_text) if comment_end < 0 else comment_end + 2
            continue
        if character == "(":
            depth += 1
        elif character == ")":
            depth -= 1
            if depth == 0:
                return index
        index += 1
    return None


def _iter_dynamic_import_expressions(source_text: str) -> list[dict[str, int | str]]:
    expressions: list[dict[str, int | str]] = []
    index = 0
    while index < len(source_text):
        character = source_text[index]
        next_character = source_text[index + 1] if index + 1 < len(source_text) else ""
        if character in {'"', "'", "`"}:
            index = _scan_js_string(source_text, index)
            continue
        if character == "/" and next_character == "/":
            newline_index = source_text.find("\n", index + 2)
            index = len(source_text) if newline_index < 0 else newline_index + 1
            continue
        if character == "/" and next_character == "*":
            comment_end = source_text.find("*/", index + 2)
            index = len(source_text) if comment_end < 0 else comment_end + 2
            continue
        if source_text.startswith("import", index):
            previous_character = source_text[index - 1] if index else ""
            after_identifier = index + len("import")
            following_character = source_text[after_identifier] if after_identifier < len(source_text) else ""
            if (
                (not previous_character or not (previous_character.isalnum() or previous_character in "_$"))
                and (not following_character or not (following_character.isalnum() or following_character in "_$"))
            ):
                open_paren_index = after_identifier
                while open_paren_index < len(source_text) and source_text[open_paren_index].isspace():
                    open_paren_index += 1
                if open_paren_index < len(source_text) and source_text[open_paren_index] == "(":
                    close_paren_index = _scan_dynamic_import_call_end(source_text, open_paren_index)
                    if close_paren_index is not None:
                        expression = source_text[open_paren_index + 1:close_paren_index].strip()
                        expressions.append(
                            {
                                "expression_index": len(expressions),
                                "expression": expression,
                                "line": source_text.count("\n", 0, index) + 1,
                                "column": index - source_text.rfind("\n", 0, index),
                            }
                        )
                        index = close_paren_index + 1
                        continue
        index += 1
    return expressions


def _literal_dynamic_import_reference(expression: str) -> str | None:
    value = str(expression or "").strip()
    if len(value) < 2 or value[0] not in {'"', "'"} or value[-1] != value[0]:
        return None
    body = value[1:-1]
    if "\\" in body or value[0] in body:
        return None
    return body


def _extract_module_reference_groups(source_text: str) -> dict[str, object]:
    static_references = {
        match.group("reference")
        for pattern in (MODULE_STATIC_IMPORT_RE, MODULE_REEXPORT_RE)
        for match in pattern.finditer(source_text)
    }
    dynamic_references: set[str] = set()
    dynamic_import_expressions = []
    for expression_record in _iter_dynamic_import_expressions(source_text):
        expression = str(expression_record["expression"])
        literal_reference = _literal_dynamic_import_reference(expression)
        if literal_reference is None:
            dynamic_import_expressions.append(
                {
                    **expression_record,
                    "kind": "unresolved_dynamic_expression",
                    "resolution": "unresolved",
                }
            )
        else:
            dynamic_references.add(literal_reference)
            dynamic_import_expressions.append(
                {
                    **expression_record,
                    "kind": "literal_dynamic_import",
                    "reference": literal_reference,
                    "resolution": "literal",
                }
            )
    resource_references = {
        match.group("reference")
        for match in MODULE_URL_REFERENCE_RE.finditer(source_text)
    }
    return {
        "static_imports": sorted(static_references),
        "dynamic_imports": sorted(dynamic_references),
        "resource_references": sorted(resource_references),
        "dynamic_import_expressions": dynamic_import_expressions,
    }


def _normalize_dynamic_import_registry(
    declarations: tuple[dict, ...] | list[dict],
) -> tuple[dict[tuple[str, int], dict], list[dict]]:
    declarations_by_key: dict[tuple[str, int], dict] = {}
    normalized_declarations = []
    for declaration in declarations:
        normalized = {
            "id": str(declaration.get("id") or "").strip(),
            "source": str(declaration.get("source") or "").replace("\\", "/").strip(),
            "expression_index": int(declaration.get("expression_index") or 0),
            "expected_expression": str(declaration.get("expected_expression") or "").strip(),
            "targets": sorted({
                str(target or "").replace("\\", "/").strip()
                for target in declaration.get("targets", ())
                if str(target or "").strip()
            }),
        }
        if not normalized["id"] or not normalized["source"] or not normalized["expected_expression"]:
            raise ValueError(f"Invalid Pages dynamic import registry declaration: {normalized}")
        key = (str(normalized["source"]), int(normalized["expression_index"]))
        if key in declarations_by_key:
            raise ValueError(f"Duplicate Pages dynamic import registry key: {key[0]}#{key[1]}")
        declarations_by_key[key] = normalized
        normalized_declarations.append(normalized)
    normalized_declarations.sort(key=lambda item: (item["source"], item["expression_index"], item["id"]))
    return declarations_by_key, normalized_declarations


def _walk_module_graph(
    roots: set[str],
    nodes_by_path: dict[str, dict],
    *,
    include_dynamic: bool,
) -> set[str]:
    visited: set[str] = set()
    pending = sorted(roots, reverse=True)
    while pending:
        module_path = pending.pop()
        if module_path in visited or module_path not in nodes_by_path:
            continue
        visited.add(module_path)
        node = nodes_by_path[module_path]
        edge_names = ["static_imports", "resource_references"]
        if include_dynamic:
            edge_names.append("dynamic_imports")
        targets = {
            target
            for edge_name in edge_names
            for target in node[edge_name]
            if target.endswith(".js") and target in nodes_by_path
        }
        pending.extend(sorted(targets - visited, reverse=True))
    return visited


def build_pages_module_graph(
    *,
    dist_root: Path | None = None,
    available_paths: set[str] | None = None,
    dynamic_import_registry: tuple[dict, ...] | list[dict] | None = None,
) -> dict:
    selected_dist_root = (dist_root or DIST_ROOT).resolve()
    selected_available_paths = (
        set(available_paths)
        if available_paths is not None
        else _published_dist_paths(selected_dist_root)
    )
    module_paths = sorted(
        path
        for path in selected_available_paths
        if path.startswith("app/js/") and path.endswith(".js")
    )
    nodes_by_path: dict[str, dict] = {}
    unresolved_references: list[dict[str, object]] = []
    registry_by_key, registry_declarations = _normalize_dynamic_import_registry(
        PAGES_DYNAMIC_IMPORT_REGISTRY if dynamic_import_registry is None else dynamic_import_registry
    )
    consumed_registry_keys: set[tuple[str, int]] = set()
    registry_resolutions: list[dict] = []

    for module_path in module_paths:
        source_text = (selected_dist_root / module_path).read_text(encoding="utf-8")
        reference_groups = _extract_module_reference_groups(source_text)
        dynamic_import_expressions = list(reference_groups.pop("dynamic_import_expressions"))
        resolved_groups: dict[str, list[str]] = {}
        for edge_name, references in reference_groups.items():
            resolved_targets: set[str] = set()
            for reference in references:
                is_local, target = _resolve_dist_reference(module_path, reference, selected_available_paths)
                if not is_local:
                    continue
                if target not in selected_available_paths:
                    unresolved_references.append(
                        {
                            "source": module_path,
                            "kind": edge_name,
                            "reference": reference,
                            "resolved_path": str(target or ""),
                        }
                    )
                    continue
                resolved_targets.add(str(target))
            resolved_groups[edge_name] = sorted(resolved_targets)

        for expression_record in dynamic_import_expressions:
            if expression_record["kind"] != "unresolved_dynamic_expression":
                continue
            expression_index = int(expression_record["expression_index"])
            registry_key = (module_path, expression_index)
            declaration = registry_by_key.get(registry_key)
            if declaration is None:
                unresolved_references.append(
                    {
                        "source": module_path,
                        "kind": "unresolved_dynamic_expression",
                        "expression_index": expression_index,
                        "expression": expression_record["expression"],
                        "line": expression_record["line"],
                        "column": expression_record["column"],
                        "reason": "no-declarative-registry-entry",
                    }
                )
                continue
            consumed_registry_keys.add(registry_key)
            expected_expression = str(declaration["expected_expression"])
            if str(expression_record["expression"]) != expected_expression:
                expression_record["resolution"] = "registry-expression-mismatch"
                expression_record["registry_id"] = declaration["id"]
                unresolved_references.append(
                    {
                        "source": module_path,
                        "kind": "unresolved_dynamic_expression",
                        "expression_index": expression_index,
                        "expression": expression_record["expression"],
                        "expected_expression": expected_expression,
                        "line": expression_record["line"],
                        "column": expression_record["column"],
                        "registry_id": declaration["id"],
                        "reason": "registry-expression-mismatch",
                    }
                )
                continue
            missing_targets = [
                target
                for target in declaration["targets"]
                if target not in selected_available_paths
            ]
            for target in missing_targets:
                unresolved_references.append(
                    {
                        "source": module_path,
                        "kind": "dynamic_import_registry_target",
                        "reference": target,
                        "resolved_path": target,
                        "registry_id": declaration["id"],
                    }
                )
            declared_targets = [
                target
                for target in declaration["targets"]
                if target in selected_available_paths
            ]
            resolved_groups["dynamic_imports"] = sorted(
                set(resolved_groups["dynamic_imports"]) | set(declared_targets)
            )
            expression_record.update(
                {
                    "resolution": "declarative-registry" if not missing_targets else "registry-target-missing",
                    "registry_id": declaration["id"],
                    "declared_targets": list(declaration["targets"]),
                }
            )
            registry_resolutions.append(
                {
                    "id": declaration["id"],
                    "source": module_path,
                    "expression_index": expression_index,
                    "expression": expression_record["expression"],
                    "targets": list(declaration["targets"]),
                    "status": "resolved" if not missing_targets else "target-missing",
                }
            )
        nodes_by_path[module_path] = {
            "path": module_path,
            **resolved_groups,
            "dynamic_import_expressions": dynamic_import_expressions,
        }

    for registry_key, declaration in registry_by_key.items():
        if registry_key in consumed_registry_keys:
            continue
        unresolved_references.append(
            {
                "source": declaration["source"],
                "kind": "dynamic_import_registry_entry_unmatched",
                "expression_index": declaration["expression_index"],
                "expression": declaration["expected_expression"],
                "registry_id": declaration["id"],
                "reason": "source-or-expression-missing",
            }
        )

    initial_module_paths = _walk_module_graph(
        {PAGES_MODULE_ENTRYPOINT},
        nodes_by_path,
        include_dynamic=False,
    )
    deferred_roots = {
        target
        for module_path in initial_module_paths
        for target in nodes_by_path[module_path]["dynamic_imports"]
        if target.endswith(".js")
    }
    deferred_module_paths = _walk_module_graph(
        deferred_roots,
        nodes_by_path,
        include_dynamic=True,
    ) - initial_module_paths
    untraversed_module_paths = set(module_paths) - initial_module_paths - deferred_module_paths

    entrypoints = []
    entrypoint_reference_paths: dict[str, set[str]] = {}
    for entrypoint_id, html_path in PAGES_HTML_ENTRYPOINTS:
        resolved_references: set[str] = set()
        html_file = selected_dist_root / html_path
        if not html_file.is_file():
            unresolved_references.append(
                {
                    "source": html_path,
                    "kind": "entrypoint",
                    "reference": html_path,
                    "resolved_path": html_path,
                }
            )
        else:
            html_text = html_file.read_text(encoding="utf-8")
            for match in HTML_RESOURCE_REFERENCE_RE.finditer(html_text):
                reference = match.group("reference")
                is_local, target = _resolve_dist_reference(
                    html_path,
                    reference,
                    selected_available_paths,
                    allow_document_relative=True,
                )
                if not is_local:
                    continue
                if target not in selected_available_paths:
                    unresolved_references.append(
                        {
                            "source": html_path,
                            "kind": "html-resource",
                            "reference": reference,
                            "resolved_path": str(target or ""),
                        }
                    )
                    continue
                resolved_references.add(str(target))
        entrypoint_reference_paths[entrypoint_id] = resolved_references
        entrypoints.append(
            {
                "id": entrypoint_id,
                "path": html_path,
                "resource_references": sorted(resolved_references),
            }
        )

    initial_resource_paths = set(entrypoint_reference_paths.get("editor", set()))
    for module_path in initial_module_paths:
        node = nodes_by_path[module_path]
        initial_resource_paths.update(
            target
            for edge_name in ("static_imports", "resource_references")
            for target in node[edge_name]
            if target not in nodes_by_path
        )
    deferred_resource_paths: set[str] = set()
    for module_path in deferred_module_paths:
        node = nodes_by_path[module_path]
        deferred_resource_paths.update(
            target
            for edge_name in ("static_imports", "dynamic_imports", "resource_references")
            for target in node[edge_name]
            if target not in nodes_by_path
        )
    deferred_resource_paths -= initial_resource_paths

    graph_nodes = []
    for module_path in module_paths:
        if module_path in initial_module_paths:
            load_phase = "initial"
        elif module_path in deferred_module_paths:
            load_phase = "deferred-runtime"
        else:
            load_phase = "untraversed"
        graph_nodes.append({**nodes_by_path[module_path], "load_phase": load_phase})

    unresolved_references.sort(
        key=lambda record: (
            str(record.get("source") or ""),
            str(record.get("kind") or ""),
            int(record.get("expression_index") or 0),
            str(record.get("reference") or ""),
            str(record.get("expression") or ""),
            str(record.get("resolved_path") or ""),
        )
    )
    registry_resolutions.sort(key=lambda item: (item["source"], item["expression_index"], item["id"]))
    return {
        "schema_version": PAGES_REACHABILITY_SCHEMA_VERSION,
        "module_entrypoint": PAGES_MODULE_ENTRYPOINT,
        "entrypoints": entrypoints,
        "summary": {
            "module_count": len(module_paths),
            "initial_module_count": len(initial_module_paths),
            "deferred_module_count": len(deferred_module_paths),
            "untraversed_module_count": len(untraversed_module_paths),
            "initial_resource_count": len(initial_resource_paths),
            "deferred_resource_count": len(deferred_resource_paths),
            "unresolved_dynamic_expression_count": sum(
                1
                for record in unresolved_references
                if record.get("kind") == "unresolved_dynamic_expression"
            ),
            "registry_resolved_dynamic_expression_count": sum(
                1 for record in registry_resolutions if record["status"] == "resolved"
            ),
        },
        "initial_resource_paths": sorted(initial_resource_paths),
        "deferred_resource_paths": sorted(deferred_resource_paths),
        "nodes": graph_nodes,
        "dynamic_import_registry": {
            "declarations": registry_declarations,
            "resolutions": registry_resolutions,
        },
        "unresolved_references": unresolved_references,
    }


def _match_product_inventory_rule(path: str) -> dict | None:
    matches = []
    for rule in PAGES_PRODUCT_INVENTORY_RULES:
        if path in rule.get("paths", ()) or any(path.startswith(prefix) for prefix in rule.get("prefixes", ())):
            matches.append(rule)
    if len(matches) > 1:
        rule_ids = ", ".join(str(rule["id"]) for rule in matches)
        raise ValueError(f"Ambiguous Pages product inventory rules for {path}: {rule_ids}")
    return matches[0] if matches else None


def _reachability_owner(path: str, category: str) -> str:
    if not path.startswith("app/"):
        return "landing"
    if path.startswith("app/data/scenarios/") or path.startswith("app/data/scenario-rules/"):
        return "scenario-runtime"
    if path.startswith("app/data/hgo_"):
        return "hgo-scenario-runtime"
    if path.startswith("app/data/transport_layers/"):
        return "transport-workbench"
    if path.startswith("app/data/thematic_layers/"):
        return "thematic-workbench"
    if path.startswith("app/data/unit_counter_libraries/"):
        return "unit-counter-workbench"
    if path.startswith("app/data/"):
        return "editor-data-runtime"
    if path.startswith("app/vendor/"):
        return "editor-vendor"
    if category == "scenario-specific":
        return "scenario-runtime"
    if category == "export-only":
        return "export-capability"
    if category == "developer-only":
        return "development-tools"
    if category == "startup-deferred-runtime":
        return "editor-deferred-features"
    return "editor-startup"


def _build_graph_reachability_index(graph: dict) -> dict[str, set[str]]:
    nodes_by_path = {node["path"]: node for node in graph.get("nodes", [])}
    return {
        "entrypoint_paths": {str(entrypoint.get("path") or "") for entrypoint in graph.get("entrypoints", [])},
        "entrypoint_references": {
            reference
            for entrypoint in graph.get("entrypoints", [])
            for reference in entrypoint.get("resource_references", [])
        },
        "initial_modules": {
            path_value
            for path_value, node in nodes_by_path.items()
            if node.get("load_phase") == "initial"
        },
        "deferred_modules": {
            path_value
            for path_value, node in nodes_by_path.items()
            if node.get("load_phase") == "deferred-runtime"
        },
        "initial_resources": set(graph.get("initial_resource_paths", [])),
        "deferred_resources": set(graph.get("deferred_resource_paths", [])),
    }


def _path_reachability_evidence(path: str, reachability_index: dict[str, set[str]]) -> tuple[str, str]:
    if path in reachability_index["entrypoint_paths"]:
        return "startup-critical", "html-entrypoint"
    if path in reachability_index["initial_modules"]:
        return "startup-critical", "startup-module-graph"
    if path in reachability_index["initial_resources"]:
        return "startup-critical", "startup-resource-graph"
    if path in reachability_index["entrypoint_references"]:
        return "startup-critical", "entrypoint-reference"
    if path in reachability_index["deferred_modules"]:
        return "startup-deferred-runtime", "deferred-module-graph"
    if path in reachability_index["deferred_resources"]:
        return "startup-deferred-runtime", "deferred-resource-graph"
    return "untraversed", "untraversed"


def _classify_pages_dist_path(
    path: str,
    graph: dict,
    *,
    reachability_index: dict[str, set[str]] | None = None,
) -> tuple[str, str, str]:
    selected_index = reachability_index or _build_graph_reachability_index(graph)
    reachability_status, reachability_basis = _path_reachability_evidence(path, selected_index)
    product_rule = _match_product_inventory_rule(path)

    if product_rule and product_rule.get("override_reachability"):
        category = str(product_rule["category"])
        return category, str(product_rule["owner"]), f"product-registry:{product_rule['id']}"
    if reachability_status != "untraversed":
        return reachability_status, _reachability_owner(path, reachability_status), reachability_basis
    if product_rule:
        category = str(product_rule["category"])
        return category, str(product_rule["owner"]), f"product-registry:{product_rule['id']}"
    return "unknown", "unclassified", "no-declarative-owner"


def _path_directory_prefixes(path: str) -> list[str]:
    parts = path.split("/")
    return ["/".join(parts[:index]) + "/" for index in range(1, len(parts))]


def _compact_ownership_group_paths(
    group_paths: set[str],
    *,
    all_paths: set[str],
    size_by_path: dict[str, int],
) -> tuple[list[dict], list[dict]]:
    descendants_by_prefix: dict[str, set[str]] = {}
    for path in all_paths:
        for prefix in _path_directory_prefixes(path):
            descendants_by_prefix.setdefault(prefix, set()).add(path)
    candidates = [
        (prefix, descendants)
        for prefix, descendants in descendants_by_prefix.items()
        if len(descendants) >= 2 and descendants <= group_paths
    ]
    candidates.sort(key=lambda item: (item[0].count("/"), len(item[0]), item[0]))
    covered_paths: set[str] = set()
    prefix_records = []
    for prefix, descendants in candidates:
        uncovered_descendants = descendants - covered_paths
        if len(uncovered_descendants) < 2:
            continue
        prefix_records.append(
            {
                "prefix": prefix,
                "file_count": len(uncovered_descendants),
                "size_bytes": sum(size_by_path[path] for path in uncovered_descendants),
            }
        )
        covered_paths.update(uncovered_descendants)
    exception_records = [
        {"path": path, "size_bytes": size_by_path[path]}
        for path in sorted(group_paths - covered_paths)
    ]
    return prefix_records, exception_records


def _product_registry_summary(classifications: list[dict], size_by_path: dict[str, int]) -> list[dict]:
    summaries = []
    for rule in PAGES_PRODUCT_INVENTORY_RULES:
        basis = f"product-registry:{rule['id']}"
        matched_paths = sorted(
            record["path"]
            for record in classifications
            if record["basis"] == basis
        )
        summaries.append(
            {
                "id": rule["id"],
                "category": rule["category"],
                "owner": rule["owner"],
                "match": {
                    "prefixes": list(rule.get("prefixes", ())),
                    "path_exceptions": list(rule.get("paths", ())),
                },
                "file_count": len(matched_paths),
                "size_bytes": sum(size_by_path[path] for path in matched_paths),
            }
        )
    return summaries


def build_pages_reachability_inventory(records: list[dict], *, module_graph: dict) -> dict:
    ordered_records = sorted((dict(record) for record in records), key=lambda record: str(record.get("path") or ""))
    paths = [str(record.get("path") or "") for record in ordered_records]
    if len(set(paths)) != len(paths):
        raise ValueError("Pages dist inventory contains duplicate paths")
    size_by_path = {
        str(record.get("path") or ""): int(record.get("size_bytes") or 0)
        for record in ordered_records
    }
    all_paths = set(size_by_path)
    reachability_index = _build_graph_reachability_index(module_graph)
    category_totals = {
        category: {"id": category, "file_count": 0, "size_bytes": 0}
        for category in STARTUP_REACHABILITY_CATEGORIES
    }
    classifications = []
    ownership_groups: dict[tuple[str, str, str], dict] = {}
    traversed_file_count = 0

    for record in ordered_records:
        path = str(record.get("path") or "")
        size_bytes = int(record.get("size_bytes") or 0)
        reachability_status, reachability_basis = _path_reachability_evidence(path, reachability_index)
        category, owner, basis = _classify_pages_dist_path(
            path,
            module_graph,
            reachability_index=reachability_index,
        )
        classification = {
            "path": path,
            "category": category,
            "owner": owner,
            "basis": basis,
            "reachability_status": reachability_status,
            "reachability_basis": reachability_basis,
        }
        classifications.append(classification)
        category_totals[category]["file_count"] += 1
        category_totals[category]["size_bytes"] += size_bytes
        if reachability_status != "untraversed":
            traversed_file_count += 1
        group_key = (category, owner, basis)
        group = ownership_groups.setdefault(
            group_key,
            {
                "category": category,
                "owner": owner,
                "basis": basis,
                "file_count": 0,
                "size_bytes": 0,
                "_paths": set(),
            },
        )
        group["file_count"] += 1
        group["size_bytes"] += size_bytes
        group["_paths"].add(path)

    category_order = {category: index for index, category in enumerate(STARTUP_REACHABILITY_CATEGORIES)}
    ordered_groups = sorted(
        ownership_groups.values(),
        key=lambda group: (
            category_order[group["category"]],
            group["owner"],
            group["basis"],
        ),
    )
    for group in ordered_groups:
        path_prefixes, path_exceptions = _compact_ownership_group_paths(
            set(group.pop("_paths")),
            all_paths=all_paths,
            size_by_path=size_by_path,
        )
        group["path_prefixes"] = path_prefixes
        group["path_exceptions"] = path_exceptions

    initial_module_paths = set(reachability_index["initial_modules"])
    editor_entrypoint_references = {
        reference
        for entrypoint in module_graph.get("entrypoints", [])
        if entrypoint.get("id") == "editor"
        for reference in entrypoint.get("resource_references", [])
    }
    initial_script_paths = initial_module_paths | {
        path for path in editor_entrypoint_references if path.endswith(".js")
    }
    initial_graph_paths = (
        initial_module_paths
        | set(module_graph.get("initial_resource_paths", []))
        | {"app/index.html"}
    )
    deferred_graph_paths = {
        node["path"]
        for node in module_graph.get("nodes", [])
        if node.get("load_phase") == "deferred-runtime"
    } | set(module_graph.get("deferred_resource_paths", []))
    category_by_path = {record["path"]: record["category"] for record in classifications}
    graph_copy = {
        **module_graph,
        "byte_measurement": "published-uncompressed-file-bytes",
        "summary": {
            **module_graph.get("summary", {}),
            "initial_script_count": len(initial_script_paths),
            "initial_script_bytes": sum(size_by_path.get(path, 0) for path in initial_script_paths),
            "initial_graph_file_count": len(initial_graph_paths),
            "initial_graph_bytes": sum(size_by_path.get(path, 0) for path in initial_graph_paths),
            "deferred_graph_file_count": len(deferred_graph_paths),
            "deferred_graph_bytes": sum(size_by_path.get(path, 0) for path in deferred_graph_paths),
            "untraversed_dist_file_count": len(ordered_records) - traversed_file_count,
            "untraversed_dist_bytes": sum(
                size_by_path[record["path"]]
                for record in classifications
                if record["reachability_status"] == "untraversed"
            ),
        },
        "nodes": [
            {
                **node,
                "product_category": category_by_path.get(node["path"], "unknown"),
            }
            for node in module_graph.get("nodes", [])
        ],
    }
    unresolved_references = graph_copy.get("unresolved_references", [])
    unknown_paths = sorted(
        record["path"]
        for record in classifications
        if record["category"] == "unknown"
    )
    reachability_status = "complete" if not unresolved_references else "incomplete"
    product_inventory_status = "complete" if not unknown_paths else "incomplete"
    return {
        "schema_version": PAGES_REACHABILITY_SCHEMA_VERSION,
        "generator": "tools/build_pages_dist.py::build_pages_reachability_inventory",
        "category_ids": list(STARTUP_REACHABILITY_CATEGORIES),
        "classification_axes": {
            "product_category": "exclusive product inventory classification",
            "reachability_status": "startup-critical, startup-deferred-runtime, or untraversed evidence",
        },
        "admission": {
            "status": "complete"
            if reachability_status == "complete" and product_inventory_status == "complete"
            else "incomplete",
            "blocking_unknown_file_count": len(unknown_paths),
            "blocking_unresolved_reference_count": len(unresolved_references),
        },
        "reachability_evidence": {
            "status": reachability_status,
            "total_file_count": len(ordered_records),
            "traversed_file_count": traversed_file_count,
            "untraversed_file_count": len(ordered_records) - traversed_file_count,
            "unresolved_reference_count": len(unresolved_references),
            "unresolved_dynamic_expression_count": sum(
                1
                for record in unresolved_references
                if record.get("kind") == "unresolved_dynamic_expression"
            ),
            "registry_resolved_dynamic_expression_count": graph_copy.get("summary", {}).get(
                "registry_resolved_dynamic_expression_count",
                0,
            ),
        },
        "product_inventory": {
            "status": product_inventory_status,
            "total_file_count": len(ordered_records),
            "classified_file_count": len(ordered_records) - len(unknown_paths),
            "unknown_file_count": len(unknown_paths),
            "unknown_paths": unknown_paths,
            "registry_rules": _product_registry_summary(classifications, size_by_path),
        },
        "categories": [category_totals[category] for category in STARTUP_REACHABILITY_CATEGORIES],
        "ownership_groups": ordered_groups,
        "module_graph": graph_copy,
    }


def get_dist_file_records() -> tuple[list[dict[str, int | str]], int]:
    for attempt in range(5):
        records: list[dict[str, int | str]] = []
        total_bytes = 0
        try:
            for path in iter_dist_files():
                size_bytes = path.stat().st_size
                total_bytes += size_bytes
                records.append(
                    {
                        "path": path.relative_to(DIST_ROOT).as_posix(),
                        "size_bytes": size_bytes,
                        "source_kind": dist_record_source_kind(path.relative_to(DIST_ROOT)),
                    }
                )
            return records, total_bytes
        except FileNotFoundError:
            if attempt >= 4:
                raise
            time.sleep(0.15 * (attempt + 1))
    raise RuntimeError("Pages dist manifest scan did not complete")


def get_largest_dist_files(records: list[dict[str, int | str]]) -> list[dict[str, int | str]]:
    sorted_records = sorted(records, key=lambda record: (-int(record["size_bytes"]), str(record["path"])))
    return [dict(record) for record in sorted_records[:DIST_MANIFEST_LARGEST_FILE_LIMIT]]


def get_top_level_directory_records(records: list[dict[str, int | str]]) -> list[dict[str, int | str]]:
    totals: dict[str, dict[str, int | str]] = {}
    for record in records:
        record_path = str(record["path"])
        top_level_path = record_path.split("/", 1)[0]
        total = totals.setdefault(top_level_path, {"path": top_level_path, "size_bytes": 0, "file_count": 0})
        total["size_bytes"] = int(total["size_bytes"]) + int(record["size_bytes"])
        total["file_count"] = int(total["file_count"]) + 1
    return sorted(totals.values(), key=lambda record: (-int(record["size_bytes"]), str(record["path"])))


def get_dist_size_gate(total_bytes: int) -> dict[str, int | str]:
    over_by_bytes = max(total_bytes - MAX_PAGES_DIST_BYTES, 0)
    warning_over_by_bytes = max(total_bytes - PAGES_DIST_WARNING_BYTES, 0)
    return {
        "status": "over_limit" if over_by_bytes else "within_limit",
        "over_by_bytes": over_by_bytes,
        "warning_status": "over_warning" if warning_over_by_bytes else "within_warning",
        "warning_bytes": PAGES_DIST_WARNING_BYTES,
        "warning_over_by_bytes": warning_over_by_bytes,
    }


def validate_required_dist_files() -> None:
    missing_files = [relative_path for relative_path in REQUIRED_DIST_FILES if not (DIST_ROOT / relative_path).is_file()]
    if missing_files:
        missing_text = ", ".join(missing_files)
        raise FileNotFoundError(f"Pages dist is missing required file(s): {missing_text}")


def build_dist_manifest_payload(
    records: list[dict[str, int | str]],
    total_bytes: int,
    *,
    module_graph: dict,
) -> dict:
    ordered_records = sorted((dict(record) for record in records), key=lambda record: str(record["path"]))
    reachability_inventory = build_pages_reachability_inventory(ordered_records, module_graph=module_graph)
    admission = reachability_inventory["admission"]
    if admission["status"] != "complete":
        raise ValueError(
            "Pages dist inventory admission is incomplete: "
            f"unknown_files={admission['blocking_unknown_file_count']}, "
            f"unresolved_references={admission['blocking_unresolved_reference_count']}"
        )
    return {
        "schema_version": PAGES_DIST_MANIFEST_SCHEMA_VERSION,
        "total_bytes": total_bytes,
        "max_allowed_bytes": MAX_PAGES_DIST_BYTES,
        "size_gate": get_dist_size_gate(total_bytes),
        "required_files": list(REQUIRED_DIST_FILES),
        "largest_files": get_largest_dist_files(ordered_records),
        "top_level_directories": get_top_level_directory_records(ordered_records),
        "reachability_inventory": reachability_inventory,
        "files": ordered_records,
    }


def write_dist_manifest() -> int:
    DIST_MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    last_manifest_text = ""
    module_graph = build_pages_module_graph()
    # manifest 会记录自己；首次写入会改变自身大小，所以要迭代到文本稳定。
    for _ in range(20):
        records, total_bytes = get_dist_file_records()
        payload = build_dist_manifest_payload(records, total_bytes, module_graph=module_graph)
        manifest_text = json.dumps(payload, indent=2, sort_keys=True) + "\n"
        if manifest_text == last_manifest_text:
            break
        write_text_lf(DIST_MANIFEST_PATH, manifest_text)
        last_manifest_text = manifest_text
    else:
        raise RuntimeError("Pages dist manifest did not stabilize after 20 iterations")
    return total_bytes


def enforce_dist_size(total_bytes: int) -> None:
    if total_bytes > MAX_PAGES_DIST_BYTES:
        total_mib = total_bytes / (1024 * 1024)
        limit_mib = MAX_PAGES_DIST_BYTES / (1024 * 1024)
        over_by_mib = (total_bytes - MAX_PAGES_DIST_BYTES) / (1024 * 1024)
        raise SystemExit(
            f"Pages dist size gate failed: {total_mib:.2f} MiB exceeds {limit_mib:.2f} MiB "
            f"by {over_by_mib:.2f} MiB. "
            "Review dist/pages-dist-manifest.json largest_files and top_level_directories before publishing."
        )


def main() -> None:
    landing_entry = resolve_landing_entry_path(root=ROOT)
    editor_entry = resolve_editor_entry_path(root=ROOT)

    # Landing assets are committed delivery inputs here. Regenerate them with
    # the dedicated landing asset scripts before running this dist copier.
    reset_dist()
    build_landing_dist(landing_entry)
    build_editor_dist(editor_entry)
    copy_runtime_data()
    write_nojekyll()
    validate_required_dist_files()
    normalize_dist_text_files_lf()
    total_bytes = write_dist_manifest()
    enforce_dist_size(total_bytes)

    print(f"[build_pages_dist] landing source: {repo_display_path(landing_entry, root=ROOT)}")
    print(f"[build_pages_dist] editor source: {repo_display_path(editor_entry, root=ROOT)}")
    print(f"[build_pages_dist] output: {DIST_ROOT}")
    print(f"[build_pages_dist] manifest: {repo_display_path(DIST_MANIFEST_PATH, root=ROOT)}")
    print(f"[build_pages_dist] total size: {total_bytes / (1024 * 1024):.2f} MiB")


if __name__ == "__main__":
    main()
