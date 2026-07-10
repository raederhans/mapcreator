import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const OWNER_PATH = path.join(
  REPO_ROOT,
  "js",
  "core",
  "map_renderer",
  "click_selection_transaction_owner.js",
);

async function loadResolver() {
  const ownerModule = await import(pathToFileURL(OWNER_PATH));
  assert.deepEqual(Object.keys(ownerModule), ["resolveClickSelectionDecision"]);
  assert.equal(typeof ownerModule.resolveClickSelectionDecision, "function");
  return ownerModule.resolveClickSelectionDecision;
}

function createResolvedHit(overrides = {}) {
  return {
    targetType: null,
    id: null,
    countryCode: null,
    runtimeCountryCode: null,
    ...overrides,
  };
}

function createReadonlyModifiers(overrides = {}) {
  return {
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...overrides,
  };
}

test("click selection decision owner module exists with one public resolver", async () => {
  assert.equal(fs.existsSync(OWNER_PATH), true, "P1.8 owner module must exist");
  await loadResolver();
});

test("empty hit returns exact empty target and false decision", async () => {
  const resolveClickSelectionDecision = await loadResolver();

  const result = resolveClickSelectionDecision(
    createResolvedHit(),
    createReadonlyModifiers({ ctrlKey: true, metaKey: true }),
  );

  assert.deepEqual(Reflect.ownKeys(result), ["decision", "target"]);
  assert.deepEqual(Reflect.ownKeys(result.decision), ["devSelectionRequested"]);
  assert.deepEqual(Reflect.ownKeys(result.target), ["kind"]);
  assert.deepEqual(result, {
    decision: { devSelectionRequested: false },
    target: { kind: "empty" },
  });
});

test("land ctrl or meta requests dev selection while shift and alt stay inert", async () => {
  const resolveClickSelectionDecision = await loadResolver();
  const resolvedHit = createResolvedHit({
    targetType: "land",
    id: "L1",
    countryCode: "AA",
    runtimeCountryCode: "BB",
  });

  for (const modifiers of [
    createReadonlyModifiers({ ctrlKey: true }),
    createReadonlyModifiers({ metaKey: true }),
    createReadonlyModifiers({ ctrlKey: true, metaKey: true, shiftKey: true, altKey: true }),
  ]) {
    const result = resolveClickSelectionDecision(resolvedHit, modifiers);
    assert.equal(result.decision.devSelectionRequested, true);
    assert.deepEqual(
      Reflect.ownKeys(result.target),
      ["kind", "id", "countryCode", "runtimeCountryCode"],
    );
    assert.deepEqual(result.target, {
      kind: "land",
      id: "L1",
      countryCode: "AA",
      runtimeCountryCode: "BB",
    });
  }

  for (const modifiers of [
    createReadonlyModifiers(),
    createReadonlyModifiers({ shiftKey: true }),
    createReadonlyModifiers({ altKey: true }),
    createReadonlyModifiers({ shiftKey: true, altKey: true }),
  ]) {
    assert.equal(
      resolveClickSelectionDecision(resolvedHit, modifiers).decision.devSelectionRequested,
      false,
    );
  }
});

test("repeated calls return equal data and preserve both inputs", async () => {
  const resolveClickSelectionDecision = await loadResolver();
  const resolvedHit = createResolvedHit({
    targetType: "land",
    id: "L1",
    countryCode: "AA",
    runtimeCountryCode: "BB",
  });
  const modifiers = createReadonlyModifiers({ ctrlKey: true, shiftKey: true });
  const hitBefore = { ...resolvedHit };
  const modifiersBefore = { ...modifiers };

  const first = resolveClickSelectionDecision(resolvedHit, modifiers);
  const second = resolveClickSelectionDecision(resolvedHit, modifiers);

  assert.deepEqual(first, second);
  assert.deepEqual(resolvedHit, hitBefore);
  assert.deepEqual(modifiers, modifiersBefore);
});

test("water and special targets never reuse the land dev-selection decision", async () => {
  const resolveClickSelectionDecision = await loadResolver();
  const modifiers = createReadonlyModifiers({ ctrlKey: true, metaKey: true });

  for (const targetType of ["water", "special"]) {
    const result = resolveClickSelectionDecision(
      createResolvedHit({
        targetType,
        id: `${targetType}-1`,
        countryCode: "AA",
        runtimeCountryCode: "BB",
      }),
      modifiers,
    );
    assert.equal(result.target.kind, targetType);
    assert.equal(result.decision.devSelectionRequested, false);
  }
});

