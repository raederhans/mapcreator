from __future__ import annotations

import argparse
import ast
import json
import sys
from pathlib import Path
from typing import Iterable


SCHEMA_VERSION = 1
KIND = "python-static-import-closure-audit"
STDLIB_ROOTS = frozenset(sys.stdlib_module_names) | {"__future__"}


def _repo_path(path: Path, root: Path) -> str:
    return path.resolve().relative_to(root.resolve()).as_posix()


def _module_candidates(search_root: Path, module: str) -> list[Path]:
    if not module:
        return []
    module_path = search_root.joinpath(*module.split("."))
    return [module_path.with_suffix(".py"), module_path / "__init__.py"]


def _local_module_paths(search_roots: tuple[Path, ...], module: str) -> tuple[set[Path], bool]:
    paths: set[Path] = set()
    namespace_package = False
    for search_root in search_roots:
        for candidate in _module_candidates(search_root, module):
            if candidate.is_file():
                paths.add(candidate.resolve())
        module_directory = search_root.joinpath(*module.split("."))
        if module_directory.is_dir():
            namespace_package = True
    return paths, namespace_package


def _module_name(path: Path, root: Path) -> tuple[str, bool]:
    relative = path.resolve().relative_to(root.resolve())
    parts = list(relative.with_suffix("").parts)
    is_package = parts[-1] == "__init__"
    if is_package:
        parts.pop()
    return ".".join(parts), is_package


def _absolute_from_module(node: ast.ImportFrom, path: Path, root: Path) -> str:
    if node.level == 0:
        return node.module or ""
    current_module, is_package = _module_name(path, root)
    package_parts = current_module.split(".") if current_module else []
    if not is_package and package_parts:
        package_parts.pop()
    drop_count = max(0, node.level - 1)
    if drop_count > len(package_parts):
        return ""
    base_parts = package_parts[: len(package_parts) - drop_count]
    if node.module:
        base_parts.extend(node.module.split("."))
    return ".".join(base_parts)


def _literal_dynamic_import(
    node: ast.Call,
    *,
    importlib_aliases: set[str],
    loader_aliases: set[str],
) -> tuple[str | None, bool]:
    is_builtin = isinstance(node.func, ast.Name) and node.func.id in ({"__import__"} | loader_aliases)
    is_importlib = (
        isinstance(node.func, ast.Attribute)
        and node.func.attr == "import_module"
        and isinstance(node.func.value, ast.Name)
        and node.func.value.id in importlib_aliases
    )
    if not (is_builtin or is_importlib):
        return None, False
    if node.args and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str):
        return node.args[0].value, True
    return None, True


def _imports_for_file(
    path: Path,
    root: Path,
    search_roots: tuple[Path, ...],
) -> tuple[set[str], set[Path], list[str]]:
    source = path.read_text(encoding="utf-8-sig")
    tree = ast.parse(source, filename=str(path))
    external_roots: set[str] = set()
    local_paths: set[Path] = set()
    unresolved_dynamic: list[str] = []
    importlib_aliases = {"importlib"}
    loader_aliases = {"import_module"}

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name == "importlib":
                    importlib_aliases.add(alias.asname or alias.name)
        elif isinstance(node, ast.ImportFrom) and node.module == "importlib":
            for alias in node.names:
                if alias.name == "import_module":
                    loader_aliases.add(alias.asname or alias.name)
    changed = True
    while changed:
        changed = False
        for node in ast.walk(tree):
            if not isinstance(node, (ast.Assign, ast.AnnAssign)):
                continue
            value = node.value
            target_nodes = node.targets if isinstance(node, ast.Assign) else [node.target]
            target_names = {target.id for target in target_nodes if isinstance(target, ast.Name)}
            aliases_loader = (
                isinstance(value, ast.Name) and value.id in loader_aliases
            ) or (
                isinstance(value, ast.Attribute)
                and value.attr == "import_module"
                and isinstance(value.value, ast.Name)
                and value.value.id in importlib_aliases
            )
            if aliases_loader:
                before = len(loader_aliases)
                loader_aliases.update(target_names)
                changed = changed or len(loader_aliases) > before

    def classify_module(module: str) -> None:
        normalized = module.lstrip(".")
        if not normalized:
            return
        resolved_paths, namespace_package = _local_module_paths(search_roots, normalized)
        if resolved_paths or namespace_package:
            local_paths.update(resolved_paths)
            return
        external_roots.add(normalized.split(".", 1)[0])

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                classify_module(alias.name)
        elif isinstance(node, ast.ImportFrom):
            base_module = _absolute_from_module(node, path, root)
            base_paths, base_namespace = _local_module_paths(search_roots, base_module)
            local_paths.update(base_paths)
            child_paths: set[Path] = set()
            for alias in node.names:
                resolved_children, _ = _local_module_paths(
                    search_roots,
                    f"{base_module}.{alias.name}" if base_module else alias.name,
                )
                child_paths.update(resolved_children)
            local_paths.update(child_paths)
            if not base_paths and not base_namespace and not child_paths:
                classify_module(base_module)
        elif isinstance(node, ast.Call):
            module, is_dynamic_import = _literal_dynamic_import(
                node,
                importlib_aliases=importlib_aliases,
                loader_aliases=loader_aliases,
            )
            if not is_dynamic_import:
                continue
            if module and not module.startswith("."):
                classify_module(module)
            else:
                unresolved_dynamic.append(f"{_repo_path(path, root)}:{node.lineno}")
    return external_roots, local_paths, sorted(set(unresolved_dynamic))


