import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} from "node:worker_threads";

import {
  buildFrozenDerivedAliasTaintBaseline,
  buildHistoricalDerivedAliasProofCheckpoint,
  buildHistoricalDerivedAliasProofIdentity,
  readStateWriterPolicy,
} from "../build_state_writer_policy.mjs";
import {
  buildCanonicalStateKeyAuthorityIndex,
} from "../state_writer_policy.mjs";
import {
  DERIVED_ALIAS_TAINT_MODES,
} from "../state_writer_inventory.mjs";

const WORKER_KIND = "p4-state-writer-historical-proof";
const WORKER_SCHEMA_VERSION = 1;
const WORKER_REQUEST_KIND = "p4-state-writer-historical-proof-request";

function createWorkerError(code, message, cause = null) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.code = code;
  return error;
}

function normalizeJson(value) {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw createWorkerError(
      "p4-historical-proof-worker-json-invalid",
      "P4 historical proof worker values must be JSON serializable.",
    );
  }
  return serialized;
}

export function hashP4StateWriterHistoricalProofJson(value) {
  return createHash("sha256")
    .update(normalizeJson(value))
    .digest("hex");
}

function isSha256(value) {
  return /^[0-9a-f]{64}$/.test(String(value || ""));
}

function isCommitSha(value) {
  return /^[0-9a-f]{40}$/.test(String(value || ""));
}

function validatePassedEnvelope(envelope) {
  if (
    !envelope
    || typeof envelope !== "object"
    || Array.isArray(envelope)
    || envelope.kind !== WORKER_KIND
    || envelope.schemaVersion !== WORKER_SCHEMA_VERSION
    || envelope.status !== "passed"
  ) {
    throw createWorkerError(
      "p4-historical-proof-worker-envelope-invalid",
      "P4 historical proof worker returned an invalid terminal envelope.",
    );
  }
  const {
    identity,
    identitySha256,
    policySha256,
    proofSha256,
    sourceSha,
    phase,
    candidatePaths,
    matches,
  } = envelope;
  if (
    !identity
    || typeof identity !== "object"
    || Array.isArray(identity)
    || !isCommitSha(sourceSha)
    || typeof phase !== "string"
    || phase.length === 0
    || !Array.isArray(candidatePaths)
    || candidatePaths.some((value) => typeof value !== "string")
    || !isSha256(identitySha256)
    || !isSha256(policySha256)
    || !isSha256(proofSha256)
    || identitySha256 !== hashP4StateWriterHistoricalProofJson(identity)
    || identity.sourceSha !== sourceSha
    || identity.phase !== phase
    || JSON.stringify(identity.candidatePaths) !== JSON.stringify(candidatePaths)
    || identity.policySha256 !== policySha256
    || matches !== true
  ) {
    throw createWorkerError(
      "p4-historical-proof-worker-envelope-invalid",
      "P4 historical proof worker returned an inconsistent terminal envelope.",
    );
  }
  return Object.freeze({
    ...envelope,
    identity: Object.freeze(structuredClone(identity)),
    candidatePaths: Object.freeze([...candidatePaths]),
  });
}

function buildWorkerProofRequest({ previousPolicy, policy } = {}) {
  const currentPolicy = policy || previousPolicy;
  const phase = currentPolicy.progress.latestPhase;
  const sourceSha = currentPolicy.baseline.sourceBaseSha;
  const candidatePaths = [
    ...(currentPolicy.baselines.derivedAliasTaint?.paths || []),
  ].map(String).sort((left, right) => left.localeCompare(right));
  const identityInputs = {
    sourceSha,
    candidatePaths,
    phase,
    taintMode: DERIVED_ALIAS_TAINT_MODES.STRICT,
    checkpoint: buildHistoricalDerivedAliasProofCheckpoint({
      phase,
      policy: currentPolicy,
    }),
    previousPolicy: previousPolicy || currentPolicy,
    policy: currentPolicy,
  };
  return {
    identity: buildHistoricalDerivedAliasProofIdentity(identityInputs),
    previousPolicy: identityInputs.previousPolicy,
    policy: currentPolicy,
  };
}

function validateWorkerProofRequest(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw createWorkerError(
      "p4-historical-proof-worker-request-invalid",
      "P4 historical proof worker requires one exact proof request.",
    );
  }
  const normalized = buildWorkerProofRequest(request);
  if (
    hashP4StateWriterHistoricalProofJson(normalized.identity)
      !== hashP4StateWriterHistoricalProofJson(request.identity)
  ) {
    throw createWorkerError(
      "p4-historical-proof-worker-request-identity-mismatch",
      "P4 historical proof worker request identity does not match its policy inputs.",
    );
  }
  return normalized;
}

