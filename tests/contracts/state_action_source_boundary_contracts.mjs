import assert from "node:assert/strict";
import test from "node:test";
import { validateDomainActionSourceBoundary, discoverGlobalStateFacadeImports } from "../../tools/state_writer_policy.mjs";

export function registerStateActionSourceBoundaryContracts() {
  test("domain action source boundary rejects every canonical state facade module access", () => {
    const fixtures = [
      {
        name: "read-only named import",
        source: `
        import { state as runtimeState } from "../../state.js";
        export function readBootStatus() {
          return runtimeState.bootStatus;
        }
      `,
        specifierType: "named",
      },
      {
        name: "namespace import",
        source: `
        import * as stateModule from "../../state.js";
        export function writeBootStatus() {
          stateModule.state.bootStatus = "ready";
        }
      `,
        specifierType: "namespace",
      },
      {
        name: "dynamic import",
        source: `
        export async function loadStateFacade() {
          return import("../../state.js");
        }
      `,
        specifierType: "dynamic",
      },
      {
        name: "named re-export",
        source: `export { state as runtimeState } from "../../state.js";`,
        specifierType: "re-export-named",
      },
      {
        name: "empty re-export dependency",
        source: `export {} from "../../state.js";`,
        specifierType: "re-export-named",
      },
      {
        name: "namespace re-export",
        source: `export * as stateModule from "../../state.js";`,
        specifierType: "re-export-all",
      },
      {
        name: "star re-export",
        source: `export * from "../../state.js";`,
        specifierType: "re-export-all",
      },
    ];

    for (const fixture of fixtures) {
      const violations = validateDomainActionSourceBoundary(fixture.source, {
        filePath: "js/core/state/actions/boot_actions.js",
      });
      assert.equal(violations.length, 1, fixture.name);
      assert.equal(
        violations[0].code,
        "domain-action-global-state-import",
        fixture.name,
      );
      assert.equal(violations[0].specifierType, fixture.specifierType, fixture.name);
    }
  });

  test("domain action source boundary fails closed when source parsing fails", () => {
    const violations = validateDomainActionSourceBoundary(
      `import { state as runtimeState } from "../../state.js";\nexport function broken(`,
      {
        filePath: "js/core/state/actions/boot_actions.js",
      },
    );

    assert.equal(violations.length, 1);
    assert.equal(violations[0].code, "domain-action-source-parse-failed");
    assert.equal(violations[0].path, "js/core/state/actions/boot_actions.js");
    assert.match(violations[0].reason, /Unexpected token/);
  });

  test("global state facade discovery ignores similarly named non-facade modules", () => {
    const source = `
    import { state as localFixture } from "../../fixture_state.js";
    export { state as fixtureState } from "../../fixture_state.js";
    export async function loadFixture() {
      return import("../../fixture_state.js");
    }
  `;

    assert.deepEqual(
      discoverGlobalStateFacadeImports(source, {
        filePath: "js/core/state/actions/boot_actions.js",
      }),
      [],
    );
  });
}
