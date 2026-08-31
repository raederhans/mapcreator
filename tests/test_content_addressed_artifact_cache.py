from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from map_builder.content_addressed_artifact_cache import (
    ARTIFACT_CACHE_SCHEMA,
    ArtifactCacheMissError,
    ArtifactCacheValidationError,
    ContentAddressedArtifactCache,
)


class ContentAddressedArtifactCacheTest(unittest.TestCase):
    def test_admit_lookup_and_restore_use_deterministic_full_sha256_identities(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            source = root / "source"
            source.mkdir()
            (source / "z.json").write_bytes(b"z")
            (source / "nested").mkdir()
            (source / "nested" / "a.json").write_bytes(b"alpha")
            cache = ContentAddressedArtifactCache(root / "cache")

            admitted = cache.admit(
                source,
                source_identity="source-v1",
                builder_identity="builder-v1",
            )
            repeated = cache.admit(
                source,
                source_identity="source-v1",
                builder_identity="builder-v1",
            )

            self.assertEqual(admitted, repeated)
            self.assertEqual(admitted["schema"], ARTIFACT_CACHE_SCHEMA)
            self.assertRegex(admitted["manifestDigest"], r"^sha256:[0-9a-f]{64}$")
            self.assertRegex(admitted["treeDigest"], r"^sha256:[0-9a-f]{64}$")
            self.assertEqual([entry["path"] for entry in admitted["files"]], ["nested/a.json", "z.json"])
            self.assertTrue(
                all(
                    set(entry) == {"path", "byteLength", "sha256"}
                    and str(entry["sha256"]).startswith("sha256:")
                    for entry in admitted["files"]
                )
            )

            found = cache.lookup(
                admitted["manifestDigest"],
                source_identity="source-v1",
                builder_identity="builder-v1",
                tree_digest=admitted["treeDigest"],
            )
            self.assertEqual(found, admitted)

            target = root / "restored"
            target.mkdir()
            (target / "old.txt").write_text("old", encoding="utf-8")
            restored = cache.restore(
                admitted["manifestDigest"],
                target,
                source_identity="source-v1",
                builder_identity="builder-v1",
                tree_digest=admitted["treeDigest"],
            )
            self.assertEqual(restored, admitted)
            self.assertFalse((target / "old.txt").exists())
            self.assertEqual((target / "nested" / "a.json").read_bytes(), b"alpha")
            self.assertEqual((target / "z.json").read_bytes(), b"z")

    def test_admit_rejects_absolute_traversal_and_duplicate_paths(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            source = root / "source"
            source.mkdir()
            (source / "one.txt").write_text("one", encoding="utf-8")
            cache = ContentAddressedArtifactCache(root / "cache")
            common = {"source_identity": "source", "builder_identity": "builder"}

            for paths in (
                [str((source / "one.txt").resolve())],
                ["C:/absolute.txt"],
                ["../one.txt"],
                ["one.txt", "one.txt"],
            ):
                with self.subTest(paths=paths), self.assertRaises(ArtifactCacheValidationError):
                    cache.admit(source, paths=paths, **common)

    def test_admit_rejects_symlink_paths_when_supported(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            source = root / "source"
            source.mkdir()
            (source / "one.txt").write_text("one", encoding="utf-8")
            cache = ContentAddressedArtifactCache(root / "cache")
            symlink = source / "linked.txt"
            try:
                symlink.symlink_to(source / "one.txt")
            except OSError:
                symlink.write_text("simulated reparse", encoding="utf-8")
                with patch(
                    "map_builder.content_addressed_artifact_cache._is_reparse_or_symlink",
                    side_effect=lambda path: Path(path) == symlink,
                ), self.assertRaises(ArtifactCacheValidationError):
                    cache.admit(source, source_identity="source", builder_identity="builder")
            else:
                with self.assertRaises(ArtifactCacheValidationError):
                    cache.admit(source, source_identity="source", builder_identity="builder")

    def test_lookup_rejects_identity_mismatch_and_missing_manifest_is_unavailable(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            source = root / "source"
            source.mkdir()
            (source / "one.txt").write_text("one", encoding="utf-8")
            cache = ContentAddressedArtifactCache(root / "cache")
            admitted = cache.admit(source, source_identity="source", builder_identity="builder")

            for source_identity, builder_identity in (
                ("different", "builder"),
                ("source", "different"),
            ):
                with self.subTest(
                    source_identity=source_identity,
                    builder_identity=builder_identity,
                ), self.assertRaises(ArtifactCacheValidationError):
                    cache.lookup(
                        admitted["manifestDigest"],
                        source_identity=source_identity,
                        builder_identity=builder_identity,
                        tree_digest=admitted["treeDigest"],
                    )
            missing = f"sha256:{'0' * 64}"
            self.assertIsNone(
                cache.lookup(
                    missing,
                    source_identity="source",
                    builder_identity="builder",
                    tree_digest=admitted["treeDigest"],
                )
            )
            with self.assertRaises(ArtifactCacheMissError):
                cache.restore(
                    missing,
                    root / "missing-target",
                    source_identity="source",
                    builder_identity="builder",
                    tree_digest=admitted["treeDigest"],
                )

    def test_corrupt_or_missing_object_never_changes_existing_restore_target(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            source = root / "source"
            source.mkdir()
            (source / "one.txt").write_text("one", encoding="utf-8")
            cache = ContentAddressedArtifactCache(root / "cache")
            admitted = cache.admit(source, source_identity="source", builder_identity="builder")
            target = root / "target"
            target.mkdir()
            (target / "sentinel.txt").write_text("keep", encoding="utf-8")
            object_path = cache._object_path(admitted["files"][0]["sha256"])

            object_path.write_bytes(b"damaged")
            with self.assertRaises(ArtifactCacheValidationError):
                cache.restore(
                    admitted["manifestDigest"],
                    target,
                    source_identity="source",
                    builder_identity="builder",
                    tree_digest=admitted["treeDigest"],
                )
            self.assertEqual((target / "sentinel.txt").read_text(encoding="utf-8"), "keep")
            self.assertEqual(sorted(path.name for path in target.iterdir()), ["sentinel.txt"])

            object_path.unlink()
            with self.assertRaises(ArtifactCacheValidationError):
                cache.restore(
                    admitted["manifestDigest"],
                    target,
                    source_identity="source",
                    builder_identity="builder",
                    tree_digest=admitted["treeDigest"],
                )
            self.assertEqual((target / "sentinel.txt").read_text(encoding="utf-8"), "keep")

    def test_materialization_failure_keeps_existing_restore_target_unchanged(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            source = root / "source"
            source.mkdir()
            (source / "one.txt").write_text("one", encoding="utf-8")
            cache = ContentAddressedArtifactCache(root / "cache")
            admitted = cache.admit(source, source_identity="source", builder_identity="builder")
            target = root / "target"
            target.mkdir()
            (target / "sentinel.txt").write_text("keep", encoding="utf-8")

            with patch(
                "map_builder.content_addressed_artifact_cache.shutil.copyfile",
                side_effect=OSError("simulated copy failure"),
            ), self.assertRaises(OSError):
                cache.restore(
                    admitted["manifestDigest"],
                    target,
                    source_identity="source",
                    builder_identity="builder",
                    tree_digest=admitted["treeDigest"],
                )

            self.assertEqual((target / "sentinel.txt").read_text(encoding="utf-8"), "keep")
            self.assertEqual(sorted(path.name for path in target.iterdir()), ["sentinel.txt"])

    def test_replace_failure_rolls_back_existing_restore_target(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            source = root / "source"
            source.mkdir()
            (source / "one.txt").write_text("one", encoding="utf-8")
            cache = ContentAddressedArtifactCache(root / "cache")
            admitted = cache.admit(source, source_identity="source", builder_identity="builder")
            target = root / "target"
            target.mkdir()
            (target / "sentinel.txt").write_text("keep", encoding="utf-8")
            real_replace = os.replace

            def fail_staged_replace(source_path, destination_path) -> None:
                if Path(source_path).name == "artifact" and Path(destination_path) == target:
                    raise OSError("simulated replace failure")
                real_replace(source_path, destination_path)

            with patch(
                "map_builder.content_addressed_artifact_cache.os.replace",
                side_effect=fail_staged_replace,
            ), self.assertRaises(OSError):
                cache.restore(
                    admitted["manifestDigest"],
                    target,
                    source_identity="source",
                    builder_identity="builder",
                    tree_digest=admitted["treeDigest"],
                )

            self.assertEqual((target / "sentinel.txt").read_text(encoding="utf-8"), "keep")
            self.assertEqual(sorted(path.name for path in target.iterdir()), ["sentinel.txt"])

    def test_cache_rejects_reparse_root_objects_and_manifests_directories(self) -> None:
        for internal_name, operation in (
            ("<root>", "admit"),
            ("objects", "admit"),
            ("manifests", "lookup"),
        ):
            with self.subTest(internal_name=internal_name), tempfile.TemporaryDirectory() as tmp_dir:
                root = Path(tmp_dir)
                source = root / "source"
                source.mkdir()
                (source / "one.txt").write_text("one", encoding="utf-8")
                cache = ContentAddressedArtifactCache(root / "cache")
                hostile_directory = cache.root if internal_name == "<root>" else cache.root / internal_name
                hostile_directory.mkdir(parents=True)

                with patch(
                    "map_builder.content_addressed_artifact_cache._is_reparse_or_symlink",
                    side_effect=lambda path, hostile=hostile_directory: Path(path) == hostile,
                ), self.assertRaises(ArtifactCacheValidationError):
                    if operation == "admit":
                        cache.admit(source, source_identity="source", builder_identity="builder")
                    else:
                        cache.lookup(
                            f"sha256:{'0' * 64}",
                            source_identity="source",
                            builder_identity="builder",
                            tree_digest=f"sha256:{'1' * 64}",
                        )

    def test_cache_rechecks_digest_prefix_directory_before_object_read(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            source = root / "source"
            source.mkdir()
            (source / "one.txt").write_text("one", encoding="utf-8")
            cache = ContentAddressedArtifactCache(root / "cache")
            admitted = cache.admit(source, source_identity="source", builder_identity="builder")
            object_path = cache._object_path(admitted["files"][0]["sha256"])
            hostile_prefix = object_path.parent

            with patch(
                "map_builder.content_addressed_artifact_cache._is_reparse_or_symlink",
                side_effect=lambda path: Path(path) == hostile_prefix,
            ), self.assertRaises(ArtifactCacheValidationError):
                cache.lookup(
                    admitted["manifestDigest"],
                    source_identity="source",
                    builder_identity="builder",
                    tree_digest=admitted["treeDigest"],
                )


if __name__ == "__main__":
    unittest.main()