test("blank identity fields normalize to null without mutating input", async () => {
  const resolveClickSelectionDecision = await loadResolver();
  const resolvedHit = createResolvedHit({
    targetType: "land",
    id: "L1",
    countryCode: "   ",
    runtimeCountryCode: "BB",
  });
  const modifiers = createReadonlyModifiers();

  const result = resolveClickSelectionDecision(resolvedHit, modifiers);

  assert.deepEqual(result.target, {
    kind: "land",
    id: "L1",
    countryCode: null,
    runtimeCountryCode: "BB",
  });
  assert.deepEqual(resolvedHit, {
    targetType: "land",
    id: "L1",
    countryCode: "   ",
    runtimeCountryCode: "BB",
  });
  assert.deepEqual(modifiers, createReadonlyModifiers());
});

test("blank id normalizes to null while target kind remains the projected kind", async () => {
  const resolveClickSelectionDecision = await loadResolver();

  const result = resolveClickSelectionDecision(
    createResolvedHit({ targetType: "land", id: "   ", countryCode: "AA" }),
    createReadonlyModifiers({ ctrlKey: true }),
  );

  assert.deepEqual(result.target, {
    kind: "land",
    id: null,
    countryCode: "AA",
    runtimeCountryCode: null,
  });
  assert.equal(result.decision.devSelectionRequested, true);
});

test("resolvedHit rejects missing extra symbol accessor nested function and invalid scalar values", async () => {
  const resolveClickSelectionDecision = await loadResolver();
  const modifiers = createReadonlyModifiers();
  const validHit = createResolvedHit({ targetType: "land", id: "L1" });

  const missingKey = { targetType: "land", id: "L1", countryCode: null };
  const extraKey = { ...validHit, feature: { type: "Feature" } };
  const symbolKey = { ...validHit, [Symbol("feature")]: "extra" };
  const nonEnumerableKey = { ...validHit };
  Object.defineProperty(nonEnumerableKey, "feature", { value: null });
  const accessorValue = { ...validHit };
  Object.defineProperty(accessorValue, "id", { enumerable: true, get: () => "L1" });

  for (const invalidHit of [
    null,
    [],
    missingKey,
    extraKey,
    symbolKey,
    nonEnumerableKey,
    accessorValue,
    createResolvedHit({ targetType: "coast" }),
    createResolvedHit({ id: undefined }),
    createResolvedHit({ id: 42 }),
    createResolvedHit({ countryCode: {} }),
    createResolvedHit({ runtimeCountryCode: () => "AA" }),
    createResolvedHit({ id: { value: "L1" } }),
  ]) {
    assert.throws(
      () => resolveClickSelectionDecision(invalidHit, modifiers),
      TypeError,
      `resolvedHit should reject ${String(invalidHit)}`,
    );
  }
});

test("readonlyModifiers rejects missing extra symbol nested function and nonboolean values", async () => {
  const resolveClickSelectionDecision = await loadResolver();
  const validHit = createResolvedHit({ targetType: "land", id: "L1" });
  const validModifiers = createReadonlyModifiers();

  const missingKey = { ctrlKey: false, metaKey: false, shiftKey: false };
  const extraKey = { ...validModifiers, repeat: false };
  const symbolKey = { ...validModifiers, [Symbol("event")]: true };
  const nonEnumerableKey = { ...validModifiers };
  Object.defineProperty(nonEnumerableKey, "repeat", { value: false });
  const accessorValue = { ...validModifiers };
  Object.defineProperty(accessorValue, "ctrlKey", { enumerable: true, get: () => false });

  for (const invalidModifiers of [
    null,
    [],
    missingKey,
    extraKey,
    symbolKey,
    nonEnumerableKey,
    accessorValue,
    createReadonlyModifiers({ ctrlKey: undefined }),
    createReadonlyModifiers({ ctrlKey: 1 }),
    createReadonlyModifiers({ metaKey: null }),
    createReadonlyModifiers({ shiftKey: {} }),
    createReadonlyModifiers({ altKey: () => false }),
  ]) {
    assert.throws(
      () => resolveClickSelectionDecision(validHit, invalidModifiers),
      TypeError,
      `readonlyModifiers should reject ${String(invalidModifiers)}`,
    );
  }
});
