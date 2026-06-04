from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path

from map_builder import country_feature_policies


REPO_ROOT = Path(__file__).resolve().parents[1]
POLICY_JSON = REPO_ROOT / "data" / "country_feature_policies.json"
POLICY_JS = REPO_ROOT / "js" / "core" / "country_feature_policies.js"
RUNTIME_ASSET_REGISTRY = REPO_ROOT / "data" / "runtime_asset_registry.json"


class CountryFeaturePoliciesContractTest(unittest.TestCase):
    def test_python_loader_exposes_v2_display_policy(self) -> None:
        policies = country_feature_policies.load_country_feature_policies()
        display = policies["display"]

        self.assertEqual(policies["schema_version"], 2)
        self.assertIn("themes", country_feature_policies.display_palette())
        self.assertIn("countryPalette", country_feature_policies.display_palette())
        self.assertIn("DE", country_feature_policies.display_country_names())
        self.assertIn("DE", country_feature_policies.display_presets())
        self.assertEqual(
            country_feature_policies.display_fragment_camouflage_rules()[0]["countryCode"],
            "BY",
        )
        self.assertIn(
            "BY_INT_VITEBSK",
            country_feature_policies.display_fragment_camouflage_rules()[0]["featureIds"],
        )
        self.assertEqual(
            display["detailOverlaySupportTiers"],
            policies["country_gate"]["support_tiers"],
        )

    def test_runtime_asset_registry_is_country_policy_publish_source(self) -> None:
        registry = json.loads(RUNTIME_ASSET_REGISTRY.read_text(encoding="utf-8"))
        policy_key = registry.get("country_feature_policies_key")

        self.assertEqual(policy_key, "country_feature_policies")
        self.assertEqual(
            registry.get("assets", {}).get(policy_key, {}).get("url"),
            "data/country_feature_policies.json",
        )
        self.assertEqual(
            registry.get("assets", {}).get(policy_key, {}).get("role"),
            "country_feature_policies",
        )

    def test_js_policy_table_mirrors_json_owner(self) -> None:
        expected = json.loads(POLICY_JSON.read_text(encoding="utf-8"))
        result = subprocess.run(
            [
                "node",
                "--input-type=module",
                "-e",
                (
                    "import('./js/core/country_feature_policies.js')"
                    ".then((m) => console.log(JSON.stringify(m.COUNTRY_FEATURE_POLICIES)))"
                    ".catch((error) => { console.error(error); process.exit(1); })"
                ),
            ],
            cwd=REPO_ROOT,
            check=True,
            text=True,
            capture_output=True,
        )

        self.assertTrue(POLICY_JS.exists())
        self.assertEqual(json.loads(result.stdout), expected)


if __name__ == "__main__":
    unittest.main()
