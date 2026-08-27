from __future__ import annotations

import unittest
from unittest.mock import patch

from tests.test_pages_dist_startup_shell import import_landing_builder


class PagesDistStartupShellHeavyTest(unittest.TestCase):

    def test_landing_valid_geometry_recovers_from_mixed_dimension_make_valid_error(self) -> None:
        from shapely.errors import GEOSException
        from shapely.geometry import Polygon

        build_landing_europe_1936_showcase = import_landing_builder("build_landing_europe_1936_showcase")
        bowtie = Polygon([(0, 0), (1, 1), (1, 0), (0, 1), (0, 0)])

        with patch.object(
            build_landing_europe_1936_showcase,
            "make_valid",
            side_effect=GEOSException("IllegalArgumentException: Overlay input is mixed-dimension"),
        ):
            geometry = build_landing_europe_1936_showcase.valid_geometry(bowtie)

        self.assertFalse(geometry.is_empty)
        self.assertTrue(geometry.is_valid)

    def test_landing_polygon_path_renders_geometry_collection_polygons(self) -> None:
        from shapely.geometry import GeometryCollection, LineString, Polygon

        build_landing_europe_1936_showcase = import_landing_builder("build_landing_europe_1936_showcase")
        canvas = build_landing_europe_1936_showcase.Canvas.create(100, 100, (0, 0, 2, 2))
        geometry = GeometryCollection([
            LineString([(0, 0), (1, 1)]),
            Polygon([(0, 0), (1, 0), (1, 1), (0, 0)]),
        ])

        paths = build_landing_europe_1936_showcase.polygon_path(geometry, canvas)

        self.assertEqual(len(paths), 1)
        self.assertTrue(paths[0].startswith("M"))

    def test_landing_canvas_ignores_sub_precision_projection_drift(self) -> None:
        build_landing_europe_1936_showcase = import_landing_builder("build_landing_europe_1936_showcase")
        reference = build_landing_europe_1936_showcase.Canvas.create(980, 680, (-12.5, 34.0, 41.5, 72.5))
        reference_point = reference.project(10.0, 52.0)
        project_laea = build_landing_europe_1936_showcase.project_laea

        with patch.object(
            build_landing_europe_1936_showcase,
            "project_laea",
            side_effect=lambda lon, lat: tuple(value + 1e-14 for value in project_laea(lon, lat)),
        ):
            perturbed = build_landing_europe_1936_showcase.Canvas.create(980, 680, (-12.5, 34.0, 41.5, 72.5))
            perturbed_point = perturbed.project(10.0, 52.0)

        self.assertEqual(perturbed.projected_bounds, reference.projected_bounds)
        self.assertEqual(perturbed.scale, reference.scale)
        self.assertEqual(perturbed.offset_x, reference.offset_x)
        self.assertEqual(perturbed.offset_y, reference.offset_y)
        self.assertEqual(perturbed_point, reference_point)

    def test_landing_geometry_uses_a_fixed_precision_grid(self) -> None:
        from shapely.geometry import Polygon

        build_landing_europe_1936_showcase = import_landing_builder("build_landing_europe_1936_showcase")
        reference = Polygon([(0, 0), (2, 0), (2, 2), (0, 2), (0, 0)])
        perturbed = Polygon([
            (4e-10, 4e-10),
            (2 + 4e-10, 4e-10),
            (2 + 4e-10, 2 + 4e-10),
            (4e-10, 2 + 4e-10),
            (4e-10, 4e-10),
        ])

        canonical_reference = build_landing_europe_1936_showcase.canonicalize_hero_geometry(reference)
        canonical_perturbed = build_landing_europe_1936_showcase.canonicalize_hero_geometry(perturbed)

        self.assertEqual(canonical_perturbed.wkb_hex, canonical_reference.wkb_hex)


if __name__ == "__main__":
    unittest.main()
