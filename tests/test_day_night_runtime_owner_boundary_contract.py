from pathlib import Path
import re
import subprocess
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
MAP_RENDERER_JS = REPO_ROOT / "js" / "core" / "map_renderer.js"
DAY_NIGHT_RUNTIME_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "day_night_runtime_owner.js"
VISUAL_EFFECTS_PASS_OWNER_JS = REPO_ROOT / "js" / "core" / "renderer" / "visual_effects_pass_owner.js"


class DayNightRuntimeOwnerBoundaryContractTest(unittest.TestCase):
    def test_runtime_implementation_moves_to_owner_behind_renderer_delegates(self):
        renderer = MAP_RENDERER_JS.read_text(encoding="utf-8")
        owner = DAY_NIGHT_RUNTIME_OWNER_JS.read_text(encoding="utf-8")
        visual_owner = VISUAL_EFFECTS_PASS_OWNER_JS.read_text(encoding="utf-8")
        renderer_imports = renderer.replace('"', "'")

        self.assertIn(
            "import { createDayNightRuntimeOwner } from './renderer/day_night_runtime_owner.js';",
            renderer_imports,
        )
        self.assertIn("let dayNightRuntimeOwner = null;", renderer)
        self.assertIn("dayNightRuntimeOwner = createDayNightRuntimeOwner({", renderer)
        self.assertIn(
            "return getDayNightRuntimeOwner().syncDayNightClockTimer();",
            renderer,
        )
        self.assertIn(
            "return getDayNightRuntimeOwner().getDayNightStyleConfig();",
            renderer,
        )
        self.assertIn("export function createDayNightRuntimeOwner({", owner)
        self.assertIn("drawDayNightRuntimePass", visual_owner)
        self.assertIn(
            "drawDayNightRuntimePass: (k, options) => getDayNightRuntimeOwner().drawDayNightPass(k, options)",
            renderer,
        )
        self.assertNotIn("drawDayNightRuntimePass: drawDayNightPass", renderer)

        moved_symbols = (
            "getUtcDateKey",
            "getUtcDayOfYear",
            "getCurrentUtcMinutesFromDate",
            "getCycleUtcMinutes",
            "getDayNightLiveClockToken",
            "getSolarDeclinationRadians",
            "getCurrentSolarState",
            "drawDayNightShadowLayer",
            "clearDayNightClockTimer",
            "scheduleDayNightCycleFrame",
            "requestDayNightClockRender",
            "syncDayNightCycleAnimation",
        )
        for symbol in moved_symbols:
            self.assertRegex(owner, rf"function\s+{symbol}\s*\(")
            self.assertIsNone(re.search(rf"function\s+{symbol}\s*\(", renderer))

    def test_city_lights_owner_keeps_draw_cache_and_fallback_implementation(self):
        renderer = MAP_RENDERER_JS.read_text(encoding="utf-8")
        owner = DAY_NIGHT_RUNTIME_OWNER_JS.read_text(encoding="utf-8")
        city_owner = (REPO_ROOT / "js" / "core" / "renderer" / "city_lights_render_owner.js").read_text(
            encoding="utf-8"
        )

        self.assertIn("function drawNightLightsLayer(k, config, solarState) {", renderer)
        self.assertIn(
            "return getCityLightsRenderOwner().drawNightLightsLayer(k, config, solarState);",
            renderer,
        )
        for symbol in ("getModernDayNightNumber", "drawLightEllipse", "drawModernNightLightsLayer"):
            self.assertIsNone(re.search(rf"function\s+{symbol}\s*\(", renderer))
            self.assertRegex(city_owner, rf"function\s+{symbol}\s*\(")
            self.assertNotIn(f"function {symbol}(", owner)
        for retained_facade in ("toRgbaString", "getSignedHashUnit"):
            self.assertIn(f"function {retained_facade}(...args) {{", renderer)

    def test_renderer_split_line_budget_is_at_or_below_p3_1_ceiling(self):
        renderer_line_count = len(MAP_RENDERER_JS.read_text(encoding="utf-8").split("\n"))
        self.assertLessEqual(renderer_line_count, 22_933)

        base_source = subprocess.run(
            ["git", "show", "f118a101d30373c507075da32267969b22197338:js/core/map_renderer.js"],
            cwd=REPO_ROOT,
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
        ).stdout
        self.assertGreaterEqual(len(base_source.split("\n")) - renderer_line_count, 220)


if __name__ == "__main__":
    unittest.main()
