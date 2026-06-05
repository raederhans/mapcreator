#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scenario_builder.hoi4.parser import parse_state_file as parse_hoi4_state_file


SOURCE_ID = "hgo_mod_2241701657"
RUNTIME_ID = "hgo_raster_runtime_seed"
DEFAULT_OUTPUT = Path(".runtime/hgo_runtime/seed.json")
DEFAULT_SMOKE_REPORT = Path(".runtime/reports/generated/hgo_runtime_seed_smoke.json")
DEFAULT_COUNTRY_COLOR_SOURCES = (
    Path("data/palettes/hgo.palette.json"),
    Path("data/palettes/hoi4_vanilla.palette.json"),
)
DEFAULT_COUNTRY_COLOR_SOURCE = DEFAULT_COUNTRY_COLOR_SOURCES[0]
REQUIRED_SOURCE_PATHS = (
    Path("map/definition.csv"),
    Path("map/provinces.bmp"),
    Path("history/states"),
    Path("common/country_tags"),
    Path("common/countries"),
)

ASSIGNMENT_VALUE_RE = r'"([^"]+)"|([A-Za-z0-9_.:-]+)'
COUNTRY_TAG_RE = re.compile(r'^\s*([A-Z0-9]{2,5})\s*=\s*"([^"]+)"')
COLOR_RE = re.compile(
    r"""
    \bcolor\s*=\s*
    (?:rgb\s*)?
    \{\s*
    (?P<red>-?\d+(?:\.\d+)?)\s+
    (?P<green>-?\d+(?:\.\d+)?)\s+
    (?P<blue>-?\d+(?:\.\d+)?)
    \s*\}
    """,
    re.IGNORECASE | re.VERBOSE,
)
HEX_COLOR_RE = re.compile(r"^#?([0-9A-Fa-f]{6})$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build an independent HGO runtime seed.")
    parser.add_argument(
        "--hgo-root",
        "--source-root",
        dest="hgo_root",
        default=os.environ.get("HGO_ROOT", ""),
        help="HGO source root. Defaults to HGO_ROOT.",
    )
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Runtime seed output path.")
    parser.add_argument(
        "--country-color-source",
        action="append",
        default=None,
        help=(
            "Optional palette JSON used as an explicit source for owner/controller country colors. "
            "Can be passed multiple times; pass an empty value to skip color-source packs."
        ),
    )
    parser.add_argument(
        "--smoke-report",
        default=str(DEFAULT_SMOKE_REPORT),
        help="Smoke report output path. Pass an empty value to skip report writing.",
    )
    parser.add_argument("--as-of-date", default="", help="Optional HOI4 history date, for example 1939.1.1.")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def dump_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n")


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def resolve_country_color_source_arg(value: str) -> Path | None:
    if not value:
        return None
    path = Path(value)
    if path.is_absolute():
        return path
    cwd_path = Path.cwd() / path
    if cwd_path.exists():
        return cwd_path
    return REPO_ROOT / path


def validate_source_root(root: Path) -> None:
    # HGO seed 必须从完整 mod 根目录生成；少任何一个核心目录都直接失败，
    # 避免用半截 source 生成一个看似可用的 runtime 索引。
    missing_paths = [rel_path.as_posix() for rel_path in REQUIRED_SOURCE_PATHS if not (root / rel_path).exists()]
    if missing_paths:
        raise FileNotFoundError(f"HGO source root is missing required paths: {', '.join(missing_paths)}")


def strip_hoi4_comments(text: str) -> str:
    # HOI4 文本里 # 只在引号外表示注释；国家名和路径字符串里的 # 要保留。
    lines: list[str] = []
    for raw_line in text.splitlines():
        in_quote = False
        escaped = False
        chars: list[str] = []
        for char in raw_line:
            if char == "\\" and not escaped:
                escaped = True
                chars.append(char)
                continue
            if char == '"' and not escaped:
                in_quote = not in_quote
            if char == "#" and not in_quote:
                break
            chars.append(char)
            escaped = False
        lines.append("".join(chars))
    return "\n".join(lines)


