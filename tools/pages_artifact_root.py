from __future__ import annotations

import os
from pathlib import Path
from typing import Mapping


ROOT = Path(__file__).resolve().parents[1]
TRACKED_DIST_ROOT = ROOT / "dist"
PAGES_ARTIFACT_ROOT_ENV = "SCENARIO_FORGE_PAGES_ARTIFACT_ROOT"


class PagesArtifactRootError(ValueError):
    pass


def has_reparse_point_component(path: Path) -> bool:
    candidate = path.expanduser().absolute()
    while True:
        try:
            is_junction = getattr(os.path, "isjunction", lambda _value: False)(candidate)
            if candidate.exists() and (candidate.is_symlink() or is_junction):
                return True
        except OSError:
            return True
        if candidate.parent == candidate:
            return False
        candidate = candidate.parent


def resolve_runtime_path(
    value: str | Path,
    *,
    repo_root: Path = ROOT,
    label: str = "Pages runtime path",
    must_exist: bool = False,
    require_directory: bool = False,
) -> Path:
    raw_value = str(value).strip()
    if not raw_value:
        raise PagesArtifactRootError(f"{label} is required")
    raw_path = Path(raw_value).expanduser()
    candidate = raw_path if raw_path.is_absolute() else repo_root / raw_path
    if has_reparse_point_component(candidate):
        raise PagesArtifactRootError(f"{label} must not traverse a symbolic link or junction")
    selected = candidate.resolve()
    runtime_root = (repo_root / ".runtime").resolve()
    try:
        relative = selected.relative_to(runtime_root)
    except ValueError as exc:
        raise PagesArtifactRootError(f"{label} must be inside repository .runtime") from exc
    if not relative.parts:
        raise PagesArtifactRootError(f"{label} must be below repository .runtime")
    if must_exist and not selected.exists():
        raise PagesArtifactRootError(f"{label} does not exist: {selected}")
    if require_directory and selected.exists() and not selected.is_dir():
        raise PagesArtifactRootError(f"{label} must be a directory: {selected}")
    return selected


def resolve_pages_artifact_root(
    value: str | Path | None = None,
    *,
    repo_root: Path = ROOT,
    env: Mapping[str, str] | None = None,
    allow_tracked_fallback: bool = True,
    must_exist: bool = False,
) -> Path:
    selected_env = os.environ if env is None else env
    explicit_value: str | Path | None = value
    if explicit_value is None and PAGES_ARTIFACT_ROOT_ENV in selected_env:
        explicit_value = selected_env[PAGES_ARTIFACT_ROOT_ENV]
    if explicit_value is None:
        if not allow_tracked_fallback:
            raise PagesArtifactRootError(
                f"Set {PAGES_ARTIFACT_ROOT_ENV} or pass an explicit artifact root"
            )
        tracked_root = (repo_root / "dist").resolve()
        if must_exist and not tracked_root.is_dir():
            raise PagesArtifactRootError(f"Tracked Pages dist does not exist: {tracked_root}")
        return tracked_root
    raw_path = Path(str(explicit_value).strip()).expanduser()
    candidate = raw_path if raw_path.is_absolute() else repo_root / raw_path
    if has_reparse_point_component(candidate):
        raise PagesArtifactRootError("Pages artifact root must not traverse a symbolic link or junction")
    if candidate.resolve() == (repo_root / "dist").resolve():
        raise PagesArtifactRootError("Explicit Pages artifact root must not name tracked dist")
    return resolve_runtime_path(
        explicit_value,
        repo_root=repo_root,
        label="Pages artifact root",
        must_exist=must_exist,
        require_directory=True,
    )
