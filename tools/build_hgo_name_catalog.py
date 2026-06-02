#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ast
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


SOURCE_ID = "hgo_mod_2241701657"
LANGUAGE_SUFFIXES = {
    "english": "en",
    "french": "fr",
    "german": "de",
}
COUNTRY_SUFFIX_PRIORITY = [
    "",
    "democratic",
    "fascism",
    "neutrality",
    "communism",
    "monarchism",
]
LOCALISATION_ENTRY_RE = re.compile(r'\s*([A-Za-z0-9_]+):0\s+"((?:[^"\\]|\\.)*)"')


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build the HGO reusable place-name catalog.")
    parser.add_argument("--source-root", required=True, help="Historic Geographical Overhaul source root.")
    parser.add_argument("--output", default="data/hgo_catalogs/hgo_place_names.json")
    parser.add_argument("--provenance-output", default="")
    return parser.parse_args()


def dump_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_entries(path: Path) -> Iterable[tuple[str, str]]:
    if not path.exists():
        return []
    entries: list[tuple[str, str]] = []
    for raw_line in path.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
        match = LOCALISATION_ENTRY_RE.match(raw_line.rstrip())
        if match:
            value = ast.literal_eval(f'"{match.group(2)}"')
            entries.append((match.group(1).strip(), value))
    return entries


def detect_language(path: Path) -> str:
    name = path.name
    for suffix, code in LANGUAGE_SUFFIXES.items():
        if name.endswith(f"_l_{suffix}.yml") or name.endswith(f"_I_{suffix}.yml"):
            return code
    return ""


def country_base_and_rank(key: str) -> tuple[str, int] | None:
    parts = key.split("_")
    base = parts[0].upper()
    if len(base) != 3:
        return None
    if len(parts) == 1:
        return base, 0
    if parts[-1] in {"DEF", "ADJ"}:
        return None
    suffix = "_".join(parts[1:])
    try:
        return base, COUNTRY_SUFFIX_PRIORITY.index(suffix)
    except ValueError:
        return base, len(COUNTRY_SUFFIX_PRIORITY)


def set_name(
    entries: dict[str, dict[str, object]],
    key: str,
    *,
    kind: str,
    language: str,
    value: str,
    source_key: str,
    source_file: Path,
    rank: int = 0,
    ranks: dict[tuple[str, str], int] | None = None,
) -> None:
    item = entries.setdefault(
        key,
        {
            "kind": kind,
            "names": {},
            "source_keys": {},
            "source_files": [],
        },
    )
    names = item["names"]
    source_keys = item["source_keys"]
    source_files = item["source_files"]
    current_rank = ranks.get((key, language), 9999) if ranks is not None else 9999
    if language not in names or rank < current_rank:
        names[language] = value
        source_keys[language] = source_key
        if ranks is not None:
            ranks[(key, language)] = rank
    source_ref = source_file.as_posix()
    if source_ref not in source_files:
        source_files.append(source_ref)


def collect_country_names(root: Path, entries: dict[str, dict[str, object]]) -> None:
    ranks: dict[tuple[str, str], int] = {}
    patterns = [
        "HGO_countries_l_*.yml",
        "replace/countries_l_*.yml",
    ]
    for pattern in patterns:
        for path in sorted((root / "localisation").glob(pattern)):
            language = detect_language(path)
            if language not in {"en", "fr", "de"}:
                continue
            for raw_key, value in read_entries(path):
                base_rank = country_base_and_rank(raw_key)
                if base_rank is None:
                    continue
                base, rank = base_rank
                set_name(
                    entries,
                    base,
                    kind="country",
                    language=language,
                    value=value,
                    source_key=raw_key,
                    source_file=path.relative_to(root),
                    rank=rank,
                    ranks=ranks,
                )


def collect_keyed_names(root: Path, entries: dict[str, dict[str, object]], *, kind: str, patterns: list[str]) -> None:
    for pattern in patterns:
        for path in sorted((root / "localisation").glob(pattern)):
            language = detect_language(path)
            if not language:
                continue
            for raw_key, value in read_entries(path):
                key = raw_key.strip().upper()
                if kind == "state" and not key.startswith("STATE_"):
                    continue
                set_name(
                    entries,
                    key,
                    kind=kind,
                    language=language,
                    value=value,
                    source_key=raw_key,
                    source_file=path.relative_to(root),
                )


def build_catalog(root: Path) -> dict[str, object]:
    entries: dict[str, dict[str, object]] = {}
    collect_country_names(root, entries)
    collect_keyed_names(
        root,
        entries,
        kind="state",
        patterns=[
            "state_names_l_*.yml",
            "rename_states_l_*.yml",
            "replace/HGO_states_names_l_*.yml",
            "replace/state_names_l_*.yml",
        ],
    )
    collect_keyed_names(root, entries, kind="strategic_region", patterns=["strategic_region_names_l_*.yml"])
    collect_keyed_names(root, entries, kind="supply_area", patterns=["supply_area_names_l_*.yml"])

    by_kind = Counter(str(item["kind"]) for item in entries.values())
    by_language: Counter[str] = Counter()
    for item in entries.values():
        by_language.update(item["names"].keys())

    return {
        "schema_version": 1,
        "catalog_id": "hgo_place_names",
        "source_id": SOURCE_ID,
        "generated_at_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "source": {
            "display_name": "Historic Geographical Overhaul",
            "workshop_id": "2241701657",
            "source_root": "historic geographic overhaul",
        },
        "language_policy": {
            "default_language": "en",
            "included_languages": ["en", "fr", "de"],
            "coverage_note": "English is broadest; French and German are partial HGO localisation layers.",
        },
        "counts": {
            "entries": len(entries),
            "by_kind": dict(sorted(by_kind.items())),
            "by_language": dict(sorted(by_language.items())),
        },
        "entries": dict(sorted(entries.items())),
    }


def build_provenance(output_path: Path, payload: dict[str, object]) -> dict[str, object]:
    data = output_path.read_bytes()
    import hashlib

    return {
        "filename": output_path.name,
        "configured_source_url": "https://steamcommunity.com/sharedfiles/filedetails/?id=2241701657",
        "resolved_source_url": None,
        "fallback_candidates": [],
        "sha256": hashlib.sha256(data).hexdigest(),
        "content_length": len(data),
        "captured_at_utc": payload["generated_at_utc"],
        "capture_mode": "local_hgo_catalog_build",
        "validator_name": "hgo_place_names_catalog_v1",
    }


def main() -> None:
    args = parse_args()
    root = Path(args.source_root)
    if not root.exists():
        raise SystemExit(f"HGO source root not found: {root}")
    output_path = Path(args.output)
    payload = build_catalog(root)
    dump_json(output_path, payload)
    provenance_path = Path(args.provenance_output) if args.provenance_output else output_path.with_suffix(".provenance.json")
    dump_json(provenance_path, build_provenance(output_path, payload))
    print(
        "[HGO Names] "
        f"entries={payload['counts']['entries']} "
        f"output={output_path} provenance={provenance_path}"
    )


if __name__ == "__main__":
    main()
