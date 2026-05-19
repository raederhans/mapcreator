from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from tools.check_source_ledger import validate_source_ledger_entries


def _sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _ledger_entry(
    *,
    source_id: str,
    local_path: str,
    local_sha: str,
    provenance_sidecar: str,
    status: str,
    local_presence: str,
    consumers: list[str],
) -> dict[str, object]:
    return {
        "source_id": source_id,
        "local_path": local_path,
        "origin_kind": "download",
        "upstream_url": "https://example.test/source.geojson",
        "immutable_ref": "fixture",
        "current_local_sha256": local_sha,
        "license": "",
        "citation": "https://example.test",
        "consumers": consumers,
        "rebuild_command": "python fixture.py",
        "provenance_sidecar": provenance_sidecar,
        "status": status,
        "local_presence": local_presence,
    }


class SourceLedgerContractTest(unittest.TestCase):
    def test_pending_upgrade_review_missing_local_source_warns(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            project_root = Path(temp_dir)
            consumer_path = project_root / "consumer.py"
            consumer_path.write_text("# fixture\n", encoding="utf-8")
            entry = _ledger_entry(
                source_id="fixture_pending",
                local_path="data/missing.geojson",
                local_sha="",
                provenance_sidecar="data/missing.provenance.json",
                status="pending_upgrade_review",
                local_presence="optional_cache",
                consumers=["consumer.py"],
            )

            report = validate_source_ledger_entries([entry], project_root=project_root)

            self.assertEqual(report["failures"], [])
            self.assertEqual(report["validated_entries"], 0)
            self.assertIn("[fixture_pending] missing optional local_path=", report["warnings"][0])

    def test_frozen_verified_missing_local_source_fails(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            project_root = Path(temp_dir)
            consumer_path = project_root / "consumer.py"
            consumer_path.write_text("# fixture\n", encoding="utf-8")
            entry = _ledger_entry(
                source_id="fixture_frozen",
                local_path="data/missing.geojson",
                local_sha="",
                provenance_sidecar="data/missing.provenance.json",
                status="frozen_verified",
                local_presence="required",
                consumers=["consumer.py"],
            )

            report = validate_source_ledger_entries([entry], project_root=project_root)

            self.assertEqual(report["warnings"], [])
            self.assertEqual(report["validated_entries"], 0)
            self.assertIn("[fixture_frozen] missing local_path=", report["failures"][0])

    def test_pending_upgrade_review_required_local_source_fails_when_missing(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            project_root = Path(temp_dir)
            consumer_path = project_root / "consumer.py"
            consumer_path.write_text("# fixture\n", encoding="utf-8")
            entry = _ledger_entry(
                source_id="fixture_required_pending",
                local_path="data/missing.geojson",
                local_sha="",
                provenance_sidecar="data/missing.provenance.json",
                status="pending_upgrade_review",
                local_presence="required",
                consumers=["consumer.py"],
            )

            report = validate_source_ledger_entries([entry], project_root=project_root)

            self.assertEqual(report["warnings"], [])
            self.assertEqual(report["validated_entries"], 0)
            self.assertIn("[fixture_required_pending] missing local_path=", report["failures"][0])

    def test_existing_local_source_validates_hash_and_provenance(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            project_root = Path(temp_dir)
            data_root = project_root / "data"
            data_root.mkdir()
            consumer_path = project_root / "consumer.py"
            consumer_path.write_text("# fixture\n", encoding="utf-8")
            payload = b'{"type":"FeatureCollection","features":[]}\n'
            local_path = data_root / "source.geojson"
            provenance_path = data_root / "source.provenance.json"
            local_path.write_bytes(payload)
            local_sha = _sha256_bytes(payload)
            provenance_path.write_text(json.dumps({"sha256": local_sha}), encoding="utf-8")
            entry = _ledger_entry(
                source_id="fixture_checked_in",
                local_path="data/source.geojson",
                local_sha=local_sha,
                provenance_sidecar="data/source.provenance.json",
                status="frozen_verified",
                local_presence="required",
                consumers=["consumer.py"],
            )

            report = validate_source_ledger_entries([entry], project_root=project_root)

            self.assertEqual(report["failures"], [])
            self.assertEqual(report["warnings"], [])
            self.assertEqual(report["validated_entries"], 1)


if __name__ == "__main__":
    unittest.main()
