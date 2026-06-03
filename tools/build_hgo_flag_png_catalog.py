#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image


SOURCE_ID = "hgo_mod_2241701657"
SIZE_TIERS = {
    "full": Path("gfx/flags"),
    "medium": Path("gfx/flags/medium"),
    "small": Path("gfx/flags/small"),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert authorized HGO flag TGA files into a sharded PNG catalog.")
    parser.add_argument("--source-root", required=True, help="Historic Geographical Overhaul source root.")
    parser.add_argument("--output-root", default="data/hgo_catalogs/flags_png")
    parser.add_argument("--manifest-output", default="data/hgo_catalogs/hgo_flags.png_manifest.json")
    parser.add_argument("--catalog-index", default="data/hgo_catalogs/index.json")
    parser.add_argument("--source-index", default="data/hgo_catalogs/hgo_flags.index.json")
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


def shard_for_tag(tag: str) -> str:
    shard = "".join(ch for ch in tag.upper() if ch.isalnum())[:2]
    return shard or "misc"


def clear_png_output_root(output_root: Path) -> None:
    if not output_root.exists():
        return
    for path in sorted(output_root.rglob("*"), reverse=True):
        if path.is_file():
            if path.suffix.lower() != ".png":
                raise RuntimeError(f"Refusing to delete non-PNG file in output root: {path}")
            path.unlink()
        elif path.is_dir():
            try:
                path.rmdir()
            except OSError:
                pass


def sha256_path(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def convert_tga_to_png(source_path: Path, output_path: Path) -> tuple[int, int, str]:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source_path) as image:
        converted = image.convert("RGBA")
        converted.save(output_path, "PNG", optimize=True)
        width, height = converted.size
    return width, height, "RGBA"


def build_png_manifest(source_root: Path, output_root: Path, *, manifest_output: Path) -> dict[str, object]:
    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    # PNG catalog 是可分发产物，重建前清空旧 shard，防止已删除旗帜继续留在 Pages delivery 集合里。
    clear_png_output_root(output_root)

    tags: dict[str, dict[str, object]] = {}
    tier_counts: Counter[str] = Counter()
    total_bytes = 0
    largest_file = {"path": "", "byte_length": 0}

    for tier, rel_dir in SIZE_TIERS.items():
        source_dir = source_root / rel_dir
        if not source_dir.exists():
            continue
        for source_path in iter_tga_files(source_dir):
            tag, variant, variant_source = split_flag_stem(source_path.stem)
            # 按 tag 前两位分片，保持单目录文件数可控，也让 manifest 成为唯一的索引入口。
            output_path = output_root / tier / shard_for_tag(tag) / f"{source_path.stem}.png"
            width, height, mode = convert_tga_to_png(source_path, output_path)
            byte_length = output_path.stat().st_size
            total_bytes += byte_length
            if byte_length > int(largest_file["byte_length"]):
                largest_file = {"path": output_path.as_posix(), "byte_length": byte_length}
            rel_source = (rel_dir / source_path.name).as_posix()
            rel_png = output_path.as_posix()
            record = {
                "source_path": rel_source,
                "png_path": rel_png,
                "width": width,
                "height": height,
                "mode": mode,
                "byte_length": byte_length,
                "sha256": sha256_path(output_path),
            }
            tag_entry = tags.setdefault(tag, {"base": {}, "variants": {}})
            if variant == "base":
                tag_entry["base"][tier] = record
            else:
                record["variant_source"] = variant_source
                tag_entry["variants"].setdefault(variant, {})[tier] = record
            tier_counts[tier] += 1

    return {
        "schema_version": 1,
        "catalog_id": "hgo_flags_png_manifest",
        "source_id": SOURCE_ID,
        "generated_at_utc": generated_at,
        "source": {
            "display_name": "Historic Geographical Overhaul",
            "workshop_id": "2241701657",
            "source_root": "historic geographic overhaul",
        },
        "distribution_policy": {
            "png_generation": "authorized_checked_in_catalog",
            "authorization_basis": "user_confirmed_redistribution_authorization_2026_06_03",
            "storage_policy": "checked_in_png_files_sharded_for_pages_delivery",
            "lfs_policy": "not_used_for_pages_delivery",
        },
        "output": {
            "root": output_root.as_posix(),
            "manifest": manifest_output.as_posix(),
            "shard_key": "first_two_alnum_chars_of_tag",
        },
        "counts": {
            "files": sum(tier_counts.values()),
            "files_by_tier": dict(sorted(tier_counts.items())),
            "tags": len(tags),
            "total_png_bytes": total_bytes,
            "largest_png": largest_file,
        },
        "tags": dict(sorted(tags.items())),
    }


def write_provenance(output_path: Path, payload: dict[str, object], *, validator_name: str) -> None:
    data = output_path.read_bytes()
    provenance = {
        "filename": output_path.name,
        "configured_source_url": "https://steamcommunity.com/sharedfiles/filedetails/?id=2241701657",
        "resolved_source_url": None,
        "fallback_candidates": [],
        "sha256": hashlib.sha256(data).hexdigest(),
        "content_length": len(data),
        "captured_at_utc": payload["generated_at_utc"],
        "capture_mode": "local_hgo_flag_png_catalog_build",
        "validator_name": validator_name,
    }
    dump_json(output_path.with_suffix(".provenance.json"), provenance)


def update_catalog_index(catalog_index_path: Path, manifest_payload: dict[str, object], *, manifest_output: Path) -> None:
    payload = json.loads(catalog_index_path.read_text(encoding="utf-8"))
    assets = payload.setdefault("assets", {})
    # 总 catalog 只登记 PNG manifest 的位置和规模，具体图片清单继续由 manifest 自己承载。
    assets["flags_png_manifest"] = {
        "url": manifest_output.as_posix(),
        "role": "hgo_flags_png_manifest",
        "available": True,
        "file_count": int((manifest_payload.get("counts") or {}).get("files") or 0),
        "total_png_bytes": int((manifest_payload.get("counts") or {}).get("total_png_bytes") or 0),
    }
    scope = payload.setdefault("scope", {})
    included = list(scope.get("included") or [])
    if "converted flag PNG manifest" not in included:
        included.append("converted flag PNG manifest")
    scope["included"] = included
    scope["excluded"] = [item for item in list(scope.get("excluded") or []) if item != "converted flag image redistribution"]
    payload["generated_at_utc"] = manifest_payload["generated_at_utc"]
    dump_json(catalog_index_path, payload)
    write_provenance(catalog_index_path, payload, validator_name="hgo_tier_a_catalog_index_v2")


def main() -> None:
    args = parse_args()
    source_root = Path(args.source_root)
    if not source_root.exists():
        raise SystemExit(f"HGO source root not found: {source_root}")
    output_root = Path(args.output_root)
    manifest_output = Path(args.manifest_output)
    payload = build_png_manifest(source_root, output_root, manifest_output=manifest_output)
    dump_json(manifest_output, payload)
    write_provenance(manifest_output, payload, validator_name="hgo_flags_png_manifest_v1")
    catalog_index_path = Path(args.catalog_index)
    if catalog_index_path.exists():
        update_catalog_index(catalog_index_path, payload, manifest_output=manifest_output)
    print(
        "[HGO Flag PNG] "
        f"files={payload['counts']['files']} "
        f"full={payload['counts']['files_by_tier'].get('full', 0)} "
        f"medium={payload['counts']['files_by_tier'].get('medium', 0)} "
        f"small={payload['counts']['files_by_tier'].get('small', 0)} "
        f"bytes={payload['counts']['total_png_bytes']} "
        f"manifest={manifest_output}"
    )


if __name__ == "__main__":
    main()
