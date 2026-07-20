from pathlib import Path
import json
import re
import subprocess
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
RULE_FILE = REPO_ROOT / "tools" / "eslint-rules" / "no-direct-state-mutation.js"
ALLOWLIST_FILE = REPO_ROOT / "tools" / "eslint-rules" / "state-writer-allowlist.json"
CHECK_SCRIPT = REPO_ROOT / "tools" / "check_state_write_allowlist.mjs"
P4_POLICY_FILE = REPO_ROOT / "tools" / "state_writer_policy.json"
P4_POLICY_BUILDER = REPO_ROOT / "tools" / "build_state_writer_policy.mjs"
P4_POLICY_CHECKER = REPO_ROOT / "tools" / "check_state_writer_policy.mjs"
P4_INVENTORY = REPO_ROOT / "tools" / "state_writer_inventory.mjs"
P4_ACTIONS_DIR = REPO_ROOT / "js" / "core" / "state" / "actions"
PACKAGE_JSON = REPO_ROOT / "package.json"


class StateWriteGuardrailContractTest(unittest.TestCase):
    def test_guardrail_files_exist(self):
        self.assertTrue(RULE_FILE.exists())
        self.assertTrue(ALLOWLIST_FILE.exists())
        self.assertTrue(CHECK_SCRIPT.exists())

    def test_package_json_exposes_guardrail_script(self):
        content = PACKAGE_JSON.read_text(encoding="utf-8")
        self.assertIn('"verify:state-write-allowlist"', content)
        self.assertIn("node tools/check_state_write_allowlist.mjs", content)

    def test_p4_policy_foundation_files_exist(self):
        for file_path in [
            P4_POLICY_FILE,
            P4_POLICY_BUILDER,
            P4_POLICY_CHECKER,
            P4_INVENTORY,
        ]:
            self.assertTrue(file_path.exists(), str(file_path))

    def test_package_json_exposes_p4_policy_scripts(self):
        scripts = json.loads(PACKAGE_JSON.read_text(encoding="utf-8")).get("scripts", {})
        expected_scripts = {
            "test:node:p4:state-writer-policy",
            "verify:p4:state-writer-policy",
            "test:python:p4:state-write-boundary",
            "verify:p4:routes",
        }
        self.assertTrue(expected_scripts.issubset(scripts))

    def test_p4_legacy_direct_projection_matches_existing_allowlist(self):
        allowlist = json.loads(ALLOWLIST_FILE.read_text(encoding="utf-8"))
        policy = json.loads(P4_POLICY_FILE.read_text(encoding="utf-8"))
        projected = sorted(
            writer["path"]
            for writer in policy.get("writers", [])
            if writer.get("authority") == "legacy-direct"
        )
        self.assertEqual(projected, sorted(allowlist.get("files", [])))

    def test_p4_policy_checker_matches_current_workspace(self):
        policy = json.loads(P4_POLICY_FILE.read_text(encoding="utf-8"))
        latest_phase = policy.get("progress", {}).get("latestPhase")
        self.assertIsInstance(latest_phase, str)
        self.assertTrue(latest_phase)
        result = subprocess.run(
            [
                "node",
                "tools/check_state_writer_policy.mjs",
                "--phase",
                latest_phase,
            ],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            details = "\n".join(
                part for part in [result.stdout.strip(), result.stderr.strip()] if part
            )
            self.fail(details or "P4 state writer policy check failed")
        self.assertIn("P4 state writer policy pass:", result.stdout)

    def test_p4_production_action_modules_match_current_policy(self):
        action_modules = (
            sorted(P4_ACTIONS_DIR.glob("*.js"))
            if P4_ACTIONS_DIR.exists()
            else []
        )
        self.assertEqual(
            [path.relative_to(REPO_ROOT).as_posix() for path in action_modules],
            ["js/core/state/actions/boot_actions.js"],
        )

    def test_allowlist_script_matches_current_workspace(self):
        result = subprocess.run(
            ["node", "tools/check_state_write_allowlist.mjs"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            details = "\n".join(
                part for part in [result.stdout.strip(), result.stderr.strip()] if part
            )
            self.fail(details or "state write allowlist check failed")
        self.assertIn("State write allowlist passed", result.stdout)

    def test_legacy_scanner_fixture_exclusions_are_exact_and_policy_tested(self):
        checker_source = CHECK_SCRIPT.read_text(encoding="utf-8")
        expected_fixtures = {
            "tests/state_writer_policy_behavior.test.mjs",
            "tests/state_writer_policy_manifest_behavior.test.mjs",
            "tests/state_writer_scanner_soundness_behavior.test.mjs",
            "tests/state_writer_policy_soundness_behavior.test.mjs",
        }
        fixture_match = re.search(
            r"const\s+LEGACY_SCANNER_FIXTURE_PATHS\s*=\s*new\s+Set\(\s*\[(?P<body>.*?)\]\s*\);",
            checker_source,
            flags=re.DOTALL,
        )
        self.assertIsNotNone(fixture_match)
        actual_fixtures = set(
            re.findall(r'"([^"]+)"', fixture_match.group("body"))
        )
        self.assertEqual(actual_fixtures, expected_fixtures)

        scripts = json.loads(PACKAGE_JSON.read_text(encoding="utf-8")).get("scripts", {})
        self.assertEqual(
            scripts.get("test:node:p4:state-writer-policy"),
            "node tools/run_p4_state_writer_policy_tests.mjs",
        )
        runner_source = (
            REPO_ROOT / "tools" / "run_p4_state_writer_policy_tests.mjs"
        ).read_text(encoding="utf-8")
        runner_match = re.search(
            r"export\s+const\s+P4_STATE_WRITER_POLICY_TEST_FILES\s*=\s*Object\.freeze\(\s*\[(?P<body>.*?)\]\s*\);",
            runner_source,
            flags=re.DOTALL,
        )
        self.assertIsNotNone(runner_match)
        runner_test_files = set(
            re.findall(r'"([^"]+)"', runner_match.group("body"))
        )
        self.assertTrue(expected_fixtures.issubset(runner_test_files))

    def test_transport_workbench_state_owner_is_explicit_state_writer(self):
        allowlist = json.loads(ALLOWLIST_FILE.read_text(encoding="utf-8"))
        self.assertIn(
            "js/ui/toolbar/transport_workbench_state_owner.js",
            allowlist.get("files", []),
        )
        self.assertNotIn(
            "js/ui/toolbar/transport_workbench_controller.js",
            allowlist.get("files", []),
        )

    def test_appearance_city_points_owner_is_explicit_state_writer(self):
        allowlist = json.loads(ALLOWLIST_FILE.read_text(encoding="utf-8"))
        self.assertIn(
            "js/ui/toolbar/appearance_city_points_owner.js",
            allowlist.get("files", []),
        )

    def test_appearance_physical_owner_is_explicit_state_writer(self):
        allowlist = json.loads(ALLOWLIST_FILE.read_text(encoding="utf-8"))
        self.assertIn(
            "js/ui/toolbar/appearance_physical_owner.js",
            allowlist.get("files", []),
        )

    def test_intensity_field_editor_section_is_explicit_state_writer(self):
        allowlist = json.loads(ALLOWLIST_FILE.read_text(encoding="utf-8"))
        self.assertIn(
            "js/ui/toolbar/intensity_field_editor_section.js",
            allowlist.get("files", []),
        )

    def test_appearance_reference_owner_is_explicit_state_writer(self):
        allowlist = json.loads(ALLOWLIST_FILE.read_text(encoding="utf-8"))
        self.assertIn(
            "js/ui/toolbar/appearance_reference_owner.js",
            allowlist.get("files", []),
        )

    def test_appearance_rivers_owner_is_explicit_state_writer(self):
        allowlist = json.loads(ALLOWLIST_FILE.read_text(encoding="utf-8"))
        self.assertIn(
            "js/ui/toolbar/appearance_rivers_owner.js",
            allowlist.get("files", []),
        )

    def test_appearance_parent_border_owner_is_explicit_state_writer(self):
        allowlist = json.loads(ALLOWLIST_FILE.read_text(encoding="utf-8"))
        self.assertIn(
            "js/ui/toolbar/appearance_parent_border_owner.js",
            allowlist.get("files", []),
        )

    def test_transport_appearance_controller_is_explicit_state_writer(self):
        allowlist = json.loads(ALLOWLIST_FILE.read_text(encoding="utf-8"))
        self.assertIn(
            "js/ui/toolbar/transport_appearance_controller.js",
            allowlist.get("files", []),
        )

    def test_layer_observability_diagnostics_stay_read_only(self):
        allowlist = json.loads(ALLOWLIST_FILE.read_text(encoding="utf-8"))
        self.assertNotIn(
            "js/ui/toolbar/layer_status_diagnostics.js",
            allowlist.get("files", []),
        )
        self.assertNotIn(
            "js/ui/toolbar/toolbar_render_scheduler.js",
            allowlist.get("files", []),
        )

    def test_scanner_flags_member_computed_and_object_assign_writes(self):
        script = """
const { scanContentForStateWrites } = require('./tools/eslint-rules/no-direct-state-mutation.js');
const samples = {
  member: 'state.foo = 1;',
  runtimeMember: 'runtimeState.foo = 1;',
  appMember: 'appState.foo = 1;',
  memberOrAssign: 'state.foo ||= payload;',
  runtimeMemberOrAssign: 'runtimeState.foo ||= payload;',
  appMemberOrAssign: 'appState.foo ||= payload;',
  memberNullishAssign: 'state.foo ??= payload;',
  memberPlusAssign: 'state.foo += 1;',
  computed: 'state[key] = payload;',
  runtimeComputed: 'runtimeState[key] = payload;',
  appComputed: 'appState[key] = payload;',
  computedWithSpace: 'state [key] = payload;',
  computedNested: 'state[keys[index]] = payload;',
  computedOrAssign: 'state[key] ||= payload;',
  objectAssign: 'Object.assign(state, payload);',
  runtimeObjectAssign: 'Object.assign(runtimeState, payload);',
  appObjectAssign: 'Object.assign(appState, payload);',
};
for (const [name, source] of Object.entries(samples)) {
  const matches = scanContentForStateWrites(source);
  if (!matches.length) {
    console.error(`scanner missed ${name}`);
    process.exit(1);
  }
}
"""
        result = subprocess.run(
            ["node", "-e", script],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            details = "\n".join(
                part for part in [result.stdout.strip(), result.stderr.strip()] if part
            )
            self.fail(details or "scanner did not detect direct state write sample")

    def test_scanner_ignores_computed_read_comparisons(self):
        script = """
const { scanContentForStateWrites } = require('./tools/eslint-rules/no-direct-state-mutation.js');
const samples = [
  'if (state[key] === value) {}',
  'if (state[key] == value) {}',
];
for (const source of samples) {
  const matches = scanContentForStateWrites(source);
  if (matches.length) {
    console.error(`scanner falsely matched: ${source}`);
    process.exit(1);
  }
}
"""
        result = subprocess.run(
            ["node", "-e", script],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            details = "\n".join(
                part for part in [result.stdout.strip(), result.stderr.strip()] if part
            )
            self.fail(details or "scanner falsely matched computed read comparison")


if __name__ == "__main__":
    unittest.main()