def find_assignment(text: str, key: str) -> str:
    match = re.search(rf"(?m)^[ \t]*{re.escape(key)}[ \t]*=[ \t]*(?:{ASSIGNMENT_VALUE_RE})", text)
    if not match:
        return ""
    return str(match.group(1) or match.group(2) or "").strip()


def find_brace_block(text: str, key: str) -> str:
    match = re.search(rf"\b{re.escape(key)}\s*=\s*\{{", text)
    if not match:
        return ""
    open_index = text.find("{", match.start())
    depth = 0
    for index in range(open_index, len(text)):
        char = text[index]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return text[open_index + 1:index]
    return ""


def parse_int_list(text: str) -> list[int]:
    return [int(value) for value in re.findall(r"\b\d+\b", text or "")]


def rgb_to_key(rgb: Iterable[int]) -> int:
    red, green, blue = list(rgb)
    return (int(red) << 16) | (int(green) << 8) | int(blue)


def rgb_to_hex(rgb: Iterable[int]) -> str:
    return "#{:02X}{:02X}{:02X}".format(*[max(0, min(255, int(value))) for value in rgb])


def parse_hex_color(value: object) -> tuple[list[int], str]:
    match = HEX_COLOR_RE.match(str(value or "").strip())
    if not match:
        return [], ""
    color_hex = f"#{match.group(1).upper()}"
    return [int(color_hex[index:index + 2], 16) for index in (1, 3, 5)], color_hex


def parse_definition_csv(path: Path) -> dict[int, dict[str, object]]:
    if not path.exists():
        raise FileNotFoundError(f"HGO definition.csv not found: {path}")
    provinces: dict[int, dict[str, object]] = {}
    province_by_rgb_key: dict[int, int] = {}
    with path.open("r", encoding="utf-8-sig", errors="ignore", newline="") as handle:
        reader = csv.reader(handle, delimiter=";")
        for row in reader:
            if len(row) < 5 or not row[0].strip().isdigit():
                continue
            try:
                province_id = int(row[0])
                rgb = [int(row[1]), int(row[2]), int(row[3])]
            except ValueError:
                continue
            if province_id in provinces:
                raise ValueError(f"Duplicate province id in definition.csv: {province_id}")
            rgb_key = rgb_to_key(rgb)
            existing_province_id = province_by_rgb_key.get(rgb_key)
            if existing_province_id is not None:
                raise ValueError(
                    "Duplicate province RGB in definition.csv: "
                    f"{rgb_to_hex(rgb)} maps to provinces {existing_province_id} and {province_id}"
                )
            province_by_rgb_key[rgb_key] = province_id
            province_type = str(row[4] or "").strip().lower()
            terrain = str(row[6] or "").strip().lower() if len(row) > 6 else ""
            continent = int(row[7]) if len(row) > 7 and str(row[7]).strip().isdigit() else None
            provinces[province_id] = {
                "id": province_id,
                "rgb": rgb,
                "rgb_key": rgb_key,
                "rgb_hex": rgb_to_hex(rgb),
                "type": province_type,
                "terrain": terrain,
                "continent": continent,
            }
    return dict(sorted(provinces.items()))


def parse_state_file(path: Path, root: Path, *, as_of_date: str | None = None) -> dict[str, object] | None:
    text = strip_hoi4_comments(path.read_text(encoding="utf-8-sig", errors="ignore"))
    state_id_text = find_assignment(text, "id")
    if not state_id_text.isdigit():
        return None
    hoi4_state = parse_hoi4_state_file(path, as_of_date=as_of_date or None)
    province_ids = parse_int_list(find_brace_block(text, "provinces"))
    if hoi4_state is None:
        if province_ids:
            raise ValueError(f"HGO state {state_id_text} has provinces but no owner")
        return None
    state_id = int(state_id_text)
    name_key = find_assignment(text, "name")
    return {
        "id": state_id,
        "name_key": name_key,
        "owner": hoi4_state.owner_tag,
        "controller": hoi4_state.controller_tag,
        "core_tags": list(hoi4_state.core_tags),
        "category": hoi4_state.state_category,
        "province_ids": list(hoi4_state.province_ids),
        "province_count": len(hoi4_state.province_ids),
        "source_path": path.relative_to(root).as_posix(),
    }


