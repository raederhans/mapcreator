from __future__ import annotations

import json
import tempfile
import unittest
import uuid
from pathlib import Path

from tools import build_pages_dist
from tools import pages_artifact_shadow as shadow


REQUIRED_FILES = (
    "index.html",
    "app/index.html",
    ".nojekyll",
    "app/js/main.js",
    "app/data/CATALOG.json",
    "app/data/scenarios/index.json",
)


def write_fixture_dist(root: Path) -> None:
    for relative_path in REQUIRED_FILES:
        path = root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f"fixture:{relative_path}\n", encoding="utf-8")

    manifest_path = root / shadow.MANIFEST_NAME
    payload = {
        "schema_version": 2,
        "total_bytes": 0,
        "max_allowed_bytes": 1024 * 1024,
        "size_gate": {"status": "within_limit"},
        "required_files": list(REQUIRED_FILES),
        "reachability_inventory": {"admission": {"status": "complete"}},
        "files": [],
    }
    for _ in range(20):
        manifest_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        snapshot = shadow.build_tree_snapshot(root)
        next_payload = dict(payload)
        next_payload["total_bytes"] = snapshot["totalBytes"]
        next_payload["files"] = [
            {
                "path": record["path"],
                "size_bytes": record["sizeBytes"],
                "source_kind": "dist",
            }
            for record in snapshot["files"]
        ]
        if next_payload == payload:
            return
        payload = next_payload
    raise AssertionError("fixture manifest did not stabilize")


def fixture_identity(suffix: str = "a") -> dict[str, str]:
    return {
        "sha": suffix * 40,
        "tree": ("b" if suffix == "a" else "c") * 40,
        "rollbackDistTree": ("d" if suffix == "a" else "e") * 40,
    }


class PagesArtifactShadowTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.tracked = self.root / "tracked-dist"
        self.artifact = self.root / "artifact-dist"
        write_fixture_dist(self.tracked)
        write_fixture_dist(self.artifact)

    def tearDown(self) -> None:
        build_pages_dist.configure_dist_root()
        self.temp_dir.cleanup()

    def test_equal_artifact_proves_manifest_tree_and_file_hash_equivalence(self) -> None:
        comparison = shadow.build_comparison(
            self.artifact,
            evidence_run_id="run-1",
            tracked_root=self.tracked,
            git_identity=fixture_identity(),
        )
        self.assertEqual(comparison["status"], "passed")
        self.assertTrue(comparison["equivalence"]["manifestSha256Matches"])
        self.assertTrue(comparison["equivalence"]["treeSha256Matches"])
        self.assertTrue(comparison["equivalence"]["fileSha256Matches"])
        self.assertEqual(comparison["artifact"]["treeSha256"], comparison["tracked"]["treeSha256"])
        shadow.validate_comparison(comparison)

    def test_tampered_payload_or_manifest_fails_closed(self) -> None:
        (self.artifact / "app" / "js" / "main.js").write_text("tampered\n", encoding="utf-8")
        with self.assertRaisesRegex(shadow.ShadowVerificationError, "byte-equivalent|manifest"):
            shadow.build_comparison(self.artifact, evidence_run_id="run-1", tracked_root=self.tracked, git_identity=fixture_identity())

        write_fixture_dist(self.artifact)
        manifest_path = self.artifact / shadow.MANIFEST_NAME
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
        payload["reachability_inventory"]["admission"]["status"] = "incomplete"
        manifest_path.write_text(json.dumps(payload), encoding="utf-8")
        with self.assertRaisesRegex(shadow.ShadowVerificationError, "path/size|reachability"):
            shadow.build_comparison(self.artifact, evidence_run_id="run-1", tracked_root=self.tracked, git_identity=fixture_identity())

    def test_receipt_chain_requires_same_identity_and_three_green_runs(self) -> None:
        comparisons = [
            shadow.build_comparison(
                self.artifact,
                evidence_run_id=f"run-{index}",
                tracked_root=self.tracked,
                git_identity=fixture_identity(),
            )
            for index in range(1, 4)
        ]
        first = shadow.build_receipt(comparisons[0], public_smoke="passed")
        second = shadow.build_receipt(comparisons[1], public_smoke="passed", previous=first)
        third = shadow.build_receipt(comparisons[2], public_smoke="passed", previous=second)
        self.assertEqual(len({comparison["comparisonSha256"] for comparison in comparisons}), 3)
        self.assertEqual([first["consecutiveGreenRuns"], second["consecutiveGreenRuns"], third["consecutiveGreenRuns"]], [1, 2, 3])
        self.assertEqual(third["evidenceRunIds"], ["run-1", "run-2", "run-3"])
        self.assertFalse(first["trackedDistRetirementEligible"])
        self.assertTrue(third["trackedDistRetirementEligible"])
        self.assertTrue(third["legacyTrackedDistRetained"])

    def test_receipt_failure_and_identity_change_reset_green_counter(self) -> None:
        comparison = shadow.build_comparison(self.artifact, evidence_run_id="run-1", tracked_root=self.tracked, git_identity=fixture_identity())
        first = shadow.build_receipt(comparison, public_smoke="passed")
        failed_comparison = shadow.build_comparison(self.artifact, evidence_run_id="run-2", tracked_root=self.tracked, git_identity=fixture_identity())
        failed = shadow.build_receipt(failed_comparison, public_smoke="failed", previous=first)
        self.assertEqual(failed["consecutiveGreenRuns"], 0)
        restarted_comparison = shadow.build_comparison(self.artifact, evidence_run_id="run-3", tracked_root=self.tracked, git_identity=fixture_identity())
        restarted = shadow.build_receipt(restarted_comparison, public_smoke="passed", previous=failed)
        self.assertEqual(restarted["consecutiveGreenRuns"], 1)

        changed = shadow.build_comparison(self.artifact, evidence_run_id="run-4", tracked_root=self.tracked, git_identity=fixture_identity("f"))
        reset = shadow.build_receipt(changed, public_smoke="passed", previous=restarted)
        self.assertEqual(reset["consecutiveGreenRuns"], 1)
        self.assertFalse(reset["trackedDistRetirementEligible"])

    def test_receipt_tampering_and_duplicate_run_id_are_rejected(self) -> None:
        comparison = shadow.build_comparison(self.artifact, evidence_run_id="run-1", tracked_root=self.tracked, git_identity=fixture_identity())
        first = shadow.build_receipt(comparison, public_smoke="passed")
        with self.assertRaisesRegex(shadow.ShadowVerificationError, "must not repeat"):
            shadow.build_receipt(comparison, public_smoke="passed", previous=first)

        path = self.root / "receipt.json"
        shadow.write_json(path, first)
        tampered = json.loads(path.read_text(encoding="utf-8"))
        tampered["consecutiveGreenRuns"] = 99
        path.write_text(json.dumps(tampered), encoding="utf-8")
        with self.assertRaisesRegex(shadow.ShadowVerificationError, "hash mismatch"):
            shadow.load_receipt(path)

        forged = dict(first)
        forged["consecutiveGreenRuns"] = 3
        forged["trackedDistRetirementEligible"] = False
        forged["receiptSha256"] = shadow.receipt_hash(forged)
        with self.assertRaisesRegex(shadow.ShadowVerificationError, "retirement eligibility"):
            second_comparison = shadow.build_comparison(self.artifact, evidence_run_id="run-2", tracked_root=self.tracked, git_identity=fixture_identity())
            shadow.build_receipt(second_comparison, public_smoke="passed", previous=forged)

    def test_output_root_is_runtime_only_and_never_reuses_existing_artifact(self) -> None:
        runtime_root = build_pages_dist.ROOT / ".runtime" / f"pages-artifact-shadow-test-{uuid.uuid4().hex}"
        self.assertEqual(build_pages_dist.configure_dist_root(runtime_root), runtime_root.resolve())
        build_pages_dist.configure_dist_root()
        runtime_root.mkdir(parents=True)
        (runtime_root / "owned-evidence.json").write_text("{}\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "absent or empty"):
            build_pages_dist.configure_dist_root(runtime_root)
        with self.assertRaisesRegex(ValueError, "repository .runtime"):
            build_pages_dist.configure_dist_root(self.root / "outside-runtime")
        with self.assertRaisesRegex(ValueError, "must not name tracked dist"):
            build_pages_dist.main(["--output-root", "dist"])

    def test_cli_paths_are_runtime_only_and_reparse_safe(self) -> None:
        runtime_candidate = shadow.ROOT / ".runtime" / f"pages-artifact-shadow-test-{uuid.uuid4().hex}.json"
        self.assertEqual(
            shadow.validate_cli_runtime_path(runtime_candidate, label="comparison output"),
            runtime_candidate.resolve(),
        )
        with self.assertRaisesRegex(shadow.ShadowVerificationError, "repository .runtime"):
            shadow.validate_cli_runtime_path(self.root / "outside.json", label="comparison output")


if __name__ == "__main__":
    unittest.main()
