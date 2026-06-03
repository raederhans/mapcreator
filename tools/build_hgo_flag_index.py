#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


SOURCE_ID = "hgo_mod_2241701657"
SIZE_TIERS = {
    "full": Path("gfx/flags"),
    "medium": Path("gfx/flags/medium"),
    "small": Path("gfx/flags/small"),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build an index of HGO flag source assets without converting images.")
    parser.add_argument("--source-root", required=True, help="Historic Geographical Overhaul source root.")
    parser.add_argument("--output", default="data/hgo_catalogs/hgo_flags.index.json")
    parser.add_argument("--catalog-index-output", default="data/hgo_catalogs/index.json")
    parser.add_argument("--place-names", default="data/hgo_catalogs/hgo_place_names.json")
    parser.add_argument("--png-manifest", default="data/hgo_catalogs/hgo_flags.png_manifest.json")
    parser.add_argument("--provenance-output", default="")
    return parser.parse_args()


def dump_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def iter_tga_files(source_dir: Path) -> list[Path]:
    return sorted(path for path in source_dir.iterdir() if path.is_file() and path.suffix.lower() == ".tga")


def split_flag_stem(stem: str) -> tuple[str, str, str]:
    if "_" not in stem:
        return stem.upper(), "base", "base"
    tag, variant = stem.split("_", 1)
    return tag.upper(), variant.lower(), variant


def build_flag_index(root: Path) -> dict[str, object]:
    tags: dict[str, dict[str, object]] = {}
    tier_counts: Counter[str] = Counter()
    variant_counts: Counter[str] = Counter()
    for tier, rel_dir in SIZE_TIERS.items():
        source_dir = root / rel_dir
        if not source_dir.exists():
            continue
        for path in iter_tga_files(source_dir):
            tag, variant, variant_source = split_flag_stem(path.stem)
            tag_entry = tags.setdefault(tag, {"base": {}, "variants": {}})
            rel_path = rel_dir / path.name
            record = {
                "source_path": rel_path.as_posix(),
                "byte_length": path.stat().st_size,
            }
            if variant == "base":
                tag_entry["base"][tier] = record
            else:
                record["variant_source"] = variant_source
                variants = tag_entry["variants"]
                variants.setdefault(variant, {})[tier] = record
                variant_counts[variant] += 1
            tier_counts[tier] += 1

    tags_with_base = sum(1 for item in tags.values() if item["base"])
    tags_with_variants = sum(1 for item in tags.values() if item["variants"])
    return {
        "schema_version": 1,
        "catalog_id": "hgo_flags_index",
        "source_id": SOURCE_ID,
        "generated_at_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "source": {
            "display_name": "Historic Geographical Overhaul",
            "workshop_id": "2241701657",
            "source_root": "historic geographic overhaul",
        },
        "distribution_policy": {
            "png_generation": "companion_manifest",
            "redistribution_review": "authorized_by_user_confirmation_2026_06_03",
            "notes": [
                "This index keeps local HGO TGA source paths.",
                "Converted PNG assets are described by data/hgo_catalogs/hgo_flags.png_manifest.json."
            ],
        },
        "counts": {
            "files_by_tier": dict(sorted(tier_counts.items())),
            "tags": len(tags),
            "tags_with_base": tags_with_base,
            "tags_with_variants": tags_with_variants,
            "variant_names": len(variant_counts),
        },
        "tags": dict(sorted(tags.items())),
    }


def build_catalog_index(
    flags_payload: dict[str, object],
    *,
    place_names_path: Path,
    flags_path: Path,
    png_manifest_path: Path | None = None,
) -> dict[str, object]:
    place_names_exists = place_names_path.exists()
    place_names_count = 0
    if place_names_exists:
        place_names_payload = json.loads(place_names_path.read_text(encoding="utf-8"))
        place_names_count = int((place_names_payload.get("counts") or {}).get("entries") or 0)
    assets: dict[str, dict[str, object]] = {
        "place_names": {
            "url": place_names_path.as_posix(),
            "role": "hgo_place_names",
            "available": place_names_exists,
            "entry_count": place_names_count,
        },
        "flags_index": {
            "url": flags_path.as_posix(),
            "role": "hgo_flags_index",
            "available": True,
            "tag_count": int((flags_payload.get("counts") or {}).get("tags") or 0),
        },
    }
    included = ["country palette", "place names", "flag source index"]
    excluded = ["projected geometry", "scenario owners"]
    if png_manifest_path is not None:
        png_manifest_exists = png_manifest_path.exists()
        png_file_count = 0
        total_png_bytes = 0
        if png_manifest_exists:
            png_manifest_payload = json.loads(png_manifest_path.read_text(encoding="utf-8"))
            png_manifest_counts = png_manifest_payload.get("counts") or {}
            png_file_count = int(png_manifest_counts.get("files") or 0)
            total_png_bytes = int(png_manifest_counts.get("total_png_bytes") or 0)
        assets["flags_png_manifest"] = {
            "url": png_manifest_path.as_posix(),
            "role": "hgo_flags_png_manifest",
            "available": png_manifest_exists,
            "file_count": png_file_count,
            "total_png_bytes": total_png_bytes,
        }
        included.append("converted flag PNG manifest")
    return {
        "schema_version": 1,
        "catalog_id": "hgo_tier_a",
        "source_id": SOURCE_ID,
        "generated_at_utc": flags_payload["generated_at_utc"],
        "source": flags_payload["source"],
        "assets": assets,
        "scope": {
            "included": included,
            "excluded": excluded,
        },
    }


def build_provenance(output_path: Path, payload: dict[str, object], validator_name: str) -> dict[str, object]:
    data = output_path.read_bytes()
    return {
        "filename": output_path.name,
        "configured_source_url": "https://steamcommunity.com/sharedfiles/filedetails/?id=2241701657",
        "resolved_source_url": None,
        "fallback_candidates": [],
        "sha256": hashlib.sha256(data).hexdigest(),
        "content_length": len(data),
        "captured_at_utc": payload["generated_at_utc"],
        "capture_mode": "local_hgo_catalog_build",
        "validator_name": validator_name,
    }


def main() -> None:
    args = parse_args()
    root = Path(args.source_root)
    if not root.exists():
        raise SystemExit(f"HGO source root not found: {root}")
    output_path = Path(args.output)
    payload = build_flag_index(root)
    dump_json(output_path, payload)
    provenance_path = Path(args.provenance_output) if args.provenance_output else output_path.with_suffix(".provenance.json")
    dump_json(provenance_path, build_provenance(output_path, payload, "hgo_flags_index_v1"))

    catalog_index_path = Path(args.catalog_index_output)
    png_manifest_path = Path(args.png_manifest)
    catalog_payload = build_catalog_index(
        payload,
        place_names_path=Path(args.place_names),
        flags_path=output_path,
        png_manifest_path=png_manifest_path if png_manifest_path.exists() else None,
    )
    dump_json(catalog_index_path, catalog_payload)
    dump_json(
        catalog_index_path.with_suffix(".provenance.json"),
        build_provenance(catalog_index_path, catalog_payload, "hgo_tier_a_catalog_index_v1"),
    )
    print(
        "[HGO Flags] "
        f"tags={payload['counts']['tags']} "
        f"full={payload['counts']['files_by_tier'].get('full', 0)} "
        f"medium={payload['counts']['files_by_tier'].get('medium', 0)} "
        f"small={payload['counts']['files_by_tier'].get('small', 0)} "
        f"output={output_path}"
    )


if __name__ == "__main__":
    main()
