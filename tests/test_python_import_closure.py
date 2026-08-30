from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from tools.verification import python_import_closure


class PythonImportClosureTests(unittest.TestCase):
    def test_recursive_local_closure_can_prove_stdlib_only(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            package = root / "support"
            package.mkdir()
            (package / "__init__.py").write_text("from .helper import VALUE\n", encoding="utf-8")
            (package / "helper.py").write_text("import json\nVALUE = json.dumps({})\n", encoding="utf-8")
            target = root / "test_target.py"
            target.write_text("from support import VALUE\n", encoding="utf-8")

            report = python_import_closure.audit_paths([target], root=root)

        self.assertEqual(report["verdict"], "stdlib-only")
        self.assertEqual(
            report["roots"][0]["closureFiles"],
            ["support/__init__.py", "support/helper.py", "test_target.py"],
        )
        self.assertIn("json", report["stdlibImports"])

    def test_recursive_local_closure_reports_third_party_import(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            helper = root / "helper.py"
            helper.write_text("import shapely\n", encoding="utf-8")
            target = root / "test_target.py"
            target.write_text("import helper\n", encoding="utf-8")

            report = python_import_closure.audit_paths([target], root=root)

        self.assertEqual(report["verdict"], "external-or-unresolved")
        self.assertEqual(report["thirdPartyImports"], ["shapely"])

    def test_namespace_package_and_tool_peer_imports_are_local(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            tools = root / "tools"
            tools.mkdir()
            (tools / "helper.py").write_text("import json\n", encoding="utf-8")
            target = tools / "target.py"
            target.write_text(
                "from tools import helper\nimport helper\n",
                encoding="utf-8",
            )

            report = python_import_closure.audit_paths([target], root=root)

        self.assertEqual(report["verdict"], "stdlib-only")
        self.assertEqual(report["thirdPartyImports"], [])
        self.assertIn("tools/helper.py", report["roots"][0]["closureFiles"])

    def test_non_literal_dynamic_import_blocks_stdlib_proof(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            target = root / "test_target.py"
            target.write_text("name = 'json'\n__import__(name)\n", encoding="utf-8")

            report = python_import_closure.audit_paths([target], root=root)

        self.assertEqual(report["verdict"], "external-or-unresolved")
        self.assertEqual(report["unresolvedDynamicImports"], ["test_target.py:2"])

    def test_imported_dynamic_loader_is_audited(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            target = root / "test_target.py"
            target.write_text(
                "from importlib import import_module\nimport_module('third_party_plugin')\n",
                encoding="utf-8",
            )

            report = python_import_closure.audit_paths([target], root=root)

        self.assertEqual(report["verdict"], "external-or-unresolved")
        self.assertEqual(report["thirdPartyImports"], ["third_party_plugin"])

    def test_aliased_dynamic_loader_is_audited(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            target = root / "test_target.py"
            target.write_text(
                "import importlib as loader_module\n"
                "load = loader_module.import_module\n"
                "load('third_party_plugin')\n",
                encoding="utf-8",
            )

            report = python_import_closure.audit_paths([target], root=root)

        self.assertEqual(report["verdict"], "external-or-unresolved")
        self.assertEqual(report["thirdPartyImports"], ["third_party_plugin"])

    def test_relative_dynamic_loader_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            target = root / "test_target.py"
            target.write_text(
                "from importlib import import_module\nimport_module('.plugin', __package__)\n",
                encoding="utf-8",
            )

            report = python_import_closure.audit_paths([target], root=root)

        self.assertEqual(report["verdict"], "external-or-unresolved")
        self.assertEqual(report["unresolvedDynamicImports"], ["test_target.py:2"])


if __name__ == "__main__":
    unittest.main()
