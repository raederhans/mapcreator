const EMPTY_RESOURCE_POINTS = {
  type: "FeatureCollection",
  features: [],
};

function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function cloneStableValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneStableValue(entry));
  }
  if (!isRecord(value)) {
    return value;
  }
  return Object.keys(value)
    .sort()
    .reduce((result, key) => {
      result[key] = cloneStableValue(value[key]);
      return result;
    }, {});
}

function createDiagnostic(code, message, details = {}) {
  const diagnostic = {
    code,
    message,
  };
  if (isRecord(details) && Object.keys(details).length) {
    diagnostic.details = cloneStableValue(details);
  }
  return diagnostic;
}

function pushDiagnostic(target, code, message, details = {}) {
  target.push(createDiagnostic(code, message, details));
}

function createEmptyStrategicValuesResult(errors = [], warnings = [], sourceDiagnostics = {}) {
  return {
    metrics: {},
    buckets: {},
    bucketByFeature: {},
    victoryPointsByFeature: {},
    victoryPointsByState: {},
    resourcePoints: cloneStableValue(EMPTY_RESOURCE_POINTS),
    diagnostics: {
      errors,
      warnings,
      source: cloneStableValue(isRecord(sourceDiagnostics) ? sourceDiagnostics : {}),
    },
  };
}

function isScenarioStrategicValuesRuntimePayload(payload) {
  return !!payload
    && typeof payload === "object"
    && !Array.isArray(payload)
    && payload.metrics
    && typeof payload.metrics === "object"
    && payload.buckets
    && typeof payload.buckets === "object"
    && payload.bucketByFeature
    && typeof payload.bucketByFeature === "object"
    && payload.resourcePoints
    && typeof payload.resourcePoints === "object"
    && payload.diagnostics
    && typeof payload.diagnostics === "object";
}

function isScenarioStrategicValuesUsable(payload) {
  return isScenarioStrategicValuesRuntimePayload(payload)
    && !(Array.isArray(payload.diagnostics?.errors) && payload.diagnostics.errors.length > 0);
}

function normalizeExpectedValue(options, primaryKey, snakeKey, camelKey) {
  return normalizeText(
    options?.[primaryKey]
    ?? options?.expected?.[primaryKey]
    ?? options?.expected?.[snakeKey]
    ?? options?.expected?.[camelKey]
  );
}

function readPayloadScenarioId(payload) {
  return normalizeText(payload?.scenario_id ?? payload?.scenarioId);
}

function readPayloadBaselineHash(payload) {
  return normalizeText(payload?.baseline_hash ?? payload?.baselineHash);
}

function appendSourceIdentityDiagnostics(payload, options, errors) {
  const scenarioId = readPayloadScenarioId(payload);
  const baselineHash = readPayloadBaselineHash(payload);
  const expectedScenarioId = normalizeExpectedValue(options, "expectedScenarioId", "scenario_id", "scenarioId");
  const expectedBaselineHash = normalizeExpectedValue(options, "expectedBaselineHash", "baseline_hash", "baselineHash");

  if (!scenarioId) {
    pushDiagnostic(
      errors,
      "missing_scenario_id",
      "strategic_values.scenario_id is required."
    );
  } else if (expectedScenarioId && scenarioId !== expectedScenarioId) {
    pushDiagnostic(
      errors,
      "scenario_id_mismatch",
      `strategic_values.scenario_id "${scenarioId}" does not match expected "${expectedScenarioId}".`,
      { actual: scenarioId, expected: expectedScenarioId }
    );
  }

  if (!baselineHash) {
    pushDiagnostic(
      errors,
      "missing_baseline_hash",
      "strategic_values.baseline_hash is required."
    );
  } else if (expectedBaselineHash && baselineHash !== expectedBaselineHash) {
    pushDiagnostic(
      errors,
      "baseline_hash_mismatch",
      "strategic_values.baseline_hash does not match the expected baseline hash.",
      { actual: baselineHash, expected: expectedBaselineHash }
    );
  }

  return { scenarioId, baselineHash };
}

function normalizeRecordMap(value, label, errors) {
  if (!isRecord(value)) {
    pushDiagnostic(
      errors,
      `invalid_${label}`,
      `strategic_values.${label} must be an object map.`
    );
    return {};
  }
  return Object.keys(value)
    .sort()
    .reduce((result, rawKey) => {
      const key = normalizeText(rawKey);
      const entry = value[rawKey];
      if (!key) {
        pushDiagnostic(
          errors,
          `invalid_${label}_key`,
          `strategic_values.${label} contains an empty key.`
        );
        return result;
      }
      if (!isRecord(entry)) {
        pushDiagnostic(
          errors,
          `invalid_${label}_entry`,
          `strategic_values.${label}.${key} must be an object.`,
          { key }
        );
        return result;
      }
      result[key] = cloneStableValue(entry);
      return result;
    }, {});
}

function normalizeBucketByFeature(value, buckets, errors) {
  if (!isRecord(value)) {
    pushDiagnostic(
      errors,
      "invalid_bucket_by_feature",
      "strategic_values.bucket_by_feature must be an object map."
    );
    return {};
  }
  return Object.keys(value)
    .sort()
    .reduce((result, rawFeatureId) => {
      const featureId = normalizeText(rawFeatureId);
      const bucketId = normalizeText(value[rawFeatureId]);
      if (!featureId || !bucketId) {
        pushDiagnostic(
          errors,
          "invalid_bucket_by_feature_entry",
          "bucket_by_feature entries must contain non-empty feature and bucket ids.",
          { featureId, bucketId }
        );
        return result;
      }
      result[featureId] = bucketId;
      if (!Object.prototype.hasOwnProperty.call(buckets, bucketId)) {
        pushDiagnostic(
          errors,
          "missing_bucket_reference",
          `Feature "${featureId}" references missing strategic bucket "${bucketId}".`,
          { featureId, bucketId }
        );
      }
      return result;
    }, {});
}