def audit_root(root_path: Path, *, root: Path) -> dict[str, object]:
    resolved_root = root_path.resolve()
    result: dict[str, object] = {
        "path": _repo_path(resolved_root, root),
        "verdict": "stdlib-only",
        "closureFiles": [],
        "stdlibImports": [],
        "thirdPartyImports": [],
        "unresolvedDynamicImports": [],
        "parseErrors": [],
    }
    pending = [resolved_root]
    visited: set[Path] = set()
    stdlib_imports: set[str] = set()
    third_party_imports: set[str] = set()
    unresolved_dynamic: set[str] = set()
    parse_errors: list[str] = []
    search_roots = (root.resolve(),)
    if (root / "tools").is_dir():
        search_roots = (root.resolve(), (root / "tools").resolve())

    while pending:
        current = pending.pop()
        if current in visited:
            continue
        visited.add(current)
        try:
            imports, local_paths, dynamic_gaps = _imports_for_file(current, root, search_roots)
        except (OSError, SyntaxError, UnicodeError) as error:
            parse_errors.append(f"{_repo_path(current, root)}:{type(error).__name__}:{error}")
            continue
        for imported_root in imports:
            if imported_root in STDLIB_ROOTS:
                stdlib_imports.add(imported_root)
            else:
                third_party_imports.add(imported_root)
        unresolved_dynamic.update(dynamic_gaps)
        pending.extend(sorted(local_paths - visited, reverse=True))

    result["closureFiles"] = sorted(_repo_path(path, root) for path in visited)
    result["stdlibImports"] = sorted(stdlib_imports)
    result["thirdPartyImports"] = sorted(third_party_imports)
    result["unresolvedDynamicImports"] = sorted(unresolved_dynamic)
    result["parseErrors"] = sorted(parse_errors)
    if third_party_imports or unresolved_dynamic or parse_errors:
        result["verdict"] = "external-or-unresolved"
    return result


def audit_paths(paths: Iterable[Path], *, root: Path) -> dict[str, object]:
    resolved_root = root.resolve()
    roots = []
    missing_paths = []
    for path in sorted({path.resolve() for path in paths}):
        try:
            _repo_path(path, resolved_root)
        except ValueError:
            missing_paths.append(str(path))
            continue
        if not path.is_file():
            missing_paths.append(_repo_path(path, resolved_root))
            continue
        roots.append(audit_root(path, root=resolved_root))
    all_stdlib = sorted({name for entry in roots for name in entry["stdlibImports"]})
    all_third_party = sorted({name for entry in roots for name in entry["thirdPartyImports"]})
    unresolved = sorted({item for entry in roots for item in entry["unresolvedDynamicImports"]})
    parse_errors = sorted({item for entry in roots for item in entry["parseErrors"]})
    verdict = "stdlib-only"
    if missing_paths or all_third_party or unresolved or parse_errors:
        verdict = "external-or-unresolved"
    return {
        "schemaVersion": SCHEMA_VERSION,
        "kind": KIND,
        "verdict": verdict,
        "rootCount": len(roots),
        "roots": roots,
        "stdlibImports": all_stdlib,
        "thirdPartyImports": all_third_party,
        "unresolvedDynamicImports": unresolved,
        "parseErrors": parse_errors,
        "missingPaths": sorted(missing_paths),
    }


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit a static recursive Python import closure.")
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--path", action="append", default=[])
    parser.add_argument("--stdin", action="store_true", help="Read a JSON array of repo-relative paths.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    paths = list(args.path)
    if args.stdin:
        payload = json.load(sys.stdin)
        if not isinstance(payload, list) or any(not isinstance(item, str) for item in payload):
            raise SystemExit("stdin must contain a JSON array of paths")
        paths.extend(payload)
    report = audit_paths((args.root / path for path in paths), root=args.root)
    print(json.dumps(report, sort_keys=True, separators=(",", ":")))
    return 0 if report["verdict"] == "stdlib-only" else 2


if __name__ == "__main__":
    raise SystemExit(main())
