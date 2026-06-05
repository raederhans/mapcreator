from __future__ import annotations

import json
import subprocess
import struct
import sys
import tempfile
from pathlib import Path
import unittest

from tools.build_hgo_runtime_assets import read_bmp_header
from tools.build_hgo_runtime_seed import (
    DEFAULT_COUNTRY_COLOR_SOURCES,
    DEFAULT_COUNTRY_COLOR_SOURCE,
    DEFAULT_OUTPUT,
    DEFAULT_SMOKE_REPORT,
    build_runtime_seed,
    build_smoke_report,
    dump_json,
)

REPO_ROOT = Path(__file__).resolve().parents[1]


def write_bmp24(path: Path, rows: list[list[tuple[int, int, int]]]) -> None:
    height = len(rows)
    width = len(rows[0]) if rows else 0
    row_stride = ((width * 3 + 3) // 4) * 4
    pixel_bytes = bytearray()
    for row in reversed(rows):
        row_bytes = bytearray()
        for red, green, blue in row:
            row_bytes.extend([blue, green, red])
        row_bytes.extend(b"\x00" * (row_stride - len(row_bytes)))
        pixel_bytes.extend(row_bytes)
    file_size = 54 + len(pixel_bytes)
    header = bytearray()
    header.extend(b"BM")
    header.extend(struct.pack("<I", file_size))
    header.extend(struct.pack("<HH", 0, 0))
    header.extend(struct.pack("<I", 54))
    header.extend(struct.pack("<I", 40))
    header.extend(struct.pack("<i", width))
    header.extend(struct.pack("<i", height))
    header.extend(struct.pack("<H", 1))
    header.extend(struct.pack("<H", 24))
    header.extend(struct.pack("<I", 0))
    header.extend(struct.pack("<I", len(pixel_bytes)))
    header.extend(struct.pack("<i", 2835))
    header.extend(struct.pack("<i", 2835))
    header.extend(struct.pack("<I", 0))
    header.extend(struct.pack("<I", 0))
    path.write_bytes(bytes(header) + bytes(pixel_bytes))


def write_minimal_hgo_source(
    root: Path,
    *,
    state_provinces: str = "1 2",
    state_owner: str = "AAA",
    state_controller: str | None = "BBB",
    extra_history: str = "",
) -> None:
    # 测试源树只保留 builder 必需的 HOI4/HGO 目录形状，确保断言覆盖
    # parser、source validation、integrity check，而不是依赖真实 mod 安装。
    (root / "map").mkdir(parents=True)
    (root / "history" / "states").mkdir(parents=True)
    (root / "common" / "country_tags").mkdir(parents=True)
    (root / "common" / "countries").mkdir(parents=True)
    write_bmp24(
        root / "map" / "provinces.bmp",
        [
            [(10, 20, 30), (11, 21, 31)],
            [(12, 22, 32), (0, 0, 0)],
        ],
    )
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


def write_palette_source(path: Path, entries: dict[str, dict[str, str]]) -> None:
    dump_json(
        path,
        {
            "palette_id": "test_hgo",
            "preferred_runtime_color_field": "map_hex",
            "entries": entries,
        },
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

    def test_default_smoke_report_stays_under_runtime_reports_folder(self) -> None:
        self.assertEqual(DEFAULT_SMOKE_REPORT.parts[:3], (".runtime", "reports", "generated"))
        self.assertEqual(DEFAULT_SMOKE_REPORT.as_posix(), ".runtime/reports/generated/hgo_runtime_seed_smoke.json")

    def test_default_country_color_source_points_to_hgo_palette_pack(self) -> None:
        self.assertEqual(DEFAULT_COUNTRY_COLOR_SOURCE.as_posix(), "data/palettes/hgo.palette.json")
        self.assertEqual(
            [path.as_posix() for path in DEFAULT_COUNTRY_COLOR_SOURCES],
            ["data/palettes/hgo.palette.json", "data/palettes/hoi4_vanilla.palette.json"],
        )

    def test_smoke_report_records_seed_digest_and_required_paths(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            write_minimal_hgo_source(root)
            payload = build_runtime_seed(root, generated_at_utc="2026-06-05T00:00:00Z")
            output = root / ".runtime" / "hgo_runtime" / "seed.json"
            dump_json(output, payload)

            report = build_smoke_report(root, output, payload)

            self.assertEqual(report["report_id"], "hgo_runtime_seed_smoke")
            self.assertEqual(report["status"], "pass")
            self.assertEqual(report["seed_output"]["size_bytes"], output.stat().st_size)
            self.assertEqual(len(report["seed_output"]["sha256"]), 64)
            self.assertTrue(report["checks"]["seed_written"])
            self.assertTrue(report["checks"]["has_mapped_provinces"])
            self.assertEqual(report["summary"]["province_count"], 4)
            self.assertTrue(report["required_paths"]["map/definition.csv"]["exists"])
            self.assertEqual(report["required_paths"]["history/states"]["kind"], "directory")

    def test_bmp_header_validation_accepts_minimal_rgb24_raster(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "provinces.bmp"
            write_bmp24(path, [[(10, 20, 30), (11, 21, 31)], [(12, 22, 32), (13, 23, 33)]])

            header = read_bmp_header(path)

        self.assertEqual(header["width"], 2)
        self.assertEqual(header["height"], 2)
        self.assertEqual(header["bits_per_pixel"], 24)
        self.assertEqual(header["compression"], 0)
        self.assertEqual(header["row_stride"], 8)

    def test_bmp_header_validation_rejects_invalid_source_raster(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "provinces.bmp"
            path.write_bytes(b"bmp")

            with self.assertRaisesRegex(ValueError, "too small"):
                read_bmp_header(path)

    def test_assets_cli_writes_seed_raster_manifest_and_smoke_report(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir) / "hgo"
            root.mkdir()
            write_minimal_hgo_source(root)
            report = Path(tmp_dir) / "assets_smoke.json"
            data_tmp_root = REPO_ROOT / "data"
            with tempfile.TemporaryDirectory(dir=data_tmp_root, prefix=".hgo_runtime_test.") as output_dir_text:
                output_dir = Path(output_dir_text)

                result = subprocess.run(
                    [
                        sys.executable,
                        str(REPO_ROOT / "tools" / "build_hgo_runtime_assets.py"),
                        "--hgo-root",
                        str(root),
                        "--output-dir",
                        str(output_dir),
                        "--skip-data-manifest",
                        "--smoke-report",
                        str(report),
                    ],
                    cwd=REPO_ROOT,
                    check=False,
                    capture_output=True,
                    text=True,
                )

                self.assertEqual(result.returncode, 0, result.stderr)
                seed_path = output_dir / "seed.json"
                raster_path = output_dir / "provinces.bmp"
                manifest_path = output_dir / "manifest.json"
                self.assertTrue(seed_path.is_file())
                self.assertTrue(raster_path.is_file())
                self.assertTrue(manifest_path.is_file())
                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                smoke = json.loads(report.read_text(encoding="utf-8"))
                self.assertEqual(manifest["runtime_id"], "hgo_raster_runtime_assets")
                self.assertEqual(manifest["assets"]["hgo_runtime_seed"]["sha256"], smoke["seed"]["sha256"])
                self.assertEqual(manifest["assets"]["hgo_runtime_provinces_bmp"]["width"], 2)
                self.assertTrue(manifest["assets"]["hgo_runtime_seed"]["url"].startswith("data/.hgo_runtime_test."))
                self.assertNotIn("file:///", manifest["assets"]["hgo_runtime_seed"]["url"])
                self.assertEqual(smoke["status"], "pass")

    def test_cli_runs_from_non_repo_cwd_and_writes_seed_and_report(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir) / "hgo"
            root.mkdir()
            write_minimal_hgo_source(root)
            run_dir = Path(tmp_dir) / "run"
            run_dir.mkdir()
            output = run_dir / "seed.json"
            report = run_dir / "smoke.json"

            result = subprocess.run(
                [
                    sys.executable,
                    str(REPO_ROOT / "tools" / "build_hgo_runtime_seed.py"),
                    "--hgo-root",
                    str(root),
                    "--output",
                    str(output),
                    "--smoke-report",
                    str(report),
                ],
                cwd=run_dir,
                check=False,
                capture_output=True,
                text=True,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(output.exists())
            self.assertTrue(report.exists())
            self.assertEqual(json.loads(report.read_text(encoding="utf-8"))["status"], "pass")

    def test_missing_required_source_path_hard_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            write_minimal_hgo_source(root)
            (root / "map" / "provinces.bmp").unlink()

            with self.assertRaisesRegex(FileNotFoundError, "map/provinces.bmp"):
                build_runtime_seed(root)

    def test_missing_countries_folder_hard_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            write_minimal_hgo_source(root)
            (root / "common" / "countries" / "AAA - Testland.txt").unlink()
            (root / "common" / "countries" / "BBB - Controller.txt").unlink()
            (root / "common" / "countries").rmdir()

            with self.assertRaisesRegex(FileNotFoundError, "common/countries"):
                build_runtime_seed(root)

    def test_country_color_source_supplies_missing_country_file_color(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            write_minimal_hgo_source(root)
            (root / "common" / "countries" / "AAA - Testland.txt").write_text("", encoding="utf-8")
            palette_source = root / "hgo.palette.json"
            write_palette_source(palette_source, {"AAA": {"map_hex": "#112233"}})

            payload = build_runtime_seed(root, country_color_source=palette_source)

            self.assertEqual(payload["countries"]["AAA"]["color_hex"], "#112233")
            self.assertEqual(payload["countries"]["AAA"]["color_source"], "palette_pack:test_hgo:map_hex")
            self.assertEqual(
                payload["countries"]["AAA"]["country_color_source_path"],
                str(palette_source.resolve()),
            )
            self.assertEqual(payload["summary"]["missing_owner_color_count"], 0)
            self.assertEqual(payload["source"]["country_color_source"]["palette_id"], "test_hgo")

    def test_country_color_source_supplies_owner_tag_without_country_tag_file_entry(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            write_minimal_hgo_source(root, state_owner="CCC")
            palette_source = root / "hgo.palette.json"
            write_palette_source(palette_source, {"CCC": {"map_hex": "#445566"}})

            payload = build_runtime_seed(root, country_color_source=palette_source)

            self.assertEqual(payload["countries"]["CCC"]["definition_path"], "")
            self.assertEqual(payload["countries"]["CCC"]["source_path"], "")
            self.assertEqual(payload["countries"]["CCC"]["color_rgb"], [68, 85, 102])
            self.assertEqual(payload["countries"]["CCC"]["color_source"], "palette_pack:test_hgo:map_hex")
            self.assertEqual(payload["countries"]["CCC"]["state_count"], 1)

    def test_owner_and_controller_tags_require_country_colors(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            write_minimal_hgo_source(root)
            (root / "common" / "countries" / "AAA - Testland.txt").write_text("", encoding="utf-8")

            with self.assertRaisesRegex(ValueError, "AAA"):
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
