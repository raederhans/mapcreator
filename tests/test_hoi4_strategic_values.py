from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from scenario_builder.hoi4.models import RuntimeFeatureRecord, StateRecord
from scenario_builder.hoi4.strategic import (
    build_strategic_values_payload,
    decode_runtime_feature_centroids,
    parse_victory_point_localisation,
)


def miniature_topology() -> dict:
    return {
        "type": "Topology",
        "transform": {"scale": [1, 1], "translate": [0, 0]},
        "arcs": [
            [[0, 0], [2, 0], [0, 2], [-2, 0], [0, -2]],
            [[10, 0], [2, 0], [0, 2], [-2, 0], [0, -2]],
            [[20, 0], [2, 0], [0, 2], [-2, 0], [0, -2]],
        ],
        "objects": {
            "political": {
                "type": "GeometryCollection",
                "geometries": [
                    {"type": "Polygon", "id": "POL-A", "properties": {"id": "POL-A"}, "arcs": [[0]]},
                    {"type": "Polygon", "id": "POL-B", "properties": {"id": "POL-B"}, "arcs": [[1]]},
                    {"type": "Polygon", "id": "GER-A", "properties": {"id": "GER-A"}, "arcs": [[2]]},
                ],
            }
        },
    }


class Hoi4StrategicValuesTest(unittest.TestCase):
    def test_parse_victory_point_localisation_collects_tag_aliases(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "victory_points_l_english.yml"
            path.write_text(
                """
                l_english:
                  VICTORY_POINTS_3544: "Warsaw"
                  GER_VICTORY_POINTS_3544: "Warschau"
                """,
                encoding="utf-8-sig",
            )
            self.assertEqual(parse_victory_point_localisation(path), {3544: ["Warsaw", "Warschau"]})

    def test_decode_runtime_feature_centroids_handles_topojson_arcs(self) -> None:
        centroids = decode_runtime_feature_centroids(miniature_topology())

        self.assertAlmostEqual(centroids["POL-A"][0], 0.8)
        self.assertAlmostEqual(centroids["POL-A"][1], 0.8)
        self.assertAlmostEqual(centroids["POL-B"][0], 10.8)
        self.assertAlmostEqual(centroids["POL-B"][1], 0.8)

    def test_build_payload_attributes_features_and_metrics(self) -> None:
        states = {
            10: StateRecord(
                state_id=10,
                file_name="10-Poland.txt",
                owner_tag="POL",
                controller_tag="POL",
                core_tags=["POL"],
                province_ids=[3544],
                state_category="city",
                manpower=3000000,
                victory_points=[(3544, 25)],
                resources={"steel": 6},
                buildings={"infrastructure": 7, "arms_factory": 2, "industrial_complex": 3},
            ),
            11: StateRecord(
                state_id=11,
                file_name="11-Poland.txt",
                owner_tag="POL",
                controller_tag="POL",
                core_tags=["POL"],
                province_ids=[5000],
                state_category="rural",
                manpower=1000000,
                resources={"oil": 3},
                buildings={"infrastructure": 4},
            ),
            12: StateRecord(
                state_id=12,
                file_name="12-Germany.txt",
                owner_tag="GER",
                controller_tag="GER",
                core_tags=["GER"],
                province_ids=[6000],
                state_category="rural",
                manpower=500000,
                resources={"steel": 2},
            ),
        }
        cities = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [1, 1]},
                    "properties": {
                        "city_id": "CITY::warsaw",
                        "stable_key": "id::warsaw",
                        "name": "Warsaw",
                        "name_ascii": "Warsaw",
                        "host_feature_id": "POL-A",
                        "population": 1000000,
                    },
                }
            ],
        }
        payload = build_strategic_values_payload(
            scenario_id="hoi4_test",
            baseline_hash="abc123",
            as_of_date="1936.1.1.12",
            states_by_id=states,
            runtime_features=[
                RuntimeFeatureRecord(feature_id="POL-A", country_code="PL", name="A"),
                RuntimeFeatureRecord(feature_id="POL-B", country_code="PL", name="B"),
                RuntimeFeatureRecord(feature_id="GER-A", country_code="DE", name="C"),
            ],
            assignments={"POL-A": "POL", "POL-B": "POL", "GER-A": "GER"},
            runtime_topology_payload=miniature_topology(),
            vp_localisation={3544: ["Warsaw"]},
            world_cities_payload=cities,
        )

        self.assertEqual(payload["scenario_id"], "hoi4_test")
        self.assertEqual(payload["baseline_hash"], "abc123")
        self.assertEqual(payload["victory_points"][0]["match_method"], "name_owner_match")
        self.assertEqual(payload["bucket_by_feature"]["POL-A"], "s10")
        self.assertEqual(payload["bucket_by_feature"]["POL-B"], "s10")
        self.assertEqual(payload["bucket_by_feature"]["GER-A"], "pool:GER")
        self.assertEqual(payload["buckets"]["s10"]["military_factories"], 2)
        self.assertEqual(payload["buckets"]["s10"]["civilian_factories"], 3)
        self.assertEqual(payload["buckets"]["s10"]["factories_total"], 5)
        self.assertEqual(payload["buckets"]["pool:POL"]["infrastructure"], 4)
        self.assertEqual(payload["buckets"]["pool:GER"]["infrastructure"], 0)
        self.assertGreaterEqual(payload["metrics"]["manpower"]["p95"], 3000000)
        self.assertEqual(payload["metrics"]["infrastructure"]["max"], 7)
        self.assertEqual(payload["diagnostics"]["vp_total"], 1)
        self.assertEqual(payload["diagnostics"]["vp_matched"], 1)
        self.assertEqual(payload["diagnostics"]["states_anchored"], 1)
        self.assertEqual(payload["diagnostics"]["states_pooled"], 2)
        resources = payload["resource_points"]["features"]
        self.assertTrue(any(feature["properties"]["resource"] == "steel" for feature in resources))


if __name__ == "__main__":
    unittest.main()
