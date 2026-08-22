#!/usr/bin/env python3
"""Build a lightweight modern city-lights asset from NASA Black Marble."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import warnings
from pathlib import Path

try:
    from PIL import Image
except ImportError as exc:  # pragma: no cover - dependency guard
    raise SystemExit(
        "Pillow is required to build the city lights asset. "
        "Create a venv and install it with: python3 -m venv .venv && .venv/bin/pip install Pillow"
    ) from exc


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_PATH = PROJECT_ROOT / "js" / "core" / "city_lights_modern_asset.js"
DEFAULT_SOURCE_DESCRIPTOR_PATH = (
    PROJECT_ROOT / "data" / "city_lights" / "modern_source_descriptor.json"
)
DEFAULT_GRID_WIDTH = 720
DEFAULT_GRID_HEIGHT = 360
DEFAULT_BASE_THRESHOLD = 2
DEFAULT_CORRIDOR_THRESHOLD = 14
MAX_GRID_DIMENSION = 4096
MAX_GRID_CELLS = 4_194_304
ALLOWED_IDENTITY_STATUSES = frozenset({"available", "unavailable"})
ALLOWED_ATTESTATIONS = frozenset({"attested", "not_attested"})
LOWERCASE_SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$")


class GeneratorContractError(Exception):
    """Stable CLI contract failure without a Python traceback."""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a modern night-lights asset module from NASA Black Marble."
    )
    parser.add_argument(
        "--source-descriptor",
        default=str(DEFAULT_SOURCE_DESCRIPTOR_PATH),
        help="Source ownership and input-identity descriptor JSON.",
    )
    parser.add_argument(
        "--source-url",
        default="",
        help="Optional source URL override; must match the descriptor known URL.",
    )
    parser.add_argument(
        "--require-attested-input",
        action="store_true",
        help="Fail unless the descriptor attests the exact local input SHA256.",
    )
    parser.add_argument(
        "--source-file",
        default="",
        help="Optional local source image path. If provided, download is skipped.",
    )
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT_PATH),
        help="Output JS module path.",
    )
    parser.add_argument(
        "--grid-width",
        type=int,
        default=None,
        help="Output grid width in cells.",
    )
    parser.add_argument(
        "--grid-height",
        type=int,
        default=None,
        help="Output grid height in cells.",
    )
    parser.add_argument(
        "--base-threshold",
        type=int,
        default=None,
        help="Recommended runtime base luminance threshold.",
    )
    parser.add_argument(
        "--corridor-threshold",
        type=int,
        default=None,
        help="Recommended runtime corridor threshold.",
    )
    return parser.parse_args()


def load_source_descriptor(descriptor_path: Path) -> dict[str, object]:
    try:
        payload = json.loads(descriptor_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise GeneratorContractError(f"Invalid source descriptor: {exc}") from None
    if not isinstance(payload, dict):
        raise GeneratorContractError("Source descriptor must be a JSON object.")
    required_paths = {
        "descriptor_id": payload.get("descriptor_id"),
        "ownership_class": payload.get("ownership_class"),
        "product": payload.get("product"),
        "provenance": payload.get("provenance"),
        "grid": payload.get("grid"),
        "input_identity": payload.get("input_identity"),
    }
    missing = sorted(key for key, value in required_paths.items() if not value)
    if missing:
        raise GeneratorContractError(f"Source descriptor missing required fields: {missing}")
    return payload


def descriptor_source_url(descriptor: dict[str, object], source_url_override: str) -> str:
    product = descriptor.get("product")
    known_url = str(product.get("known_url") if isinstance(product, dict) else "").strip()
    if not known_url:
        raise GeneratorContractError("Source descriptor product.known_url must be non-empty.")
    override = source_url_override.strip()
    if override and override != known_url:
        raise GeneratorContractError("--source-url must match source descriptor product.known_url.")
    return known_url


def descriptor_grid_value(descriptor: dict[str, object], key: str, fallback: int) -> object:
    grid = descriptor.get("grid")
    value = grid.get(key) if isinstance(grid, dict) else None
    return value if value is not None else fallback


def validate_input_identity(descriptor: dict[str, object]) -> dict[str, object]:
    identity = descriptor.get("input_identity")
    if not isinstance(identity, dict):
        raise GeneratorContractError("Source descriptor input_identity must be an object.")

    algorithm = identity.get("algorithm")
    if algorithm != "sha256":
        raise GeneratorContractError("input_identity.algorithm must be exactly 'sha256'.")

    status = identity.get("status")
    if not isinstance(status, str) or status not in ALLOWED_IDENTITY_STATUSES:
        raise GeneratorContractError(
            "input_identity.status must be one of: available, unavailable."
        )

    attestation = identity.get("attestation")
    if not isinstance(attestation, str) or attestation not in ALLOWED_ATTESTATIONS:
        raise GeneratorContractError(
            "input_identity.attestation must be one of: attested, not_attested."
        )

    expected_sha = identity.get("sha256")
    if attestation == "attested":
        if status != "available":
            raise GeneratorContractError(
                "Attested input identity requires status 'available'."
            )
        if not isinstance(expected_sha, str) or not LOWERCASE_SHA256_PATTERN.fullmatch(expected_sha):
            raise GeneratorContractError(
                "input_identity.sha256 must be 64 lowercase hexadecimal characters."
            )
    else:
        if status != "unavailable":
            raise GeneratorContractError(
                "Non-attested input identity requires status 'unavailable'."
            )
        if expected_sha is not None:
            raise GeneratorContractError(
                "Non-attested input identity requires sha256 null."
            )

    return identity


def require_attested_identity(identity: dict[str, object], *, required: bool) -> None:
    if required and identity["attestation"] != "attested":
        raise GeneratorContractError(
            "Authenticated rebuild unavailable: source descriptor input identity is not attested."
        )


def validate_integer_range(name: str, value: object, minimum: int, maximum: int) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or not minimum <= value <= maximum:
        raise GeneratorContractError(
            f"{name} must be an integer in range {minimum}..{maximum}."
        )
    return value


def resolve_generation_parameters(
    descriptor: dict[str, object],
    args: argparse.Namespace,
) -> tuple[int, int, int, int]:
    width = validate_integer_range(
        "Grid width",
        args.grid_width if args.grid_width is not None else descriptor_grid_value(
            descriptor, "width", DEFAULT_GRID_WIDTH
        ),
        1,
        MAX_GRID_DIMENSION,
    )
    height = validate_integer_range(
        "Grid height",
        args.grid_height if args.grid_height is not None else descriptor_grid_value(
            descriptor, "height", DEFAULT_GRID_HEIGHT
        ),
        1,
        MAX_GRID_DIMENSION,
    )
    if width * height > MAX_GRID_CELLS:
        raise GeneratorContractError(
            f"Grid cell count must not exceed {MAX_GRID_CELLS}."
        )
    base_threshold = validate_integer_range(
        "Base threshold",
        args.base_threshold if args.base_threshold is not None else descriptor_grid_value(
            descriptor, "base_threshold", DEFAULT_BASE_THRESHOLD
        ),
        0,
        255,
    )
    corridor_threshold = validate_integer_range(
        "Corridor threshold",
        args.corridor_threshold if args.corridor_threshold is not None else descriptor_grid_value(
            descriptor, "corridor_threshold", DEFAULT_CORRIDOR_THRESHOLD
        ),
        0,
        255,
    )
    return width, height, base_threshold, corridor_threshold


def resolved_path(path_value: str | Path) -> Path:
    return Path(path_value).expanduser().resolve(strict=False)


def paths_equivalent(left: Path, right: Path) -> bool:
    left_text = os.path.normcase(str(resolved_path(left)))
    right_text = os.path.normcase(str(resolved_path(right)))
    return left_text == right_text


def cache_target_path(source_url: str) -> Path:
    source_name = Path(urllib.parse.urlparse(source_url).path).name
    if not source_name:
        raise GeneratorContractError("Source URL must end with a file name.")
    return PROJECT_ROOT / ".runtime" / "tmp" / "city_lights" / source_name


def resolve_generation_paths(
    *,
    descriptor_path: Path,
    source_url: str,
    source_file: str,
    output: str,
) -> tuple[Path, Path]:
    output_path = resolved_path(output)
    planned_source_path = (
        resolved_path(source_file) if source_file else resolved_path(cache_target_path(source_url))
    )
    if paths_equivalent(output_path, descriptor_path):
        raise GeneratorContractError("Output path must differ from source descriptor path.")
    if paths_equivalent(output_path, planned_source_path):
        raise GeneratorContractError("Output path must differ from source image path.")
    return output_path, planned_source_path


def sha256_path(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_input_identity(
    identity: dict[str, object],
    source_path: Path,
    *,
    require_attested: bool,
) -> tuple[str, bool, str]:
    status = str(identity["status"])
    is_attested = identity["attestation"] == "attested"
    expected_sha = str(identity["sha256"] or "")
    try:
        actual_sha = sha256_path(source_path)
    except OSError as exc:
        raise GeneratorContractError(f"Unable to read source image: {exc}") from None
    if is_attested and actual_sha != expected_sha:
        raise GeneratorContractError(
            f"Source input SHA256 mismatch: descriptor={expected_sha} actual={actual_sha}"
        )
    return actual_sha, bool(require_attested and is_attested), status


def fetch_source_image(source_url: str, source_file: str, planned_source_path: Path) -> Path:
    if source_file:
        source_path = planned_source_path
        if not source_path.exists():
            raise GeneratorContractError(f"Source file not found: {source_path}")
        if not source_path.is_file():
            raise GeneratorContractError(f"Source path must be a file: {source_path}")
        return source_path

    build_cache_dir = planned_source_path.parent
    try:
        build_cache_dir.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise GeneratorContractError(f"Unable to create source cache: {exc}") from None
    target_path = planned_source_path
    if not target_path.exists():
        try:
            with urllib.request.urlopen(source_url, timeout=60) as response:
                target_path.write_bytes(response.read())
        except (OSError, urllib.error.URLError) as exc:
            raise GeneratorContractError(f"Unable to download source image: {exc}") from None
    return target_path


def load_grid_values(source_path: Path, width: int, height: int) -> list[int]:
    warnings.simplefilter("ignore", Image.DecompressionBombWarning)
    Image.MAX_IMAGE_PIXELS = None
    try:
        image = Image.open(source_path).convert("L")
    except OSError as exc:
        raise GeneratorContractError(f"Unable to decode source image: {exc}") from None
    source_width, source_height = image.size
    pixels = image.load()
    values: list[int] = []
    for row in range(height):
        y0 = math.floor((row * source_height) / height)
        y1 = math.floor(((row + 1) * source_height) / height)
        if y1 <= y0:
            y1 = min(source_height, y0 + 1)
        for col in range(width):
            x0 = math.floor((col * source_width) / width)
            x1 = math.floor(((col + 1) * source_width) / width)
            if x1 <= x0:
                x1 = min(source_width, x0 + 1)
            cell_max = 0
            cell_sum = 0
            cell_count = 0
            for y in range(y0, y1):
                for x in range(x0, x1):
                    pixel_value = int(pixels[x, y])
                    cell_sum += pixel_value
                    cell_count += 1
                    if pixel_value > cell_max:
                        cell_max = pixel_value
            cell_mean = (cell_sum / cell_count) if cell_count else 0
            boosted_value = int(round(min(
                255,
                (cell_max * 0.58)
                + (cell_mean * 0.42)
                + max(0.0, cell_max - cell_mean) * 0.12,
            )))
            if boosted_value < 2 and cell_max < 3:
                boosted_value = 0
            values.append(boosted_value)
    return values


def _percentile(sorted_values: list[int], percentile: float) -> int:
    if not sorted_values:
        return 0
    if len(sorted_values) == 1:
        return int(sorted_values[0])
    index = int(round((len(sorted_values) - 1) * percentile))
    index = max(0, min(len(sorted_values) - 1, index))
    return int(sorted_values[index])


def build_stats(values: list[int]) -> dict[str, float | int]:
    nonzero_values = sorted(value for value in values if value > 0)
    nonzero_count = len(nonzero_values)
    nonzero_mean = (sum(nonzero_values) / nonzero_count) if nonzero_count else 0.0
    p50 = _percentile(nonzero_values, 0.50)
    p90 = _percentile(nonzero_values, 0.90)
    p99 = _percentile(nonzero_values, 0.99)
    return {
        "max": max(values) if values else 0,
        "nonzeroCount": nonzero_count,
        "nonzeroMean": round(nonzero_mean, 4),
        "p50": p50,
        "p90": p90,
        "p99": p99,
        "nonzero_count": nonzero_count,
        "nonzero_mean": round(nonzero_mean, 4),
    }


def format_uint8_array(values: list[int], indent: str = "  ", row_size: int = 32) -> str:
    rows = []
    for start in range(0, len(values), row_size):
        row = ", ".join(str(value) for value in values[start:start + row_size])
        rows.append(f"{indent}{row}")
    return ",\n".join(rows)


def write_module(
    output_path: Path,
    *,
    source_ref: str,
    source_descriptor_id: str,
    source_input_sha256: str,
    source_input_identity_status: str,
    authenticated_rebuild: bool,
    width: int,
    height: int,
    base_threshold: int,
    corridor_threshold: int,
    values: list[int],
    stats: dict[str, float | int],
) -> None:
    step_lon = 360 / width
    step_lat = 180 / height
    module_text = f"""// Generated by tools/build_city_lights_modern_asset.py
