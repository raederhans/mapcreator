from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_MANIFEST = REPO_ROOT / "data" / "manifest.json"


def _resolve_manifest_output_path(relative_path: str) -> Path:
    if relative_path.startswith("js/"):
        return REPO_ROOT / relative_path
    return REPO_ROOT / "data" / relative_path


class DataManifestContractTest(unittest.TestCase):
    def test_manifest_output_hashes_match_checked_in_artifacts(self) -> None:
        manifest = json.loads(DATA_MANIFEST.read_text(encoding="utf-8"))
        mismatches: list[str] = []

        for relative_path, metadata in manifest["outputs"].items():
            output_path = _resolve_manifest_output_path(relative_path)
            if not output_path.is_file():
                mismatches.append(f"{relative_path}: missing")
                continue
            output_bytes = output_path.read_bytes()
            actual_size = output_path.stat().st_size
            actual_sha = hashlib.sha256(output_bytes).hexdigest()
            if metadata.get("size_bytes") != actual_size or metadata.get("sha256") != actual_sha:
                mismatches.append(f"{relative_path}: size/hash drift")

        self.assertEqual(mismatches, [])


if __name__ == "__main__":
    unittest.main()
