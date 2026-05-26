from __future__ import annotations

import unittest

from tools import build_global_bathymetry_asset as bathymetry_asset


class BuildGlobalBathymetryAssetTest(unittest.TestCase):
    def test_build_geo_dataframe_keeps_empty_geometry_column(self) -> None:
        gdf = bathymetry_asset.build_geo_dataframe([])

        self.assertEqual(list(gdf.columns), ["geometry"])
        self.assertEqual(str(gdf.crs), "EPSG:4326")
        self.assertEqual(len(gdf), 0)

    def test_build_topology_payload_accepts_empty_inputs(self) -> None:
        payload = bathymetry_asset.build_topology_payload([], [])

        self.assertIn("objects", payload)
        self.assertIn("bathymetry_bands", payload["objects"])
        self.assertIn("bathymetry_contours", payload["objects"])


if __name__ == "__main__":
    unittest.main()
