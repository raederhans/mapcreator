from __future__ import annotations

import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
MAIN_JS = REPO_ROOT / "js" / "main.js"
DATA_SERVICE_JS = REPO_ROOT / "js" / "core" / "data_service.js"
SNAPSHOT_JS = REPO_ROOT / "js" / "core" / "mapcreator_snapshot.js"
LOAD_STATUS_DISPLAY_JS = REPO_ROOT / "js" / "core" / "load_status_display.js"


class MapcreatorSnapshotContractTest(unittest.TestCase):
    def test_main_registers_runtime_load_status_provider(self) -> None:
        content = MAIN_JS.read_text(encoding="utf-8")

        self.assertIn('./core/mapcreator_snapshot.js', content)
        self.assertIn('registerMapcreatorSnapshotProvider("loadStatus", "main_runtime"', content)
        self.assertIn('registerMapcreatorSnapshotProvider("version", "main_runtime"', content)
        self.assertIn("buildMainRuntimeLoadStatusSnapshot", content)

    def test_data_service_exports_read_only_snapshot_providers(self) -> None:
        content = DATA_SERVICE_JS.read_text(encoding="utf-8")

        self.assertIn('./mapcreator_snapshot.js', content)
        self.assertIn("export async function getAsset", content)
        self.assertIn("export async function getCatalogAsset", content)
        self.assertIn("export async function getTransportAsset", content)
        self.assertIn("export function getStatusSnapshot", content)
        self.assertIn("export function getMetricsSnapshot", content)
        self.assertIn('registerMapcreatorSnapshotProvider("assets", "data_service"', content)
        self.assertIn('registerMapcreatorSnapshotProvider("loadStatus", "data_service"', content)
        self.assertIn('registerMapcreatorSnapshotProvider("version", "data_service"', content)

    def test_snapshot_bridge_installs_global_read_only_surface(self) -> None:
        content = SNAPSHOT_JS.read_text(encoding="utf-8")

        self.assertIn("globalThis.__mapcreator__", content)
        self.assertIn("ensureMapcreatorSnapshotGlobal", content)
        self.assertIn("registerMapcreatorSnapshotProvider", content)
        self.assertIn("getMapcreatorSnapshot", content)
        self.assertIn('SECTION_NAMES = ["assets", "loadStatus", "perf", "diag", "version"]', content)
        self.assertIn("snapshotApi", content)
        self.assertIn("loadStatusDisplay", content)
        self.assertIn("formatLoadStatus", content)
        self.assertIn("shouldWarnOnProviderReplace", content)

    def test_load_status_display_helper_is_wired_from_snapshot_bridge(self) -> None:
        snapshot_content = SNAPSHOT_JS.read_text(encoding="utf-8")
        display_content = LOAD_STATUS_DISPLAY_JS.read_text(encoding="utf-8")

        self.assertIn('./load_status_display.js', snapshot_content)
        self.assertIn("normalizeLoadStatusForDisplay", snapshot_content)
        self.assertIn("export function normalizeLoadStatusForDisplay", display_content)
        self.assertIn('providerKey === "data_service"', display_content)
        self.assertIn('providerKey === "main_runtime"', display_content)


if __name__ == "__main__":
    unittest.main()