def load_states(root: Path, *, as_of_date: str | None = None) -> list[dict[str, object]]:
    states_dir = root / "history" / "states"
    if not states_dir.exists():
        raise FileNotFoundError(f"HGO states folder not found: {states_dir}")
    states: list[dict[str, object]] = []
    seen_state_ids: set[int] = set()
    for path in sorted(states_dir.glob("*.txt")):
        parsed = parse_state_file(path, root, as_of_date=as_of_date)
        if not parsed:
            continue
        state_id = int(parsed["id"])
        if state_id in seen_state_ids:
            raise ValueError(f"Duplicate state id in HGO history/states: {state_id}")
        if parsed.get("province_ids") and not parsed.get("owner"):
            raise ValueError(f"HGO state {state_id} has provinces but no owner")
        seen_state_ids.add(state_id)
        states.append(parsed)
    return sorted(states, key=lambda item: (int(item["id"]), str(item["source_path"])))


def parse_country_tag_files(root: Path) -> dict[str, str]:
    country_tags_dir = root / "common" / "country_tags"
    entries: dict[str, str] = {}
    if not country_tags_dir.exists():
        raise FileNotFoundError(f"HGO country_tags folder not found: {country_tags_dir}")
    for path in sorted(country_tags_dir.glob("*.txt")):
        for raw_line in path.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
            line = strip_hoi4_comments(raw_line).strip()
            match = COUNTRY_TAG_RE.match(line)
            if not match:
                continue
            entries[match.group(1).upper()] = match.group(2).replace("\\", "/")
    return entries


def parse_country_color(path: Path) -> tuple[list[int], str]:
    if not path.exists():
        return [], ""
    text = strip_hoi4_comments(path.read_text(encoding="utf-8-sig", errors="ignore"))
    match = COLOR_RE.search(text)
    if not match:
        return [], ""
    rgb = [
        max(0, min(255, int(round(float(match.group("red")))))),
        max(0, min(255, int(round(float(match.group("green")))))),
        max(0, min(255, int(round(float(match.group("blue")))))),
    ]
    return rgb, rgb_to_hex(rgb)