// Source: {source_ref}
// NASA Black Marble 2016 grayscale, resampled into a balanced luminance grid.

export const MODERN_CITY_LIGHTS_SOURCE = Object.freeze({{
  name: "NASA Black Marble 2016 (grayscale)",
  url: {source_ref!r},
  descriptorId: {source_descriptor_id!r},
  inputSha256: {source_input_sha256!r},
  inputIdentityStatus: {source_input_identity_status!r},
  authenticatedRebuild: {str(authenticated_rebuild).lower()},
}});

export const MODERN_CITY_LIGHTS_GRID_WIDTH = {width};
export const MODERN_CITY_LIGHTS_GRID_HEIGHT = {height};
export const MODERN_CITY_LIGHTS_STEP_LON_DEG = {step_lon:.12g};
export const MODERN_CITY_LIGHTS_STEP_LAT_DEG = {step_lat:.12g};
export const MODERN_CITY_LIGHTS_BASE_THRESHOLD = {base_threshold};
export const MODERN_CITY_LIGHTS_CORRIDOR_THRESHOLD = {corridor_threshold};
export const MODERN_CITY_LIGHTS_STATS = Object.freeze({{
  max: {stats["max"]},
  nonzeroCount: {stats["nonzeroCount"]},
  nonzeroMean: {stats["nonzeroMean"]},
  p50: {stats["p50"]},
  p90: {stats["p90"]},
  p99: {stats["p99"]},
  nonzero_count: {stats["nonzero_count"]},
  nonzero_mean: {stats["nonzero_mean"]},
}});
export const MODERN_CITY_LIGHTS_GRID = new Uint8Array([
{format_uint8_array(values)}
]);
"""
    canonical_module_text = module_text.replace("\r\n", "\n").replace("\r", "\n")
    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(canonical_module_text.encode("utf-8"))
    except OSError as exc:
        raise GeneratorContractError(f"Unable to write output module: {exc}") from None


def main() -> int:
    args = parse_args()
    descriptor_path = resolved_path(args.source_descriptor)
    descriptor = load_source_descriptor(descriptor_path)
    identity = validate_input_identity(descriptor)
    require_attested_identity(identity, required=args.require_attested_input)
    source_url = descriptor_source_url(descriptor, args.source_url)
    grid_width, grid_height, base_threshold, corridor_threshold = resolve_generation_parameters(
        descriptor,
        args,
    )
    output_path, planned_source_path = resolve_generation_paths(
        descriptor_path=descriptor_path,
        source_url=source_url,
        source_file=args.source_file,
        output=args.output,
    )
    source_path = fetch_source_image(source_url, args.source_file, planned_source_path)
    source_sha256, authenticated_rebuild, identity_status = verify_input_identity(
        identity,
        source_path,
        require_attested=args.require_attested_input,
    )
    values = load_grid_values(source_path, grid_width, grid_height)
    stats = build_stats(values)
    write_module(
        output_path,
        source_ref=source_url,
        source_descriptor_id=str(descriptor["descriptor_id"]),
        source_input_sha256=source_sha256,
        source_input_identity_status=identity_status,
        authenticated_rebuild=authenticated_rebuild,
        width=grid_width,
        height=grid_height,
        base_threshold=base_threshold,
        corridor_threshold=corridor_threshold,
        values=values,
        stats=stats,
    )
    print(
        f"Built modern city lights asset: {output_path} "
        f"(cells={grid_width}x{grid_height}, source={source_url}, "
        f"authenticated={authenticated_rebuild}, "
        f"max={stats['max']}, p90={stats['p90']}, nonzero={stats['nonzeroCount']})"
    )
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except GeneratorContractError as exc:
        print(f"city-lights-generator: {exc}", file=sys.stderr)
        sys.exit(2)
