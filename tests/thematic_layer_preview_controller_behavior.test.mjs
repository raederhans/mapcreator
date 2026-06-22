import assert from "node:assert/strict";
import test from "node:test";

import { createThematicLayerPreviewController } from "../js/ui/toolbar/thematic_layer_preview_controller.js";

class TestClassList {
  constructor() {
    this.values = new Set();
  }

  add(value) {
    this.values.add(value);
  }

  toggle(value, force) {
    if (force) {
      this.add(value);
    } else {
      this.values.delete(value);
    }
  }
}

class TestNode {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.className = "";
    this.dataset = {};
    this.textContent = "";
    this.attributes = {};
    this.classList = new TestClassList();
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
}

function createTestDocument() {
  const nodes = {
    thematicLayerCatalogStatus: new TestNode("p"),
    thematicLayerPreviewList: new TestNode("div"),
  };
  return {
    nodes,
    document: {
      createElement: (tagName) => new TestNode(tagName),
      getElementById: (id) => nodes[id] || null,
    },
  };
}

test("preview controller keeps rejected loader values out of rendered text", async () => {
  const previousDocument = globalThis.document;
  const { document, nodes } = createTestDocument();
  globalThis.document = document;

  try {
    const controller = createThematicLayerPreviewController({
      t: (key) => key,
      loadCatalogPreview: async () => {
        throw NaN;
      },
    });

    const preview = await controller.load();
    const emptyText = nodes.thematicLayerPreviewList.children[0]?.textContent || "";
    const renderedText = `${nodes.thematicLayerCatalogStatus.textContent} ${emptyText}`;

    assert.equal(preview.error, "Preview load failed");
    assert.equal(emptyText, "Preview load failed");
    assert.doesNotMatch(renderedText, /\b(?:undefined|null|NaN)\b/i);
  } finally {
    globalThis.document = previousDocument;
  }
});
