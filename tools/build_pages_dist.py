from __future__ import annotations

import gzip
import json
import shutil
import sys
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
# TNO source-backed water refinements push the already-allowlisted runtime
# scenario payload above the previous 1020 MiB cap.
MAX_PAGES_DIST_BYTES = 1050 * 1024 * 1024
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
    "unit_counter_libraries",
)
HGO_IDENTITY_RUNTIME_FILES = (
    "index.json",
    "hgo_place_names.json",
    "hgo_identity_aliases.json",
)
HGO_IDENTITY_FLAG_TIERS = ("small", "medium")
SCENARIO_EXCLUDED_DIR_NAMES = {"derived"}
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
DISPOSABLE_DIST_NAMES = {"__pycache__"}
DISPOSABLE_DIST_SUFFIXES = {".pyc", ".pyo"}
LF_NORMALIZED_APP_SUFFIXES = {".js", ".json"}


def write_text_lf(path: Path, text: str) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)


def should_normalize_dist_text_file_lf(path: Path) -> bool:
    try:
        relative_path = path.resolve().relative_to(DIST_ROOT.resolve())
    except ValueError:
        return path.suffix.lower() in LF_NORMALIZED_APP_SUFFIXES
    if relative_path.as_posix() == "app/index.html":
        return True
    return (
        len(relative_path.parts) >= 2
        and relative_path.parts[0] == "app"
        and path.suffix.lower() in LF_NORMALIZED_APP_SUFFIXES
    )


def normalize_dist_text_file_lf(path: Path) -> None:
    if not should_normalize_dist_text_file_lf(path):
        return
    data = path.read_bytes()
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
        shutil.rmtree(DIST_ROOT)
    APP_DIST_ROOT.mkdir(parents=True, exist_ok=True)


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
                for scenario in scenarios:
                    if isinstance(scenario, dict):
                        scenario.pop("audit_url", None)
            payload.pop("audit_url", None)
            write_text_lf(index_path, json.dumps(payload, indent=2, sort_keys=True) + "\n")

    for manifest_path in scenarios_dir.glob("*/manifest.json"):
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
        if isinstance(payload, dict) and strip_unpublished_manifest_urls(payload):
            write_text_lf(manifest_path, json.dumps(payload, indent=2, sort_keys=True) + "\n")

    for bundle_path in scenarios_dir.glob("*/startup.bundle.*.json"):
        payload = json.loads(bundle_path.read_text(encoding="utf-8"))
        manifest_subset = payload.get("manifest_subset") if isinstance(payload, dict) else None
        if not isinstance(manifest_subset, dict):
            continue
        if strip_unpublished_manifest_urls(manifest_subset):
            bundle_bytes = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            bundle_path.write_bytes(bundle_bytes)
            gzip_path = bundle_path.with_suffix(bundle_path.suffix + ".gz")
            if gzip_path.is_file():
                gzip_path.write_bytes(gzip.compress(bundle_bytes, mtime=0))


def _dist_path_for_app_url(url: str) -> Path:
    value = str(url or "").strip()
    path = (APP_DIST_ROOT / value).resolve()
    try:
        path.relative_to(APP_DIST_ROOT.resolve())
    except ValueError as exc:
        raise ValueError(f"Pages dist URL must stay under app dist root: {value}") from exc
    return path


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


def copy_runtime_data() -> None:
    for relative_file in DATA_RUNTIME_FILES:
        copy_relative_file(f"data/{relative_file}")
    for directory_name in DATA_RUNTIME_DIRS:
        copy_tree_contents(ROOT / "data" / directory_name, APP_DIST_ROOT / "data" / directory_name)
    copy_hgo_identity_runtime_data()
    copy_scenario_runtime_data()
    copy_transport_runtime_data()
    validate_dist_scenario_startup_urls()


def write_nojekyll() -> None:
    write_text_lf(DIST_ROOT / ".nojekyll", "")


def iter_dist_files() -> list[Path]:
    return sorted(
        path
        for path in DIST_ROOT.rglob("*")
        if path.is_file() and not should_skip_disposable_dist_path(path.relative_to(DIST_ROOT))
    )


def get_dist_file_records() -> tuple[list[dict[str, int | str]], int]:
    records: list[dict[str, int | str]] = []
    total_bytes = 0
    for path in iter_dist_files():
        size_bytes = path.stat().st_size
        total_bytes += size_bytes
        records.append(
            {
                "path": path.relative_to(DIST_ROOT).as_posix(),
                "size_bytes": size_bytes,
            }
        )
    return records, total_bytes


def validate_required_dist_files() -> None:
    missing_files = [relative_path for relative_path in REQUIRED_DIST_FILES if not (DIST_ROOT / relative_path).is_file()]
    if missing_files:
        missing_text = ", ".join(missing_files)
        raise FileNotFoundError(f"Pages dist is missing required file(s): {missing_text}")


def write_dist_manifest() -> int:
    DIST_MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    last_manifest_text = ""
    for _ in range(5):
        records, total_bytes = get_dist_file_records()
        payload = {
            "schema_version": 1,
            "total_bytes": total_bytes,
            "max_allowed_bytes": MAX_PAGES_DIST_BYTES,
            "required_files": list(REQUIRED_DIST_FILES),
            "files": records,
        }
        manifest_text = json.dumps(payload, indent=2, sort_keys=True) + "\n"
        if manifest_text == last_manifest_text:
            break
        write_text_lf(DIST_MANIFEST_PATH, manifest_text)
        last_manifest_text = manifest_text
    _records, total_bytes = get_dist_file_records()
    return total_bytes


def enforce_dist_size(total_bytes: int) -> None:
    if total_bytes > MAX_PAGES_DIST_BYTES:
        total_mib = total_bytes / (1024 * 1024)
        limit_mib = MAX_PAGES_DIST_BYTES / (1024 * 1024)
        raise SystemExit(
            f"Pages dist size gate failed: {total_mib:.2f} MiB exceeds {limit_mib:.2f} MiB. "
            "Update the runtime allowlist before publishing."
        )


def main() -> None:
    landing_entry = resolve_landing_entry_path(root=ROOT)
    editor_entry = resolve_editor_entry_path(root=ROOT)

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
