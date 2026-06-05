from __future__ import annotations

import tempfile
from pathlib import Path
import unittest

from tools.build_hgo_runtime_seed import DEFAULT_OUTPUT, build_runtime_seed


def write_minimal_hgo_source(
    root: Path,
    *,
    state_provinces: str = "1 2",
    state_owner: str = "AAA",
    state_controller: str | None = "BBB",
    extra_history: str = "",
) -> None:
    (root / "map").mkdir(parents=True)
    (root / "history" / "states").mkdir(parents=True)
    (root / "common" / "country_tags").mkdir(parents=True)
    (root / "common" / "countries").mkdir(parents=True)
    (root / "map" / "provinces.bmp").write_bytes(b"bmp")
    (root / "map" / "definition.csv").write_text(
        "\n".join(
            [
                "0;0;0;0;unknown;false;unknown;0",
                "1;10;20;30;land;false;plains;1",
                "2;11;21;31;land;false;forest;1",
                "3;12;22;32;sea;false;ocean;1",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    owner_line = f"    owner = {state_owner}\n" if state_owner else "    owner = \n"
    controller_line = f"    controller = {state_controller}\n" if state_controller is not None else ""
    (root / "history" / "states" / "1-Test-State.txt").write_text(
        f"""
state={{
  id=1
  name="STATE_TEST"
  state_category=town
  provinces={{ {state_provinces} }}
  history={{
{owner_line}{controller_line}
    add_core_of = AAA
    add_core_of = BBB
{extra_history}
  }}
}}
""",
        encoding="utf-8",
    )
    (root / "common" / "country_tags" / "00_countries.txt").write_text(
        'AAA = "countries/AAA - Testland.txt"\nBBB = "countries/BBB - Controller.txt"\n',
        encoding="utf-8",
    )
    (root / "common" / "countries" / "AAA - Testland.txt").write_text(
        "color = { 1 2 3 }\n",
        encoding="utf-8",
    )
    (root / "common" / "countries" / "BBB - Controller.txt").write_text(
        "color = rgb { 4 5 6 }\n",
        encoding="utf-8",
    )


class HgoRuntimeSeedBuilderTest(unittest.TestCase):
    def test_builds_runtime_seed_from_minimal_hgo_source(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            write_minimal_hgo_source(root)

            payload = build_runtime_seed(root, generated_at_utc="2026-06-05T00:00:00Z")

        self.assertEqual(payload["schema_version"], 1)
        self.assertEqual(payload["runtime_id"], "hgo_raster_runtime_seed")
        self.assertEqual(payload["generated_at_utc"], "2026-06-05T00:00:00Z")
        self.assertEqual(payload["summary"]["province_count"], 4)
        self.assertEqual(payload["summary"]["land_province_count"], 2)
        self.assertEqual(payload["summary"]["state_count"], 1)
        self.assertEqual(payload["summary"]["mapped_province_count"], 2)
        self.assertEqual(payload["province_to_state"], {"1": 1, "2": 1})
        self.assertEqual(payload["provinces"]["1"]["rgb_hex"], "#0A141E")
        self.assertEqual(payload["provinces"]["1"]["rgb_key"], 660510)
        self.assertEqual(payload["states"][0]["name_key"], "STATE_TEST")
        self.assertEqual(payload["states"][0]["owner"], "AAA")
        self.assertEqual(payload["states"][0]["controller"], "BBB")
        self.assertEqual(payload["states"][0]["core_tags"], ["AAA", "BBB"])
        self.assertEqual(payload["countries"]["AAA"]["color_hex"], "#010203")
        self.assertEqual(payload["countries"]["BBB"]["color_rgb"], [4, 5, 6])

    def test_state_history_dated_override_updates_owner_controller_and_cores(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            write_minimal_hgo_source(
                root,
                extra_history="""
    1939.1.1 = {
      owner = BBB
      controller = BBB
      add_core_of = CCC
      remove_core_of = AAA
    }
""",
            )

            payload = build_runtime_seed(
                root,
                generated_at_utc="2026-06-05T00:00:00Z",
                as_of_date="1939.1.1",
            )

        state = payload["states"][0]
        self.assertEqual(state["owner"], "BBB")
        self.assertEqual(state["controller"], "BBB")
        self.assertEqual(state["core_tags"], ["BBB", "CCC"])

    def test_missing_controller_falls_back_to_owner(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            write_minimal_hgo_source(root, state_controller=None)

            payload = build_runtime_seed(root)

        self.assertEqual(payload["states"][0]["owner"], "AAA")
        self.assertEqual(payload["states"][0]["controller"], "AAA")

    def test_default_output_stays_under_runtime_folder(self) -> None:
        self.assertEqual(DEFAULT_OUTPUT.parts[0], ".runtime")
        self.assertEqual(DEFAULT_OUTPUT.as_posix(), ".runtime/hgo_runtime/seed.json")

    def test_missing_required_source_path_hard_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            write_minimal_hgo_source(root)
            (root / "map" / "provinces.bmp").unlink()

            with self.assertRaisesRegex(FileNotFoundError, "map/provinces.bmp"):
                build_runtime_seed(root)

    def test_duplicate_province_rgb_hard_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            write_minimal_hgo_source(root)
            with (root / "map" / "definition.csv").open("a", encoding="utf-8") as handle:
                handle.write("4;10;20;30;land;false;plains;1\n")

            with self.assertRaisesRegex(ValueError, "Duplicate province RGB"):
                build_runtime_seed(root)

    def test_duplicate_province_id_hard_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            write_minimal_hgo_source(root)
            with (root / "map" / "definition.csv").open("a", encoding="utf-8") as handle:
                handle.write("1;20;30;40;land;false;plains;1\n")

            with self.assertRaisesRegex(ValueError, "Duplicate province id"):
                build_runtime_seed(root)

    def test_unknown_state_province_reference_hard_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            write_minimal_hgo_source(root, state_provinces="1 99")

            with self.assertRaisesRegex(ValueError, "unknown province ids"):
                build_runtime_seed(root)

    def test_duplicate_state_id_hard_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            write_minimal_hgo_source(root)
            (root / "history" / "states" / "1-Duplicate-State.txt").write_text(
                """
state={
  id=1
  name="STATE_DUPLICATE"
  provinces={ 3 }
  history={
    owner = BBB
  }
}
""",
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, "Duplicate state id"):
                build_runtime_seed(root)

    def test_duplicate_province_across_states_hard_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            write_minimal_hgo_source(root)
            (root / "history" / "states" / "2-Second-State.txt").write_text(
                """
state={
  id=2
  name="STATE_SECOND"
  provinces={ 2 3 }
  history={
    owner = BBB
  }
}
""",
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, "multiple states"):
                build_runtime_seed(root)

    def test_state_with_provinces_requires_owner(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            write_minimal_hgo_source(root, state_owner="")

            with self.assertRaisesRegex(ValueError, "no owner"):
                build_runtime_seed(root)


if __name__ == "__main__":
    unittest.main()
