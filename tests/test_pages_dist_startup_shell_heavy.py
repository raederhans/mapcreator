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


if __name__ == "__main__":
    unittest.main()
