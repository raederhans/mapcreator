const RESOLVED_HIT_KEYS = [
  "targetType",
  "id",
  "countryCode",
  "runtimeCountryCode",
];

const READONLY_MODIFIER_KEYS = [
  "ctrlKey",
  "metaKey",
  "shiftKey",
  "altKey",
];

const TARGET_KINDS = new Set(["land", "water", "special"]);

function requireExactDataRecord(value, expectedKeys, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object with exact scalar keys.`);
  }
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== expectedKeys.length
    || !expectedKeys.every((key) => ownKeys.includes(key))
  ) {
    throw new TypeError(`${label} must contain exactly: ${expectedKeys.join(", ")}.`);
  }
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      throw new TypeError(`${label}.${key} must be an enumerable data value.`);
    }
  }
}

function requireNullableString(value, label) {
  if (value !== null && typeof value !== "string") {
    throw new TypeError(`${label} must be a string or null.`);
  }
}

function normalizeIdentity(value) {
  return value === null || value.trim().length === 0 ? null : value;
}

export function resolveClickSelectionDecision(resolvedHit, readonlyModifiers) {
  requireExactDataRecord(resolvedHit, RESOLVED_HIT_KEYS, "resolvedHit");
  requireExactDataRecord(readonlyModifiers, READONLY_MODIFIER_KEYS, "readonlyModifiers");

  requireNullableString(resolvedHit.targetType, "resolvedHit.targetType");
  if (resolvedHit.targetType !== null && !TARGET_KINDS.has(resolvedHit.targetType)) {
    throw new TypeError("resolvedHit.targetType must be land, water, special, or null.");
  }
  for (const key of ["id", "countryCode", "runtimeCountryCode"]) {
    requireNullableString(resolvedHit[key], `resolvedHit.${key}`);
  }
  for (const key of READONLY_MODIFIER_KEYS) {
    if (typeof readonlyModifiers[key] !== "boolean") {
      throw new TypeError(`readonlyModifiers.${key} must be a boolean.`);
    }
  }

  const target = resolvedHit.targetType === null
    ? { kind: "empty" }
    : {
        kind: resolvedHit.targetType,
        id: normalizeIdentity(resolvedHit.id),
        countryCode: normalizeIdentity(resolvedHit.countryCode),
        runtimeCountryCode: normalizeIdentity(resolvedHit.runtimeCountryCode),
      };
  const decision = {
    devSelectionRequested: target.kind === "land" && (readonlyModifiers.ctrlKey || readonlyModifiers.metaKey),
  };
  return { decision, target };
}
