import unittest
from unittest.mock import patch

import geopandas as gpd
from shapely.geometry import MultiPolygon, box
import topojson as tp

from map_builder.processors import africa_admin1
from tools.build_runtime_political_topology import _compose_political_features


def _political_topology(gdf: gpd.GeoDataFrame) -> dict:
    return tp.Topology(
        [gdf],
        object_name=["political"],
        topology=True,
        prequantize=False,
    ).to_dict()


class PoliticalTopologyGapContractTests(unittest.TestCase):
    def test_runtime_composition_keeps_uncovered_french_overseas_components(self) -> None:
        primary = gpd.GeoDataFrame(
            [
                {
                    "id": "FR",
                    "name": "France",
                    "cntr_code": "FR",
                    "geometry": MultiPolygon(
                        [
                            box(0.0, 0.0, 4.0, 4.0),
                            box(-54.6, 2.1, -51.6, 5.8),
                            box(-61.6, 16.1, -61.5, 16.3),
                            box(-61.4, 15.9, -61.3, 16.0),
                        ]
                    ),
                }
            ],
            crs="EPSG:4326",
        )
        detail = gpd.GeoDataFrame(
            [
                {
                    "id": "FR_DETAIL",
                    "name": "France detail",
                    "cntr_code": "FR",
                    "geometry": box(0.0, 0.0, 4.0, 4.0),
                }
            ],
            crs="EPSG:4326",
        )

        result = _compose_political_features(
            _political_topology(primary),
            _political_topology(detail),
            override_collection=None,
        )

        codes = set(result["cntr_code"].astype(str))
        self.assertIn("FR", codes)
        self.assertIn("GF", codes)
        gf = result.loc[result["cntr_code"] == "GF"].iloc[0]
        self.assertEqual(gf["id"], "GF_PRIMARY")
        self.assertEqual(gf["__source"], "primary_gap")
        self.assertLessEqual(gf.geometry.bounds[0], -54.5)
        self.assertGreaterEqual(gf.geometry.bounds[2], -51.7)
        gp = result.loc[result["cntr_code"] == "GP"].iloc[0]
        self.assertEqual(gp["id"], "GP_PRIMARY")
        self.assertEqual(gp.geometry.geom_type, "MultiPolygon")
        self.assertLessEqual(gp.geometry.bounds[0], -61.59)
        self.assertGreaterEqual(gp.geometry.bounds[2], -61.31)

    def test_geoboundaries_override_preserves_source_union_when_shell_partly_overlaps(self) -> None:
        source = gpd.GeoDataFrame(
            [
                {
                    "shapeID": "SANAAG",
                    "shapeName": "Sanaag",
                    "geometry": box(0.0, 0.0, 4.0, 4.0),
                }
            ],
            crs="EPSG:4326",
        )
        old_shell = box(0.0, 0.0, 2.0, 4.0)
        spec = {
            "url": "memory://som",
            "filename": "geoBoundaries-SOM-ADM1.geojson",
            "expected_count": 1,
        }

        with patch.object(africa_admin1, "fetch_or_load_geojson", return_value=source):
            result = africa_admin1._build_geo_boundaries_features("SO", spec, old_shell)

        self.assertEqual(len(result), 1)
        self.assertEqual(result.iloc[0]["id"], "SO_ADM1_SANAAG")
        self.assertEqual(result.iloc[0]["name"], "Sanaag")
        self.assertGreaterEqual(result.geometry.iloc[0].bounds[2], 3.99)


if __name__ == "__main__":
    unittest.main()
