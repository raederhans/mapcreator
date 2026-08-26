from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from tools import check_heavy_test_classification as classification


class HeavyTestClassificationTests(unittest.TestCase):
    def make_fixture(
        self,
        root: Path,
        *,
        test_source: str,
        declared_paths: list[str],
    ) -> tuple[Path, Path]:
        tests_root = root / "tests"
        tests_root.mkdir()
        test_path = tests_root / "test_fixture.py"
        test_path.write_text(test_source, encoding="utf-8")
        manifest_path = tests_root / "heavy_dependency_groups.json"
        manifest_path.write_text(
            json.dumps({"geo_stack": {"patterns": declared_paths}}),
            encoding="utf-8",
        )
        return tests_root, manifest_path

    def violations_for(self, *, test_source: str, declared_paths: list[str]) -> list[str]:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            tests_root, manifest_path = self.make_fixture(
                root,
                test_source=test_source,
                declared_paths=declared_paths,
            )
            return classification.classification_violations(
                root=root,
                tests_root=tests_root,
                manifest_path=manifest_path,
            )

    def test_missing_heavy_test_is_reported(self) -> None:
        heavy_import = "from " + "shapely.geometry import Point\n"
        self.assertEqual(
            self.violations_for(test_source=heavy_import, declared_paths=[]),
            ["Heavy dependency test missing from grouping manifest: tests/test_fixture.py"],
        )

    def test_registered_heavy_test_passes(self) -> None:
        heavy_import = "import " + "numpy as np\n"
        self.assertEqual(
            self.violations_for(
                test_source=heavy_import,
                declared_paths=["tests/test_fixture.py"],
            ),
            [],
        )

    def test_stale_manifest_entry_is_reported(self) -> None:
        self.assertEqual(
            self.violations_for(
                test_source="import unittest\n",
                declared_paths=["tests/test_fixture.py"],
            ),
            ["Grouping manifest entry has no heavy dependency imports: tests/test_fixture.py"],
        )


if __name__ == "__main__":
    unittest.main()
