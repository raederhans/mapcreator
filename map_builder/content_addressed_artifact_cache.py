from __future__ import annotations

import hashlib
import json
import os
import shutil
import stat
import tempfile
import uuid
from pathlib import Path, PurePosixPath
from typing import Iterable


ARTIFACT_CACHE_SCHEMA = "ContentAddressedArtifactCache/v1"
_SHA256_KEY_PREFIX = "sha256:"
_SHA256_KEY_LENGTH = len(_SHA256_KEY_PREFIX) + 64
_WINDOWS_REPARSE_POINT = 0x400


class ArtifactCacheError(RuntimeError):
    """Base error for fail-closed local artifact cache operations."""


class ArtifactCacheMissError(ArtifactCacheError):
    """The requested manifest is not present in this cache."""


class ArtifactCacheValidationError(ArtifactCacheError):
    """An artifact, object, path, or identity failed validation."""


def canonical_json_bytes(payload: object) -> bytes:
    return json.dumps(
        payload,
        ensure_ascii=True,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")


def sha256_key(payload: bytes) -> str:
    return f"{_SHA256_KEY_PREFIX}{hashlib.sha256(payload).hexdigest()}"


def _validate_sha256_key(value: object, *, label: str) -> str:
    key = str(value or "")
    if len(key) != _SHA256_KEY_LENGTH or not key.startswith(_SHA256_KEY_PREFIX):
        raise ArtifactCacheValidationError(f"{label} must be a full sha256:<64 lowercase hex> key")
    digest = key[len(_SHA256_KEY_PREFIX) :]
    if any(character not in "0123456789abcdef" for character in digest):
        raise ArtifactCacheValidationError(f"{label} must be a full sha256:<64 lowercase hex> key")
    return key


def _validate_identity(value: object, *, label: str) -> str:
    identity = str(value or "")
    if not identity or identity != identity.strip():
        raise ArtifactCacheValidationError(f"{label} must be a non-empty exact identity")
    return identity


def _is_reparse_or_symlink(path: Path) -> bool:
    metadata = path.lstat()
    attributes = int(getattr(metadata, "st_file_attributes", 0))
    return stat.S_ISLNK(metadata.st_mode) or bool(attributes & _WINDOWS_REPARSE_POINT)


def _lstat_or_none(path: Path) -> os.stat_result | None:
    try:
        return path.lstat()
    except FileNotFoundError:
        return None


def _require_plain_directory(path: Path, *, label: str) -> None:
    metadata = _lstat_or_none(path)
    if metadata is None:
        raise ArtifactCacheValidationError(f"Missing {label}: {path}")
    if _is_reparse_or_symlink(path) or not stat.S_ISDIR(metadata.st_mode):
        raise ArtifactCacheValidationError(f"{label} must be a plain directory: {path}")


def _require_plain_file(path: Path, *, label: str) -> None:
    metadata = _lstat_or_none(path)
    if metadata is None:
        raise ArtifactCacheValidationError(f"Missing {label}: {path}")
    attributes = int(getattr(metadata, "st_file_attributes", 0))
    if stat.S_ISLNK(metadata.st_mode) or bool(attributes & _WINDOWS_REPARSE_POINT):
        raise ArtifactCacheValidationError(f"{label} must not be a symlink or reparse point: {path}")
    if not stat.S_ISREG(metadata.st_mode):
        raise ArtifactCacheValidationError(f"{label} must be a regular file: {path}")


def _validate_relative_posix_path(value: object) -> str:
    relative_path = str(value or "")
    if not relative_path or "\\" in relative_path:
        raise ArtifactCacheValidationError(f"Artifact path must be a relative POSIX file path: {value!r}")
    path = PurePosixPath(relative_path)
    if (
        path.is_absolute()
        or path.root
        or (path.parts and path.parts[0].endswith(":"))
        or any(part in {"", ".", ".."} for part in path.parts)
    ):
        raise ArtifactCacheValidationError(f"Artifact path must not be absolute or traverse parents: {value!r}")
    normalized = path.as_posix()
    if normalized != relative_path:
        raise ArtifactCacheValidationError(f"Artifact path must be canonical POSIX form: {value!r}")
    return normalized


def _hash_file(path: Path) -> tuple[str, int]:
    digest = hashlib.sha256()
    byte_length = 0
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
            byte_length += len(chunk)
    return f"{_SHA256_KEY_PREFIX}{digest.hexdigest()}", byte_length


class ContentAddressedArtifactCache:
    """Provider-neutral, local filesystem cache for immutable file-tree artifacts.

    The cache and its parent checkpoint are a trusted, single-writer boundary.
    Static symlink/reparse paths are rejected, but this is not a sandbox against
    a same-privilege process replacing directory components concurrently.
    """

    def __init__(self, root: Path) -> None:
        self.root = Path(root).absolute()
        self.objects_dir = self.root / "objects"
        self.manifests_dir = self.root / "manifests"

    def admit(
        self,
        source_root: Path,
        *,
        source_identity: str,
        builder_identity: str,
        paths: Iterable[str | Path] | None = None,
    ) -> dict[str, object]:
        source_identity = _validate_identity(source_identity, label="source_identity")
        builder_identity = _validate_identity(builder_identity, label="builder_identity")
        requested_source_root = Path(source_root).absolute()
        if _lstat_or_none(requested_source_root) is not None and _is_reparse_or_symlink(requested_source_root):
            raise ArtifactCacheValidationError(
                f"artifact source root must not be a symlink or reparse point: {requested_source_root}"
            )
        source_root = requested_source_root.resolve()
        _require_plain_directory(source_root, label="artifact source root")
        if paths is None and self.root.is_relative_to(source_root):
            raise ArtifactCacheValidationError("Artifact cache root must not be nested inside a recursive source root")
        self._prepare_cache_layout()
        relative_paths = self._collect_source_paths(source_root, paths)
        files: list[dict[str, object]] = []
        for relative_path in relative_paths:
            source_path = source_root.joinpath(*PurePosixPath(relative_path).parts)
            self._require_plain_source_path(source_root, source_path)
            object_key, byte_length = _hash_file(source_path)
            self._admit_object(source_path, object_key, byte_length)
            files.append(
                {
                    "path": relative_path,
                    "byteLength": byte_length,
                    "sha256": object_key,
                }
            )
        tree_digest = sha256_key(canonical_json_bytes(files))
        manifest = {
            "schema": ARTIFACT_CACHE_SCHEMA,
            "sourceIdentity": source_identity,
            "builderIdentity": builder_identity,
            "treeDigest": tree_digest,
            "files": files,
        }
        manifest_digest = sha256_key(canonical_json_bytes(manifest))
        self._admit_manifest(manifest, manifest_digest)
        return {
            "schema": ARTIFACT_CACHE_SCHEMA,
            "sourceIdentity": source_identity,
            "builderIdentity": builder_identity,
            "manifestDigest": manifest_digest,
            "treeDigest": tree_digest,
            "files": [dict(entry) for entry in files],
        }

    def lookup(
        self,
        manifest_digest: str,
        *,
        source_identity: str,
        builder_identity: str,
        tree_digest: str,
    ) -> dict[str, object] | None:
        manifest_digest = _validate_sha256_key(manifest_digest, label="manifest_digest")
        tree_digest = _validate_sha256_key(tree_digest, label="tree_digest")
        source_identity = _validate_identity(source_identity, label="source_identity")
        builder_identity = _validate_identity(builder_identity, label="builder_identity")
        self._prepare_cache_layout()
        manifest_path = self._manifest_path(manifest_digest)
        self._ensure_plain_directory_chain(manifest_path.parent)
        if _lstat_or_none(manifest_path) is None:
            return None
        _require_plain_file(manifest_path, label="artifact manifest")
        try:
            manifest_bytes = manifest_path.read_bytes()
            manifest = json.loads(manifest_bytes.decode("utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ArtifactCacheValidationError(f"Artifact manifest is unreadable: {manifest_path}") from exc
        if not isinstance(manifest, dict):
            raise ArtifactCacheValidationError("Artifact manifest must be a JSON object")
        canonical_manifest = canonical_json_bytes(manifest)
        if manifest_bytes != canonical_manifest or sha256_key(canonical_manifest) != manifest_digest:
            raise ArtifactCacheValidationError("Artifact manifest digest does not match its object key")
        if manifest.get("schema") != ARTIFACT_CACHE_SCHEMA:
            raise ArtifactCacheValidationError("Artifact manifest schema does not match ContentAddressedArtifactCache/v1")
        if manifest.get("sourceIdentity") != source_identity:
            raise ArtifactCacheValidationError("Artifact source identity mismatch")
        if manifest.get("builderIdentity") != builder_identity:
            raise ArtifactCacheValidationError("Artifact builder identity mismatch")
        if manifest.get("treeDigest") != tree_digest:
            raise ArtifactCacheValidationError("Artifact tree identity mismatch")
        files = self._validate_manifest_files(manifest.get("files"))
        if sha256_key(canonical_json_bytes(files)) != tree_digest:
            raise ArtifactCacheValidationError("Artifact tree digest does not match its canonical manifest entries")
        for entry in files:
            object_path = self._object_path(str(entry["sha256"]))
            self._ensure_plain_directory_chain(object_path.parent)
            _require_plain_file(object_path, label=f"artifact object {entry['sha256']}")
            actual_key, actual_length = _hash_file(object_path)
            if actual_key != entry["sha256"] or actual_length != entry["byteLength"]:
                raise ArtifactCacheValidationError(f"Artifact object is damaged: {entry['sha256']}")
        return {
            "schema": ARTIFACT_CACHE_SCHEMA,
            "sourceIdentity": source_identity,
            "builderIdentity": builder_identity,
            "manifestDigest": manifest_digest,
            "treeDigest": tree_digest,
            "files": [dict(entry) for entry in files],
        }

    def restore(
        self,
        manifest_digest: str,
        target_root: Path,
        *,
        source_identity: str,
        builder_identity: str,
        tree_digest: str,
    ) -> dict[str, object]:
        artifact = self.lookup(
            manifest_digest,
            source_identity=source_identity,
            builder_identity=builder_identity,
            tree_digest=tree_digest,
        )
        if artifact is None:
            raise ArtifactCacheMissError(f"Artifact manifest is unavailable: {manifest_digest}")
        requested_target_root = Path(target_root).absolute()
        if _lstat_or_none(requested_target_root) is not None and _is_reparse_or_symlink(requested_target_root):
            raise ArtifactCacheValidationError(
                f"restore target must not be a symlink or reparse point: {requested_target_root}"
            )
        _require_plain_directory(requested_target_root.parent, label="restore target parent")
        target_root = requested_target_root.resolve()
        target_parent = target_root.parent
        if target_root.exists():
            _require_plain_directory(target_root, label="restore target")
        temporary_root = Path(
            tempfile.mkdtemp(prefix=f".{target_root.name}.restore-", dir=str(target_parent))
        )
        staged_root = temporary_root / "artifact"
        backup_root = target_parent / f".{target_root.name}.backup-{uuid.uuid4().hex}"
        replaced_existing = False
        try:
            staged_root.mkdir()
            for entry in artifact["files"]:
                relative_path = str(entry["path"])
                destination = staged_root.joinpath(*PurePosixPath(relative_path).parts)
                destination.parent.mkdir(parents=True, exist_ok=True)
                object_path = self._object_path(str(entry["sha256"]))
                self._ensure_plain_directory_chain(object_path.parent)
                _require_plain_file(object_path, label=f"artifact object {entry['sha256']}")
                shutil.copyfile(object_path, destination)
                _require_plain_file(destination, label=f"restored file {relative_path}")
                actual_key, actual_length = _hash_file(destination)
                if actual_key != entry["sha256"] or actual_length != entry["byteLength"]:
                    raise ArtifactCacheValidationError(f"Restored file failed validation: {relative_path}")
            self._validate_materialized_tree(staged_root, artifact["files"], tree_digest)
            if target_root.exists():
                os.replace(target_root, backup_root)
                replaced_existing = True
            try:
                os.replace(staged_root, target_root)
            except BaseException:
                if replaced_existing and backup_root.exists() and not target_root.exists():
                    os.replace(backup_root, target_root)
                    replaced_existing = False
                raise
            if replaced_existing:
                replaced_existing = False
                shutil.rmtree(backup_root, ignore_errors=True)
            return artifact
        finally:
            if replaced_existing and backup_root.exists() and not target_root.exists():
                os.replace(backup_root, target_root)
            if temporary_root.exists():
                shutil.rmtree(temporary_root, ignore_errors=True)

    def _collect_source_paths(
        self,
        source_root: Path,
        paths: Iterable[str | Path] | None,
    ) -> list[str]:
        if paths is not None:
            normalized = [_validate_relative_posix_path(path) for path in paths]
            if len(normalized) != len(set(normalized)):
                raise ArtifactCacheValidationError("Artifact manifest paths must be unique")
            return sorted(normalized)
        discovered: list[str] = []

        def visit(directory: Path, relative_parent: PurePosixPath) -> None:
            _require_plain_directory(directory, label="artifact source directory")
            with os.scandir(directory) as entries:
                for entry in sorted(entries, key=lambda candidate: candidate.name):
                    relative = relative_parent / entry.name
                    candidate = Path(entry.path)
                    if entry.is_symlink() or _is_reparse_or_symlink(candidate):
                        raise ArtifactCacheValidationError(
                            f"Artifact source must not contain symlink or reparse paths: {relative.as_posix()}"
                        )
                    if entry.is_dir(follow_symlinks=False):
                        visit(candidate, relative)
                    elif entry.is_file(follow_symlinks=False):
                        discovered.append(_validate_relative_posix_path(relative.as_posix()))
                    else:
                        raise ArtifactCacheValidationError(
                            f"Artifact source must contain only regular files: {relative.as_posix()}"
                        )

        visit(source_root, PurePosixPath())
        return discovered

    def _require_plain_source_path(self, source_root: Path, source_path: Path) -> None:
        current = source_root
        for part in source_path.relative_to(source_root).parts:
            current = current / part
            if _lstat_or_none(current) is None:
                raise ArtifactCacheValidationError(f"Missing artifact source path: {current}")
            if _is_reparse_or_symlink(current):
                raise ArtifactCacheValidationError(f"Artifact source path is a symlink or reparse point: {current}")
        _require_plain_file(source_path, label="artifact source file")

    def _admit_object(self, source_path: Path, object_key: str, byte_length: int) -> None:
        current_source_key, current_source_length = _hash_file(source_path)
        if current_source_key != object_key or current_source_length != byte_length:
            raise ArtifactCacheValidationError(f"Artifact source changed while being admitted: {source_path}")
        object_path = self._object_path(object_key)
        self._ensure_plain_directory_chain(object_path.parent)
        if _lstat_or_none(object_path) is not None:
            _require_plain_file(object_path, label=f"artifact object {object_key}")
            actual_key, actual_length = _hash_file(object_path)
            if actual_key != object_key or actual_length != byte_length:
                raise ArtifactCacheValidationError(f"Existing artifact object is damaged: {object_key}")
            final_source_key, final_source_length = _hash_file(source_path)
            if final_source_key != object_key or final_source_length != byte_length:
                raise ArtifactCacheValidationError(f"Artifact source changed while being admitted: {source_path}")
            return
        temporary_path = object_path.with_name(f".{object_path.name}.{uuid.uuid4().hex}.tmp")
        try:
            shutil.copyfile(source_path, temporary_path)
            actual_key, actual_length = _hash_file(temporary_path)
            if actual_key != object_key or actual_length != byte_length:
                raise ArtifactCacheValidationError(f"Artifact object changed while being admitted: {source_path}")
            try:
                os.replace(temporary_path, object_path)
            except FileExistsError:
                temporary_path.unlink(missing_ok=True)
                _require_plain_file(object_path, label=f"artifact object {object_key}")
        finally:
            temporary_path.unlink(missing_ok=True)

    def _admit_manifest(self, manifest: dict[str, object], manifest_digest: str) -> None:
        manifest_path = self._manifest_path(manifest_digest)
        self._ensure_plain_directory_chain(manifest_path.parent)
        payload = canonical_json_bytes(manifest)
        if _lstat_or_none(manifest_path) is not None:
            _require_plain_file(manifest_path, label="artifact manifest")
            if manifest_path.read_bytes() != payload:
                raise ArtifactCacheValidationError("Existing artifact manifest is damaged")
            return
        temporary_path = manifest_path.with_name(f".{manifest_path.name}.{uuid.uuid4().hex}.tmp")
        try:
            temporary_path.write_bytes(payload)
            os.replace(temporary_path, manifest_path)
        finally:
            temporary_path.unlink(missing_ok=True)

    def _validate_manifest_files(self, payload: object) -> list[dict[str, object]]:
        if not isinstance(payload, list):
            raise ArtifactCacheValidationError("Artifact manifest files must be a list")
        files: list[dict[str, object]] = []
        seen: set[str] = set()
        for raw_entry in payload:
            if not isinstance(raw_entry, dict) or set(raw_entry) != {"path", "byteLength", "sha256"}:
                raise ArtifactCacheValidationError("Artifact manifest file entries must contain path, byteLength, sha256")
            relative_path = _validate_relative_posix_path(raw_entry.get("path"))
            if relative_path in seen:
                raise ArtifactCacheValidationError(f"Artifact manifest contains duplicate path: {relative_path}")
            seen.add(relative_path)
            path_parts = PurePosixPath(relative_path).parts
            if any(
                PurePosixPath(existing).parts == path_parts[: len(PurePosixPath(existing).parts)]
                or path_parts == PurePosixPath(existing).parts[: len(path_parts)]
                for existing in seen
                if existing != relative_path
            ):
                raise ArtifactCacheValidationError(
                    f"Artifact manifest paths contain a file/directory collision: {relative_path}"
                )
            byte_length = raw_entry.get("byteLength")
            if isinstance(byte_length, bool) or not isinstance(byte_length, int) or byte_length < 0:
                raise ArtifactCacheValidationError(f"Artifact byteLength is invalid: {relative_path}")
            object_key = _validate_sha256_key(raw_entry.get("sha256"), label=f"sha256 for {relative_path}")
            files.append({"path": relative_path, "byteLength": byte_length, "sha256": object_key})
        if files != sorted(files, key=lambda entry: str(entry["path"])):
            raise ArtifactCacheValidationError("Artifact manifest files must be sorted by relative POSIX path")
        return files

    def _validate_materialized_tree(
        self,
        root: Path,
        expected_files: object,
        tree_digest: str,
    ) -> None:
        actual_files: list[dict[str, object]] = []
        for relative_path in self._collect_source_paths(root, None):
            path = root.joinpath(*PurePosixPath(relative_path).parts)
            object_key, byte_length = _hash_file(path)
            actual_files.append({"path": relative_path, "byteLength": byte_length, "sha256": object_key})
        if actual_files != expected_files or sha256_key(canonical_json_bytes(actual_files)) != tree_digest:
            raise ArtifactCacheValidationError("Materialized artifact tree identity mismatch")

    def _object_path(self, object_key: str) -> Path:
        key = _validate_sha256_key(object_key, label="object key")
        digest = key[len(_SHA256_KEY_PREFIX) :]
        return self.objects_dir / digest[:2] / digest[2:]

    def _manifest_path(self, manifest_digest: str) -> Path:
        key = _validate_sha256_key(manifest_digest, label="manifest_digest")
        return self.manifests_dir / f"{key[len(_SHA256_KEY_PREFIX):]}.json"

    def _prepare_cache_layout(self) -> None:
        self._ensure_plain_directory_chain(self.root)
        self._ensure_plain_directory_chain(self.objects_dir)
        self._ensure_plain_directory_chain(self.manifests_dir)

    def _ensure_plain_directory_chain(self, directory: Path) -> None:
        directory = Path(directory).absolute()
        try:
            relative_parts = directory.relative_to(self.root).parts
        except ValueError:
            if directory != self.root:
                raise ArtifactCacheValidationError(
                    f"Cache directory escapes configured root: {directory}"
                )
            relative_parts = ()

        root_parts = self.root.parts
        current = Path(self.root.anchor)
        for part in root_parts[1:]:
            current = current / part
            self._ensure_plain_directory_component(current)
        for part in relative_parts:
            current = current / part
            self._ensure_plain_directory_component(current)

    @staticmethod
    def _ensure_plain_directory_component(directory: Path) -> None:
        metadata = _lstat_or_none(directory)
        if metadata is None:
            try:
                directory.mkdir()
            except FileExistsError:
                pass
            metadata = _lstat_or_none(directory)
        if metadata is None or _is_reparse_or_symlink(directory) or not stat.S_ISDIR(metadata.st_mode):
            raise ArtifactCacheValidationError(
                f"Cache path component must be a plain directory: {directory}"
            )
