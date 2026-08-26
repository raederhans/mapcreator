from __future__ import annotations

import ast
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HEAVY_GROUPS_PATH = ROOT / "tests" / "heavy_dependency_groups.json"
TESTS_ROOT = ROOT / "tests"

HEAVY_IMPORT_ROOTS = frozenset({"geopandas", "numpy", "pyproj", "rasterio", "shapely"})


def imported_roots(path: Path) -> set[str]:
    tree = ast.parse(path.read_text(encoding="utf-8-sig"), filename=str(path))
    roots: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            roots.update(alias.name.split(".", 1)[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            roots.add(node.module.split(".", 1)[0])
    return roots


def discover_heavy_test_paths(*, root: Path = ROOT, tests_root: Path = TESTS_ROOT) -> set[str]:
    heavy_paths: set[str] = set()
    for path in tests_root.rglob("test_*.py"):
        if imported_roots(path) & HEAVY_IMPORT_ROOTS:
            heavy_paths.add(path.relative_to(root).as_posix())
    return heavy_paths


def declared_heavy_test_paths(manifest_path: Path = HEAVY_GROUPS_PATH) -> set[str]:
    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    paths: set[str] = set()
    for group in payload.values():
        for item in group.get("patterns", []):
            paths.add(str(item))
    return paths


def classification_violations(
    *,
    root: Path = ROOT,
    tests_root: Path = TESTS_ROOT,
    manifest_path: Path = HEAVY_GROUPS_PATH,
) -> list[str]:
    detected_heavy = discover_heavy_test_paths(root=root, tests_root=tests_root)
    declared_heavy = declared_heavy_test_paths(manifest_path)
    violations = [
        f"Heavy dependency test missing from grouping manifest: {path}"
        for path in sorted(detected_heavy - declared_heavy)
    ]
    violations.extend(
        f"Grouping manifest entry has no heavy dependency imports: {path}"
        for path in sorted(declared_heavy - detected_heavy)
    )
    return violations


def main() -> None:
    if not HEAVY_GROUPS_PATH.is_file():
        raise FileNotFoundError(f"Missing heavy dependency test grouping file: {HEAVY_GROUPS_PATH}")

    violations = classification_violations()
    if violations:
        violation_text = "\n".join(f"- {item}" for item in violations)
        raise SystemExit(f"Heavy dependency test classification check failed:\n{violation_text}")

    detected_heavy = discover_heavy_test_paths()
    print(
        f"[check_heavy_test_classification] ok: {HEAVY_GROUPS_PATH.name} "
        f"classifies {len(detected_heavy)} heavy test(s)"
    )


if __name__ == "__main__":
    main()
