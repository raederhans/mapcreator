import assert from "node:assert/strict";
import test from "node:test";
import { buildCommandSupersessionPlan, collapseSupersededCommands } from "../../tools/verification/command_supersession.mjs";

export function registerCommandSupersessionContracts() {
  test("command supersession preserves retained order and reports the retained aggregate", () => {
    assert.deepEqual(
      buildCommandSupersessionPlan([
        "before",
        "test:node:p4:state-writer-policy",
        "verify:p4:state-writer-policy",
        "verify:p4:p4-3",
        "after",
      ]),
      {
        commandRefs: ["before", "verify:p4:p4-3", "after"],
        supersededCommands: [
          {
            commandRef: "test:node:p4:state-writer-policy",
            supersededBy: "verify:p4:p4-3",
          },
          {
            commandRef: "verify:p4:state-writer-policy",
            supersededBy: "verify:p4:p4-3",
          },
        ],
      },
    );
  });

  test("command supersession resolves direct provenance to a retained root", () => {
    assert.deepEqual(
      buildCommandSupersessionPlan(["A", "B"], {
        supersession: { A: ["B"] },
      }),
      {
        commandRefs: ["A"],
        supersededCommands: [{ commandRef: "B", supersededBy: "A" }],
      },
    );
  });

  test("command supersession resolves recursive provenance to the retained root", () => {
    assert.deepEqual(
      buildCommandSupersessionPlan(["A", "B", "C"], {
        supersession: { A: ["B"], B: ["C"] },
      }),
      {
        commandRefs: ["A"],
        supersededCommands: [
          { commandRef: "B", supersededBy: "A" },
          { commandRef: "C", supersededBy: "A" },
        ],
      },
    );
  });

  test("command supersession rejects a selected self-cycle", () => {
    assert.throws(
      () => buildCommandSupersessionPlan(["A"], {
        supersession: { A: ["A"] },
      }),
      (error) => {
        assert.equal(error.code, "command-supersession-cycle");
        assert.deepEqual(error.nodes, ["A"]);
        assert.equal(error.message, "command-supersession-cycle:A");
        return true;
      },
    );
  });

  test("command supersession rejects a selected multi-node cycle deterministically", () => {
    assert.throws(
      () => collapseSupersededCommands(["B", "A"], {
        supersession: { A: ["B"], B: ["A"] },
      }),
      (error) => {
        assert.equal(error.code, "command-supersession-cycle");
        assert.deepEqual(error.nodes, ["A", "B"]);
        assert.equal(error.message, "command-supersession-cycle:A,B");
        return true;
      },
    );
  });
}