def country_color_source_label(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return str(resolved)


def load_country_color_source(path: Path | None) -> tuple[dict[str, dict[str, object]], dict[str, object]]:
    if path is None:
        return {}, {}
    resolved = path.resolve()
    if not resolved.exists():
        raise FileNotFoundError(f"HGO country color source not found: {resolved}")
    payload = json.loads(resolved.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or not isinstance(payload.get("entries"), dict):
        raise ValueError(f"HGO country color source must contain an entries object: {resolved}")

    preferred_field = str(payload.get("preferred_runtime_color_field") or "map_hex")
    color_fields = list(dict.fromkeys([preferred_field, "map_hex", "color", "ui_hex", "country_file_hex"]))
    entries: dict[str, dict[str, object]] = {}
    for raw_tag, raw_entry in sorted(payload["entries"].items()):
        if not isinstance(raw_entry, dict):
            continue
        tag = str(raw_tag).upper()
        for field in color_fields:
            rgb, color_hex = parse_hex_color(raw_entry.get(field))
            if not color_hex:
                continue
            entries[tag] = {
                "tag": tag,
                "color_rgb": rgb,
                "color_hex": color_hex,
                "field": field,
                "source_path": country_color_source_label(resolved),
                "palette_id": str(payload.get("palette_id") or ""),
            }
            break

    return entries, {
        "path": country_color_source_label(resolved),
        "palette_id": str(payload.get("palette_id") or ""),
        "preferred_runtime_color_field": preferred_field,
        "available_color_count": len(entries),
    }


def load_country_color_sources(
    paths: Iterable[Path],
) -> tuple[dict[str, dict[str, object]], list[dict[str, object]]]:
    combined_entries: dict[str, dict[str, object]] = {}
    summaries: list[dict[str, object]] = []
    for path in paths:
        entries, summary = load_country_color_source(path)
        if summary:
            summaries.append(summary)
        for tag, entry in entries.items():
            combined_entries.setdefault(tag, entry)
    return combined_entries, summaries


def country_path_for_ref(root: Path, ref: str) -> Path:
    normalized = ref.replace("\\", "/").lstrip("/")
    if normalized.startswith("common/"):
        return root / normalized
    return root / "common" / normalized


def load_countries(
    root: Path,
    states: list[dict[str, object]],
    country_color_entries: dict[str, dict[str, object]] | None = None,
) -> dict[str, dict[str, object]]:
    country_color_entries = country_color_entries or {}
    state_counts = Counter(str(state.get("owner") or "").upper() for state in states if state.get("owner"))
    province_counts: Counter[str] = Counter()
    used_owner_controller_tags = sorted(
        {
            str(state.get(key) or "").upper()
            for state in states
            for key in ("owner", "controller")
            if state.get(key)
        }
    )
    for state in states:
        owner = str(state.get("owner") or "").upper()
        if owner:
            province_counts[owner] += int(state.get("province_count") or 0)

    countries: dict[str, dict[str, object]] = {}
    for tag, ref in sorted(parse_country_tag_files(root).items()):
        country_path = country_path_for_ref(root, ref)
        rgb, color_hex = parse_country_color(country_path)
        source_path = country_path.relative_to(root).as_posix() if country_path.exists() else ""
        color_source = "country_file" if color_hex else ""
        if not color_hex and country_color_entries.get(tag):
            source_entry = country_color_entries[tag]
            rgb = list(source_entry["color_rgb"])
            color_hex = str(source_entry["color_hex"])
            color_source = f"palette_pack:{source_entry['palette_id']}:{source_entry['field']}"
        countries[tag] = {
            "tag": tag,
            "definition_path": ref,
            "source_path": source_path,
            "color_rgb": rgb,
            "color_hex": color_hex,
            "color_source": color_source,
            "state_count": int(state_counts.get(tag, 0)),
            "province_count": int(province_counts.get(tag, 0)),
        }
        if color_source.startswith("palette_pack:"):
            countries[tag]["country_color_source_path"] = country_color_entries[tag]["source_path"]

    for tag in used_owner_controller_tags:
        if tag in countries or tag not in country_color_entries:
            continue
        source_entry = country_color_entries[tag]
        countries[tag] = {
            "tag": tag,
            "definition_path": "",
            "source_path": "",
            "color_rgb": list(source_entry["color_rgb"]),
            "color_hex": str(source_entry["color_hex"]),
            "color_source": f"palette_pack:{source_entry['palette_id']}:{source_entry['field']}",
            "country_color_source_path": source_entry["source_path"],
            "state_count": int(state_counts.get(tag, 0)),
            "province_count": int(province_counts.get(tag, 0)),
        }
    return countries


def validate_country_color_integrity(
    states: list[dict[str, object]],
    countries: dict[str, dict[str, object]],
) -> dict[str, object]:
    used_tags = sorted(
        {
            str(state.get(key) or "").upper()
            for state in states
            for key in ("owner", "controller")
            if state.get(key)
        }
    )
    missing_color_tags = [
        tag
        for tag in used_tags
        if not countries.get(tag) or not countries[tag].get("color_hex")
    ]
    if missing_color_tags:
        raise ValueError(
            "HGO state owner/controller tags require country color definitions: "
            + ", ".join(missing_color_tags[:20])
        )
    return {"missing_owner_color_tags": missing_color_tags}


def build_province_to_state_index(
    provinces: dict[int, dict[str, object]],
    states: list[dict[str, object]],
) -> tuple[dict[str, int], dict[str, object]]:
    # builder 阶段先把完整性问题暴露出来：未知 province 或一省多州都会让
    # 浏览器 runtime 无法给像素命中稳定归属，因此这里选择硬失败。
    province_to_state: dict[str, int] = {}
    missing_definition_province_ids: set[int] = set()
    duplicate_refs: list[dict[str, int]] = []

    for state in states:
        state_id = int(state["id"])
        for province_id in [int(value) for value in state.get("province_ids", [])]:
            if province_id not in provinces:
                missing_definition_province_ids.add(province_id)
            key = str(province_id)
            previous_state_id = province_to_state.get(key)
            if previous_state_id is not None and previous_state_id != state_id:
                duplicate_refs.append(
                    {
                        "province_id": province_id,
                        "first_state_id": previous_state_id,
                        "second_state_id": state_id,
                    }
                )
                continue
            province_to_state[key] = state_id

    integrity = {
        "missing_definition_province_ids": sorted(missing_definition_province_ids),
        "duplicate_state_province_refs": duplicate_refs,
    }
    if missing_definition_province_ids:
        missing = ", ".join(str(value) for value in sorted(missing_definition_province_ids)[:20])
        raise ValueError(f"HGO states reference unknown province ids from definition.csv: {missing}")
    if duplicate_refs:
        first = duplicate_refs[0]
        raise ValueError(
            "HGO states assign one province to multiple states: "
            f"province {first['province_id']} in states {first['first_state_id']} and {first['second_state_id']}"
        )
    return dict(sorted(province_to_state.items(), key=lambda item: int(item[0]))), integrity


def summarize_payload(
    provinces: dict[int, dict[str, object]],
    states: list[dict[str, object]],
    countries: dict[str, dict[str, object]],
    province_to_state: dict[str, int],
    integrity: dict[str, object],
) -> dict[str, int]:
    return {
        "province_count": len(provinces),
        "land_province_count": sum(1 for province in provinces.values() if province.get("type") == "land"),
        "state_count": len(states),
        "state_province_ref_count": sum(int(state.get("province_count") or 0) for state in states),
        "mapped_province_count": len(province_to_state),
        "country_count": len(countries),
        "country_color_count": sum(1 for country in countries.values() if country.get("color_hex")),
        "missing_definition_province_count": len(integrity["missing_definition_province_ids"]),
        "duplicate_state_province_ref_count": len(integrity["duplicate_state_province_refs"]),
        "missing_owner_color_count": len(integrity["missing_owner_color_tags"]),
    }


def build_runtime_seed(
    root: Path,
    *,
    country_color_source: Path | None = None,
    country_color_sources: Iterable[Path] | None = None,
    generated_at_utc: str | None = None,
    as_of_date: str | None = None,
) -> dict[str, object]:
    root = root.resolve()
    validate_source_root(root)
    # 输出 seed 保留四个并列真源：definition province、history state、
    # country tag/color、province_to_state。前端索引只消费这些稳定产物。
    provinces = parse_definition_csv(root / "map" / "definition.csv")
    states = load_states(root, as_of_date=as_of_date)
    resolved_country_color_sources = list(country_color_sources or [])
    if country_color_source is not None:
        resolved_country_color_sources.insert(0, country_color_source)
    country_color_entries, country_color_source_summaries = load_country_color_sources(resolved_country_color_sources)
    countries = load_countries(root, states, country_color_entries)
    province_to_state, integrity = build_province_to_state_index(provinces, states)
    integrity.update(validate_country_color_integrity(states, countries))
    summary = summarize_payload(provinces, states, countries, province_to_state, integrity)

    return {
        "schema_version": 1,
        "runtime_id": RUNTIME_ID,
        "source_id": SOURCE_ID,
        "generated_at_utc": generated_at_utc or utc_now(),
        "source": {
            "display_name": "Historic Geographical Overhaul",
            "workshop_id": "2241701657",
            "root_name": root.name,
            "as_of_date": as_of_date or "",
            "required_paths": [
                "map/definition.csv",
                "map/provinces.bmp",
                "history/states",
                "common/country_tags",
                "common/countries",
            ],
            "country_color_source": country_color_source_summaries[0] if country_color_source_summaries else {},
            "country_color_sources": country_color_source_summaries,
        },
        "summary": summary,
        "provinces": {str(key): value for key, value in provinces.items()},
        "states": states,
        "countries": countries,
        "province_to_state": province_to_state,
        "integrity": integrity,
    }


def describe_required_source_paths(root: Path) -> dict[str, dict[str, object]]:
    described: dict[str, dict[str, object]] = {}
    for rel_path in REQUIRED_SOURCE_PATHS:
        path = root / rel_path
        entry = {
            "exists": path.exists(),
            "kind": "directory" if path.is_dir() else "file" if path.is_file() else "",
        }
        if path.is_file():
            entry["size_bytes"] = path.stat().st_size
        described[rel_path.as_posix()] = entry
    return described


def build_smoke_report(root: Path, seed_output: Path, payload: dict[str, object]) -> dict[str, object]:
    summary = payload.get("summary") if isinstance(payload.get("summary"), dict) else {}
    integrity = payload.get("integrity") if isinstance(payload.get("integrity"), dict) else {}
    seed_written = seed_output.exists() and seed_output.is_file()
    checks = {
        "seed_written": seed_written,
        "integrity_clean": not integrity.get("missing_definition_province_ids")
        and not integrity.get("duplicate_state_province_refs")
        and not integrity.get("missing_owner_color_tags"),
        "has_provinces": int(summary.get("province_count") or 0) > 0,
        "has_states": int(summary.get("state_count") or 0) > 0,
        "has_countries": int(summary.get("country_count") or 0) > 0,
        "has_mapped_provinces": int(summary.get("mapped_province_count") or 0) > 0,
    }
    return {
        "schema_version": 1,
        "report_id": "hgo_runtime_seed_smoke",
        "status": "pass" if all(checks.values()) else "fail",
        "generated_at_utc": payload.get("generated_at_utc") or utc_now(),
        "source": payload.get("source", {}),
        "source_root": str(root.resolve()),
        "required_paths": describe_required_source_paths(root),
        "seed_output": {
            "path": str(seed_output),
            "size_bytes": seed_output.stat().st_size if seed_written else 0,
            "sha256": file_sha256(seed_output) if seed_written else "",
        },
        "summary": summary,
        "integrity": integrity,
        "checks": checks,
    }


def main() -> None:
    args = parse_args()
    if not args.hgo_root:
        raise SystemExit("HGO source root not provided. Pass --hgo-root or set HGO_ROOT.")
    root = Path(args.hgo_root)
    if not root.exists():
        raise SystemExit(f"HGO source root not found: {root}")
    raw_country_color_sources = (
        args.country_color_source
        if args.country_color_source is not None
        else [str(path) for path in DEFAULT_COUNTRY_COLOR_SOURCES]
    )
    country_color_sources = [
        resolved
        for value in raw_country_color_sources
        for resolved in [resolve_country_color_source_arg(value)]
        if resolved is not None
    ]
    payload = build_runtime_seed(
        root,
        country_color_sources=country_color_sources,
        as_of_date=args.as_of_date or None,
    )
    output = Path(args.output)
    dump_json(output, payload)
    report_path = Path(args.smoke_report) if args.smoke_report else None
    if report_path:
        dump_json(report_path, build_smoke_report(root, output, payload))
    summary = payload["summary"]
    print(
        "[HGO Runtime Seed] "
        f"states={summary['state_count']} "
        f"provinces={summary['province_count']} "
        f"mapped={summary['mapped_province_count']} "
        f"countries={summary['country_count']} "
        f"output={output}"
        + (f" smoke_report={report_path}" if report_path else "")
    )


if __name__ == "__main__":
    main()