function normalizeVictoryPointEntry(entry, index, warnings) {
  if (!isRecord(entry)) {
    pushDiagnostic(
      warnings,
      "invalid_victory_point_entry",
      "victory_points entries must be objects.",
      { index }
    );
    return null;
  }
  return cloneStableValue(entry);
}

function groupVictoryPoints(victoryPoints, warnings) {
  const byFeature = {};
  const byState = {};
  victoryPoints.forEach((rawEntry, index) => {
    const entry = normalizeVictoryPointEntry(rawEntry, index, warnings);
    if (!entry) return;
    const featureId = normalizeText(entry.host_feature_id ?? entry.hostFeatureId);
    const stateId = normalizeText(entry.state_id ?? entry.stateId);
    if (featureId) {
      if (!byFeature[featureId]) byFeature[featureId] = [];
      byFeature[featureId].push(entry);
    }
    if (stateId) {
      if (!byState[stateId]) byState[stateId] = [];
      byState[stateId].push(entry);
    }
  });
  return {
    victoryPointsByFeature: cloneStableValue(byFeature),
    victoryPointsByState: cloneStableValue(byState),
  };
}

function normalizeResourcePoints(value, errors) {
  if (!isRecord(value)) {
    pushDiagnostic(
      errors,
      "invalid_resource_points",
      "strategic_values.resource_points must be a GeoJSON FeatureCollection."
    );
    return cloneStableValue(EMPTY_RESOURCE_POINTS);
  }
  if (value.type !== "FeatureCollection") {
    pushDiagnostic(
      errors,
      "invalid_resource_points_type",
      "strategic_values.resource_points.type must be FeatureCollection.",
      { actualType: normalizeText(value.type) }
    );
    return cloneStableValue(EMPTY_RESOURCE_POINTS);
  }
  if (!Array.isArray(value.features)) {
    pushDiagnostic(
      errors,
      "invalid_resource_points_features",
      "strategic_values.resource_points.features must be an array."
    );
    return cloneStableValue(EMPTY_RESOURCE_POINTS);
  }
  return {
    type: "FeatureCollection",
    features: value.features.map((feature) => cloneStableValue(feature)),
  };
}

function normalizeScenarioStrategicValuesPayload(rawPayload, options = {}) {
  const errors = [];
  const warnings = [];

  if (isScenarioStrategicValuesRuntimePayload(rawPayload)) {
    const result = cloneStableValue(rawPayload);
    const identityErrors = [];
    const { scenarioId, baselineHash } = appendSourceIdentityDiagnostics(result, options, identityErrors);
    result.scenarioId = scenarioId;
    result.baselineHash = baselineHash;
    const diagnostics = isRecord(result.diagnostics) ? result.diagnostics : {};
    const existingErrors = Array.isArray(diagnostics.errors) ? diagnostics.errors : [];
    const existingWarnings = Array.isArray(diagnostics.warnings) ? diagnostics.warnings : [];
    result.diagnostics = {
      ...diagnostics,
      errors: [...existingErrors, ...identityErrors],
      warnings: existingWarnings,
      source: cloneStableValue(isRecord(diagnostics.source) ? diagnostics.source : {}),
    };
    return result;
  }

  if (!isRecord(rawPayload)) {
    pushDiagnostic(
      errors,
      "invalid_strategic_values_payload",
      "strategic_values payload must be an object."
    );
    return createEmptyStrategicValuesResult(errors, warnings);
  }

  const { scenarioId, baselineHash } = appendSourceIdentityDiagnostics(rawPayload, options, errors);

  if (rawPayload.version !== 1) {
    pushDiagnostic(
      errors,
      "unsupported_strategic_values_version",
      "strategic_values.version must be 1.",
      { actual: rawPayload.version ?? null }
    );
  }

  const metrics = normalizeRecordMap(rawPayload.metrics, "metrics", errors);
  const buckets = normalizeRecordMap(rawPayload.buckets, "buckets", errors);
  const bucketByFeature = normalizeBucketByFeature(rawPayload.bucket_by_feature, buckets, errors);
  const victoryPoints = Array.isArray(rawPayload.victory_points)
    ? rawPayload.victory_points
    : [];
  if (!Array.isArray(rawPayload.victory_points)) {
    pushDiagnostic(
      warnings,
      "invalid_victory_points",
      "strategic_values.victory_points should be an array."
    );
  }
  const { victoryPointsByFeature, victoryPointsByState } = groupVictoryPoints(victoryPoints, warnings);
  const resourcePoints = normalizeResourcePoints(rawPayload.resource_points, errors);

  return {
    scenarioId,
    baselineHash,
    metrics,
    buckets,
    bucketByFeature,
    victoryPointsByFeature,
    victoryPointsByState,
    resourcePoints,
    diagnostics: {
      errors,
      warnings,
      source: cloneStableValue(isRecord(rawPayload.diagnostics) ? rawPayload.diagnostics : {}),
    },
  };
}

export {
  isScenarioStrategicValuesRuntimePayload,
  isScenarioStrategicValuesUsable,
  normalizeScenarioStrategicValuesPayload,
};
