#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from map_builder.transport_country_real_source_contracts import (  # noqa: E402
    COUNTRY_SOURCE_SPECS,
    DEFAULT_SOURCE_CACHE_ROOT,
    TARGET_COUNTRY_PACK_IDS,
    build_source_recipe,
    check_country_sources,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fail-fast source gate for transport country packs. It refuses to build from global clip substitutes."
    )
    parser.add_argument("--pack", action="append", choices=TARGET_COUNTRY_PACK_IDS, help="Pack id to check. Repeatable.")
    parser.add_argument("--source-cache-root", default=str(DEFAULT_SOURCE_CACHE_ROOT), help="Root source cache directory.")
    parser.add_argument("--report-path", default="", help="Optional JSON report output path.")
    parser.add_argument(
        "--write-recipes",
        action="store_true",
        help="Write source_recipe.manual.json into .runtime/source-cache/transport/<pack_id>/ for local audit only.",
    )
    return parser.parse_args()


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    source_cache_root = Path(args.source_cache_root)
    pack_ids = args.pack or list(COUNTRY_SOURCE_SPECS)
    reports = []
    for pack_id in pack_ids:
        spec = COUNTRY_SOURCE_SPECS[pack_id]
        report = check_country_sources(spec, source_cache_root=source_cache_root)
        reports.append(report)
        if args.write_recipes:
            recipe_path = source_cache_root / spec.cache_subdir / "source_recipe.manual.json"
            write_json(recipe_path, build_source_recipe(spec, report))

    payload = {"source_cache_root": source_cache_root.as_posix(), "reports": reports}
    if args.report_path:
        write_json(Path(args.report_path), payload)

    missing_reports = [report for report in reports if report.get("missing_sources")]
    if missing_reports:
        print("[transport-country-sources] MISSING")
        for report in missing_reports:
            print(f"- {report['pack_id']}: {report['source_cache_dir']}")
            for source in report["missing_sources"]:
                print(f"  - {source['id']}: expected {source['expected_path']}")
                print(f"    url: {source['url']}")
        return 1

    print("[transport-country-sources] OK")
    for report in reports:
        print(f"- {report['pack_id']}: {len(report['sources'])} source files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
