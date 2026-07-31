from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
RENDERER_RUNTIME_STATE_JS = REPO_ROOT / "js" / "core" / "state" / "renderer_runtime_state.js"
RENDERER_CACHE_ACTIONS_JS = (
    REPO_ROOT / "js" / "core" / "state" / "actions" / "renderer_cache_actions.js"
)
RENDER_PASS_CACHE_NORMALIZER_JS = (
    REPO_ROOT / "js" / "core" / "renderer" / "render_pass_cache_state_normalizer.js"
)


class RendererCacheActionsBoundaryContractTest(unittest.TestCase):
    def test_runtime_state_delegates_cache_mutations_to_actions(self):
        runtime_content = RENDERER_RUNTIME_STATE_JS.read_text(encoding="utf-8")
        action_content = RENDERER_CACHE_ACTIONS_JS.read_text(encoding="utf-8")
        normalizer_content = RENDER_PASS_CACHE_NORMALIZER_JS.read_text(
            encoding="utf-8"
        )

        self.assertIn('./actions/renderer_cache_actions.js', runtime_content)
        self.assertIn(
            '../renderer/render_pass_cache_state_normalizer.js',
            runtime_content,
        )
        self.assertIn(
            "normalizeRenderPassCacheState(target.renderPassCache, {",
            runtime_content,
        )
        self.assertIn(
            "commitRenderPassCacheState(target, renderPassCache);",
            runtime_content,
        )
        self.assertIn("commitProjectedBoundsCacheState(target, {", runtime_content)
        self.assertIn("commitProjectedBoundsCacheState(target, defaults);", runtime_content)
        self.assertNotIn("ensureSphericalFeatureDiagnosticsCache", runtime_content)

        self.assertIn("export function commitRenderPassCacheState(", action_content)
        self.assertNotIn("export function ensureRenderPassCacheState(", action_content)
        self.assertIn("export function commitProjectedBoundsCacheState(", action_content)
        self.assertIn(
            "export function clearSphericalFeatureDiagnosticsCacheState(",
            action_content,
        )
        self.assertIn(
            "export function getSphericalFeatureDiagnosticsCacheEntryState(",
            action_content,
        )
        self.assertIn(
            "export function setSphericalFeatureDiagnosticsCacheEntryState(",
            action_content,
        )
        self.assertNotIn("return target.sphericalFeatureDiagnosticsById", action_content)

        render_wrapper = runtime_content.split(
            "export function ensureRenderPassCacheState(", 1
        )[1].split("export function ensureSidebarPerfState", 1)[0]
        self.assertNotRegex(render_wrapper, r"target\.renderPassCache\s*=(?!=)")
        self.assertNotIn("cache.canvases =", render_wrapper)
        self.assertNotIn("normalizeRenderPassCacheDefaultShape", render_wrapper)
        self.assertIn(
            "if (renderPassCache !== target.renderPassCache)",
            render_wrapper,
        )

        self.assertNotRegex(
            normalizer_content,
            re.compile(r"^\s*import\s", re.MULTILINE),
        )
        self.assertIn(
            "export function normalizeRenderPassCacheState(",
            normalizer_content,
        )
        self.assertNotRegex(
            normalizer_content,
            r"\btarget\.[A-Za-z_$][\w$]*\s*=(?!=)",
        )

        projected_wrapper = runtime_content.split(
            "export function ensureProjectedBoundsCacheState(", 1
        )[1].split("export function resetProjectedBoundsCacheState", 1)[0]
        self.assertNotIn("target.projectedBoundsById =", projected_wrapper)
        self.assertNotIn("return target;", projected_wrapper)

        reset_wrapper = runtime_content.split(
            "export function resetProjectedBoundsCacheState(", 1
        )[1].split("// Transitional compatibility surface", 1)[0]
        self.assertNotIn("target.projectedBoundsById =", reset_wrapper)
        self.assertNotIn("target.sphericalFeatureDiagnosticsById =", reset_wrapper)


if __name__ == "__main__":
    unittest.main()