async function buildPassedEnvelope(request = null) {
  const defaultPolicy = request ? null : await readStateWriterPolicy();
  const {
    identity,
    policy,
  } = validateWorkerProofRequest(
    request || buildWorkerProofRequest({
      previousPolicy: defaultPolicy,
      policy: defaultPolicy,
    }),
  );
  const {
    sourceSha,
    candidatePaths,
    phase,
  } = identity;
  const proof = await buildFrozenDerivedAliasTaintBaseline({
    sourceBaseSha: sourceSha,
    relativePaths: candidatePaths,
    legacySemanticBaseline: policy.baselines.legacySemanticAuthority,
    transitionCheckpoints:
      policy.baselines.derivedAliasTaint?.transitionCheckpoints || [],
    stateKeyAuthorityIndex: buildCanonicalStateKeyAuthorityIndex(),
  });
  assert.deepEqual(proof, policy.baselines.derivedAliasTaint);
  const policySha256 = hashP4StateWriterHistoricalProofJson(policy);
  return validatePassedEnvelope({
    kind: WORKER_KIND,
    schemaVersion: WORKER_SCHEMA_VERSION,
    status: "passed",
    identity,
    identitySha256: hashP4StateWriterHistoricalProofJson(identity),
    policySha256,
    proofSha256: hashP4StateWriterHistoricalProofJson(proof),
    sourceSha,
    phase,
    candidatePaths,
    matches: true,
  });
}

function buildFailedEnvelope(error) {
  return {
    kind: WORKER_KIND,
    schemaVersion: WORKER_SCHEMA_VERSION,
    status: "failed",
    error: {
      code: String(error?.code || "p4-historical-proof-worker-failed"),
      message: String(error?.message || error || "Historical proof worker failed."),
    },
  };
}

async function runWorkerThread() {
  try {
    if (
      workerData?.kind !== WORKER_REQUEST_KIND
      || workerData?.schemaVersion !== WORKER_SCHEMA_VERSION
    ) {
      throw createWorkerError(
        "p4-historical-proof-worker-request-invalid",
        "P4 historical proof worker requires an exact versioned request.",
      );
    }
    parentPort.postMessage(await buildPassedEnvelope(workerData.request || null));
  } catch (error) {
    parentPort.postMessage(buildFailedEnvelope(error));
  }
}

export function startP4StateWriterHistoricalProofWorker(
  options = {},
  seams = {},
) {
  const WorkerCtor = seams.WorkerCtor || Worker;
  const workerUrl = seams.workerUrl || new URL(import.meta.url);
  const worker = new WorkerCtor(workerUrl, {
    ...options.workerOptions,
    execArgv: [],
    workerData: {
      kind: WORKER_REQUEST_KIND,
      schemaVersion: WORKER_SCHEMA_VERSION,
      ...(options.request ? { request: structuredClone(options.request) } : {}),
    },
  });
  let messageCount = 0;
  let passedEnvelope = null;
  let terminalError = null;
  let settled = false;
  let terminatePromise = null;
  let resolveResult;
  let rejectResult;

  const result = new Promise((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  const cleanup = () => {
    worker.removeListener?.("message", onMessage);
    worker.removeListener?.("messageerror", onMessageError);
    worker.removeListener?.("error", onError);
    worker.removeListener?.("exit", onExit);
  };
  const fail = (error) => {
    if (settled) return;
    settled = true;
    cleanup();
    rejectResult(error);
  };

  function onMessage(value) {
    messageCount += 1;
    if (messageCount !== 1) {
      terminalError = createWorkerError(
        "p4-historical-proof-worker-message-duplicate",
        "P4 historical proof worker emitted more than one terminal message.",
      );
      return;
    }
    try {
      passedEnvelope = validatePassedEnvelope(value);
    } catch (error) {
      terminalError = error;
    }
  }

  function onMessageError(error) {
    fail(createWorkerError(
      "p4-historical-proof-worker-message-error",
      "P4 historical proof worker message could not be deserialized.",
      error,
    ));
  }

  function onError(error) {
    fail(createWorkerError(
      "p4-historical-proof-worker-error",
      "P4 historical proof worker emitted an error.",
      error,
    ));
  }

  function onExit(exitCode) {
    if (settled) return;
    if (terminalError) {
      fail(terminalError);
      return;
    }
    if (exitCode !== 0) {
      fail(createWorkerError(
        "p4-historical-proof-worker-exit-nonzero",
        `P4 historical proof worker exited with code ${exitCode}.`,
      ));
      return;
    }
    if (messageCount !== 1 || !passedEnvelope) {
      fail(createWorkerError(
        "p4-historical-proof-worker-message-missing",
        "P4 historical proof worker exited without one valid passed envelope.",
      ));
      return;
    }
    settled = true;
    cleanup();
    resolveResult(passedEnvelope);
  }

  worker.on("message", onMessage);
  worker.on("messageerror", onMessageError);
  worker.on("error", onError);
  worker.on("exit", onExit);

  const terminate = async () => {
    if (!terminatePromise) {
      terminatePromise = Promise.resolve().then(() => worker.terminate());
    }
    return terminatePromise;
  };

  return Object.freeze({ result, terminate });
}

if (!isMainThread) {
  await runWorkerThread();
}
