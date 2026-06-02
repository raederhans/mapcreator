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
    parser.add_argument("--provenance-output", default="")
    return parser.parse_args()


def dump_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def split_flag_stem(stem: str) -> tuple[str, str]:
    if "_" not in stem:
        return stem.upper(), "base"
    tag, variant = stem.split("_", 1)
    return tag.upper(), variant


def build_flag_index(root: Path) -> dict[str, object]:
    tags: dict[str, dict[str, object]] = {}
    tier_counts: Counter[str] = Counter()
    variant_counts: Counter[str] = Counter()
    for tier, rel_dir in SIZE_TIERS.items():
        source_dir = root / rel_dir
        if not source_dir.exists():
            continue
        for path in sorted(source_dir.glob("*.tga")):
            tag, variant = split_flag_stem(path.stem)
            tag_entry = tags.setdefault(tag, {"base": {}, "variants": {}})
            rel_path = rel_dir / path.name
            record = {
                "source_path": rel_path.as_posix(),
                "byte_length": path.stat().st_size,
            }
            if variant == "base":
                tag_entry["base"][tier] = record
            else:
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
            "png_generation": "deferred",
            "redistribution_review": "required_before_committing_converted_images",
            "notes": [
                "This index references local HGO TGA source paths only.",
                "No converted flag images are generated or committed in this phase."
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


def build_catalog_index(flags_payload: dict[str, object], *, place_names_path: Path, flags_path: Path) -> dict[str, object]:
    place_names_exists = place_names_path.exists()
    place_names_count = 0
    if place_names_exists:
        place_names_payload = json.loads(place_names_path.read_text(encoding="utf-8"))
        place_names_count = int((place_names_payload.get("counts") or {}).get("entries") or 0)
    return {
        "schema_version": 1,
        "catalog_id": "hgo_tier_a",
        "source_id": SOURCE_ID,
        "generated_at_utc": flags_payload["generated_at_utc"],
        "source": flags_payload["source"],
        "assets": {
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
        },
        "scope": {
            "included": ["country palette", "place names", "flag source index"],
            "excluded": ["projected geometry", "scenario owners", "converted flag image redistribution"],
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
    catalog_payload = build_catalog_index(payload, place_names_path=Path(args.place_names), flags_path=output_path)
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
