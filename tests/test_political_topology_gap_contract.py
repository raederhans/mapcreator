import unittest
from unittest.mock import patch

import geopandas as gpd
from shapely.geometry import MultiPolygon, box
import topojson as tp

from map_builder import config as cfg
from map_builder.processors import africa_admin1
from tools.build_runtime_political_topology import _compose_political_features

EXPECTED_FR_RETENTION_RULES = {
    "GF": {
        "id": "GF_PRIMARY",
        "name": "French Guiana",
        "bounds": (-55.0, 1.5, -51.0, 6.5),
    },
    "GP": {
        "id": "GP_PRIMARY",
        "name": "Guadeloupe",
        "bounds": (-62.2, 15.5, -60.6, 16.8),
    },
    "MQ": {
        "id": "MQ_PRIMARY",
        "name": "Martinique",
        "bounds": (-61.4, 14.2, -60.7, 15.1),
    },
    "RE": {
        "id": "RE_PRIMARY",
        "name": "Reunion",
        "bounds": (55.0, -21.6, 56.1, -20.7),
    },
    "YT": {
        "id": "YT_PRIMARY",
        "name": "Mayotte",
        "bounds": (44.8, -13.2, 45.5, -12.4),
    },
}


def _political_topology(gdf: gpd.GeoDataFrame) -> dict:
    return tp.Topology(
        [gdf],
        object_name=["political"],
        topology=True,
        prequantize=False,
    ).to_dict()


class PoliticalTopologyGapContractTests(unittest.TestCase):
    def test_runtime_composition_keeps_uncovered_french_overseas_components(self) -> None:
        overseas_boxes = {
            "GF": box(-54.6, 2.1, -51.6, 5.8),
            "GP": box(-61.6, 16.1, -61.5, 16.3),
            "GP_EXTRA": box(-61.4, 15.9, -61.3, 16.0),
            "MQ": box(-61.2, 14.4, -60.9, 14.8),
            "RE": box(55.2, -21.3, 55.8, -20.9),
            "YT": box(45.0, -13.0, 45.2, -12.6),
        }
        primary = gpd.GeoDataFrame(
            [
                {
                    "id": "FR",
                    "name": "France",
                    "cntr_code": "FR",
                    "geometry": MultiPolygon(
                        [box(0.0, 0.0, 4.0, 4.0), *overseas_boxes.values()]
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
        configured = {
            str(rule["code"]): {
                "id": rule["id"],
                "name": rule["name"],
                "bounds": tuple(rule["bounds"]),
            }
            for rule in cfg.RUNTIME_PRIMARY_COMPONENT_RETENTION_RULES["FR"]
        }
        self.assertEqual(configured, EXPECTED_FR_RETENTION_RULES)
        for code, rule in EXPECTED_FR_RETENTION_RULES.items():
            self.assertIn(code, codes)
            row = result.loc[result["cntr_code"] == code].iloc[0]
            self.assertEqual(row["id"], rule["id"])
            self.assertEqual(row["name"], rule["name"])
            self.assertEqual(row["__source"], "primary_gap")
            min_x, min_y, max_x, max_y = rule["bounds"]
            rep = row.geometry.representative_point()
            self.assertLessEqual(min_x, rep.x)
            self.assertLessEqual(min_y, rep.y)
            self.assertGreaterEqual(max_x, rep.x)
            self.assertGreaterEqual(max_y, rep.y)
        gp = result.loc[result["cntr_code"] == "GP"].iloc[0]
        self.assertEqual(gp.geometry.geom_type, "MultiPolygon")
        self.assertLessEqual(gp.geometry.bounds[0], -61.59)
        self.assertGreaterEqual(gp.geometry.bounds[2], -61.31)

    def test_runtime_composition_drops_primary_component_with_meaningful_detail_overlap(self) -> None:
        primary = gpd.GeoDataFrame(
            [
                {
                    "id": "FR",
                    "name": "France",
                    "cntr_code": "FR",
                    "geometry": MultiPolygon(
                        [
                            box(0.0, 0.0, 4.0, 4.0),
                            box(10.0, 0.0, 12.0, 2.0),
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
                },
                {
                    "id": "FR_OVERLAP_DETAIL",
                    "name": "France overlap detail",
                    "cntr_code": "FR",
                    "geometry": box(10.0, 0.0, 10.5, 2.0),
                },
            ],
            crs="EPSG:4326",
        )

        result = _compose_political_features(
            _political_topology(primary),
            _political_topology(detail),
            override_collection=None,
        )

        retained_ids = set(result["id"].astype(str))
        self.assertNotIn("FR_PRIMARY_GAP_2", retained_ids)

    def test_geoboundaries_override_uses_source_union_shell(self) -> None:
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
        spec = {
            "url": "memory://som",
            "filename": "geoBoundaries-SOM-ADM1.geojson",
            "expected_count": 1,
        }

        with patch.object(africa_admin1, "fetch_or_load_geojson", return_value=source):
            result = africa_admin1._build_geo_boundaries_features("SO", spec)

        self.assertEqual(len(result), 1)
        self.assertEqual(result.iloc[0]["id"], "SO_ADM1_SANAAG")
        self.assertEqual(result.iloc[0]["name"], "Sanaag")
        self.assertGreaterEqual(result.geometry.iloc[0].bounds[2], 3.99)


if __name__ == "__main__":
    unittest.main()
