import assert from "node:assert/strict";
import test from "node:test";

import {
  getTransportWorkbenchPackOptionsSignature,
  syncTransportWorkbenchPackSelectOptions,
} from "../js/ui/toolbar/transport_workbench_controller.js";

class TestSelect {
  constructor() {
    this.children = [];
    this.dataset = {};
    this.disabled = false;
    this.value = "";
    this.replaceChildrenCallCount = 0;
  }

  replaceChildren(...children) {
    this.replaceChildrenCallCount += 1;
    this.children = children;
  }
}

function withTestDocument(callback) {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement(tagName) {
      return {
        tagName: String(tagName || "").toLowerCase(),
        textContent: "",
        value: "",
      };
    },
  };
  try {
    callback();
  } finally {
    globalThis.document = previousDocument;
  }
}

const roadPacks = Object.freeze([
  Object.freeze({ packId: "japan_road", label: "Japan road" }),
  Object.freeze({ packId: "germany_road", label: "Germany road" }),
]);

test("transport workbench pack select reuses options while refreshing value and disabled state", () => withTestDocument(() => {
  const selectNode = new TestSelect();

  const firstRender = syncTransportWorkbenchPackSelectOptions({
    selectNode,
    packOptions: roadPacks,
    activePackId: "japan_road",
  });
  const secondRender = syncTransportWorkbenchPackSelectOptions({
    selectNode,
    packOptions: roadPacks.map((pack) => ({ ...pack })),
    activePackId: "germany_road",
  });

  assert.equal(firstRender.rebuilt, true);
  assert.equal(secondRender.rebuilt, false);
  assert.equal(selectNode.replaceChildrenCallCount, 1);
  assert.equal(selectNode.value, "germany_road");
  assert.equal(selectNode.disabled, false);
  assert.equal(selectNode.dataset.packOptionsSignature, getTransportWorkbenchPackOptionsSignature(roadPacks));

  const emptyRender = syncTransportWorkbenchPackSelectOptions({
    selectNode,
    packOptions: [],
    activePackId: "",
  });

  assert.equal(emptyRender.rebuilt, true);
  assert.equal(selectNode.replaceChildrenCallCount, 2);
  assert.equal(selectNode.children.length, 0);
  assert.equal(selectNode.value, "");
  assert.equal(selectNode.disabled, true);
}));
