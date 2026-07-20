import { parse } from "acorn";

const BOOT_ACTION_MODULE_PATH =
  "js/core/state/actions/boot_actions.js";

const BOOT_ACTION_EXPORT_NAMES = Object.freeze([
  "setStartupInteractionMode",
  "setBootPreviewVisibleState",
  "commitStartupReadonlyStateFields",
  "clearStartupReadonlyStateFields",
  "clearStartupReadonlyStateForReason",
  "setBootStateFields",
  "replaceBootMetricsState",
  "replaceStartupBootCacheState",
  "setStartupScenarioBootstrapCacheStatus",
  "replaceSampleProjectDeeplinkState",
  "setActivePostReadyTask",
  "clearActivePostReadyTask",
  "replacePostReadyTaskDiagnostics",
  "setLongAnimationFrameObserver",
  "setStartupInitialScenarioChunkVisualPromotion",
  "setUiShellDebugState",
  "setUiShellDebugTerritorySeededState",
]);

function normalizeModulePath(value = "") {
  return String(value || "")
    .replaceAll("\\", "/")
    .replace(/^\.\//, "");
}

function freezeDelegationEntry({
  modulePath,
  exportName,
  targetArgumentIndex = 0,
}) {
  return Object.freeze({
    modulePath: normalizeModulePath(modulePath),
    exportName: String(exportName || ""),
    targetArgumentIndex: Number(targetArgumentIndex),
  });
}

export const STATE_ACTION_DELEGATION_CONTRACT = Object.freeze(
  BOOT_ACTION_EXPORT_NAMES.map((exportName) =>
    freezeDelegationEntry({
      modulePath: BOOT_ACTION_MODULE_PATH,
      exportName,
      targetArgumentIndex: 0,
    })
  ),
);

const CONTRACT_ENTRY_BY_ID = new Map(
  STATE_ACTION_DELEGATION_CONTRACT.map((entry) => [
    `${entry.modulePath}#${entry.exportName}`,
    entry,
  ]),
);

export function findStateActionDelegationContractEntry(
  modulePath,
  exportName,
) {
  return CONTRACT_ENTRY_BY_ID.get(
    `${normalizeModulePath(modulePath)}#${String(exportName || "")}`,
  ) || null;
}

export function getStateActionDelegationContractEntriesForModule(
  modulePath,
) {
  const normalizedPath = normalizeModulePath(modulePath);
  return STATE_ACTION_DELEGATION_CONTRACT.filter(
    (entry) => entry.modulePath === normalizedPath,
  );
}

function createViolation(code, details = {}) {
  return {
    code,
    ...details,
  };
}

function contractEntryId(entry = {}) {
  return [
    normalizeModulePath(entry.modulePath),
    String(entry.exportName || ""),
  ].join("#");
}

function isValidActionModulePath(modulePath = "") {
  return /^js\/core\/state\/actions\/[^/]+\.js$/.test(
    normalizeModulePath(modulePath),
  );
}

function isValidExportName(exportName = "") {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(
    String(exportName || ""),
  );
}

export function validateStateActionDelegationContract(
  contractEntries = STATE_ACTION_DELEGATION_CONTRACT,
) {
  const violations = [];
  const seenEntryIds = new Set();
  for (
    const [index, entry] of
    (Array.isArray(contractEntries) ? contractEntries : []).entries()
  ) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      violations.push(
        createViolation("state-action-contract-entry-invalid", { index }),
      );
      continue;
    }
    const rawModulePath = String(entry.modulePath || "");
    const modulePath = normalizeModulePath(rawModulePath);
    const exportName = String(entry.exportName || "");
    if (
      rawModulePath !== modulePath
      || !isValidActionModulePath(modulePath)
    ) {
      violations.push(
        createViolation("state-action-contract-module-path-invalid", {
          index,
          modulePath,
        }),
      );
    }
    if (!isValidExportName(exportName) || exportName === "default") {
      violations.push(
        createViolation("state-action-contract-export-name-invalid", {
          index,
          modulePath,
          exportName,
        }),
      );
    }
    if (entry.targetArgumentIndex !== 0) {
      violations.push(
        createViolation("state-action-contract-target-index-invalid", {
          index,
          modulePath,
          exportName,
          targetArgumentIndex: entry.targetArgumentIndex,
        }),
      );
    }
    const entryId = contractEntryId(entry);
    if (seenEntryIds.has(entryId)) {
      violations.push(
        createViolation("state-action-contract-entry-duplicate", {
          index,
          modulePath,
          exportName,
        }),
      );
    }
    seenEntryIds.add(entryId);
  }
  return violations;
}

function parseModuleSource(source = "") {
  return parse(String(source || ""), {
    ecmaVersion: "latest",
    sourceType: "module",
    locations: true,
    allowHashBang: true,
  });
}

function staticExportedName(node) {
  if (node?.type === "Identifier") {
    return node.name;
  }
  if (node?.type === "Literal") {
    return String(node.value || "");
  }
  return "";
}

function declarationExportedNames(declaration) {
  if (!declaration) {
    return [];
  }
  if (
    ["FunctionDeclaration", "ClassDeclaration"].includes(declaration.type)
    && declaration.id?.type === "Identifier"
  ) {
    return [declaration.id.name];
  }
  if (declaration.type !== "VariableDeclaration") {
    return [];
  }
  return (declaration.declarations || [])
    .map(({ id }) => id?.type === "Identifier" ? id.name : "")
    .filter(Boolean);
}

function collectNamedExportShapes(ast) {
  const directFunctions = new Map();
  const nonDirectExports = new Map();
  const add = (target, exportName, node, shape) => {
    if (!exportName) {
      return;
    }
    if (!target.has(exportName)) {
      target.set(exportName, []);
    }
    target.get(exportName).push({ node, shape });
  };

  for (const statement of ast?.body || []) {
    if (statement.type === "ExportAllDeclaration") {
      add(
        nonDirectExports,
        staticExportedName(statement.exported) || "*",
        statement,
        statement.exported ? "export-namespace" : "export-all",
      );
      continue;
    }
    if (statement.type === "ExportNamedDeclaration") {
      if (
        statement.declaration?.type === "FunctionDeclaration"
        && statement.declaration.id?.type === "Identifier"
      ) {
        add(
          directFunctions,
          statement.declaration.id.name,
          statement.declaration,
          "direct-function",
        );
      } else {
        for (
          const exportName of declarationExportedNames(
            statement.declaration,
          )
        ) {
          add(
            nonDirectExports,
            exportName,
            statement.declaration,
            `direct-${statement.declaration?.type || "declaration"}`,
          );
        }
      }
      for (const specifier of statement.specifiers || []) {
        add(
          nonDirectExports,
          staticExportedName(specifier.exported),
          specifier,
          statement.source ? "reexport" : "export-specifier",
        );
      }
      continue;
    }
    if (statement.type === "ExportDefaultDeclaration") {
      add(
        nonDirectExports,
        "default",
        statement.declaration,
        "default-export",
      );
    }
  }
  return { directFunctions, nonDirectExports };
}

export function validateStateActionModuleSource(
  source,
  {
    filePath = "",
    contractEntries = STATE_ACTION_DELEGATION_CONTRACT,
  } = {},
) {
  const normalizedPath = normalizeModulePath(filePath);
  const entries = (Array.isArray(contractEntries) ? contractEntries : [])
    .filter(
      (entry) =>
        normalizeModulePath(entry?.modulePath) === normalizedPath,
    );
  const violations = validateStateActionDelegationContract(entries);
  if (!entries.length) {
    return [
      ...violations,
      createViolation("state-action-module-contract-missing", {
        modulePath: normalizedPath,
      }),
    ];
  }

  let ast;
  try {
    ast = parseModuleSource(source);
  } catch (error) {
    return [
      ...violations,
      createViolation("state-action-source-parse-failed", {
        modulePath: normalizedPath,
        message: String(error?.message || ""),
      }),
    ];
  }

  const { directFunctions, nonDirectExports } =
    collectNamedExportShapes(ast);
  const registeredExportNames = new Set(
    entries.map(({ exportName }) => String(exportName || "")),
  );
  for (const [exportName, functions] of directFunctions) {
    if (registeredExportNames.has(exportName)) {
      continue;
    }
    for (const _function of functions) {
      violations.push(
        createViolation("state-action-direct-export-unregistered", {
          modulePath: normalizedPath,
          exportName,
        }),
      );
    }
  }
  for (const [exportName, exposures] of nonDirectExports) {
    if (registeredExportNames.has(exportName)) {
      continue;
    }
    for (const exposure of exposures) {
      violations.push(
        createViolation("state-action-export-unregistered", {
          modulePath: normalizedPath,
          exportName,
          shape: exposure.shape,
        }),
      );
    }
  }
  for (const entry of entries) {
    const exportName = String(entry.exportName || "");
    const functions = directFunctions.get(exportName) || [];
    const indirect = nonDirectExports.get(exportName) || [];
    if (!functions.length) {
      violations.push(
        createViolation("state-action-direct-export-missing", {
          modulePath: normalizedPath,
          exportName,
        }),
      );
    }
    if (functions.length > 1) {
      violations.push(
        createViolation("state-action-direct-export-duplicate", {
          modulePath: normalizedPath,
          exportName,
          count: functions.length,
        }),
      );
    }
    for (const exposure of indirect) {
      violations.push(
        createViolation("state-action-export-not-direct-function", {
          modulePath: normalizedPath,
          exportName,
          shape: exposure.shape,
          line: Number(exposure.node?.loc?.start?.line || 1),
          column: Number(exposure.node?.loc?.start?.column || 0) + 1,
        }),
      );
    }
    if (functions.length !== 1) {
      continue;
    }
    const targetParameter =
      functions[0].node.params?.[entry.targetArgumentIndex];
    if (!targetParameter) {
      violations.push(
        createViolation("state-action-target-parameter-missing", {
          modulePath: normalizedPath,
          exportName,
          targetArgumentIndex: entry.targetArgumentIndex,
        }),
      );
    } else if (targetParameter.type !== "Identifier") {
      violations.push(
        createViolation("state-action-target-parameter-shape-invalid", {
          modulePath: normalizedPath,
          exportName,
          targetArgumentIndex: entry.targetArgumentIndex,
          parameterType: targetParameter.type,
        }),
      );
    } else if (targetParameter.name !== "target") {
      violations.push(
        createViolation("state-action-target-parameter-name-invalid", {
          modulePath: normalizedPath,
          exportName,
          targetArgumentIndex: entry.targetArgumentIndex,
          parameterName: targetParameter.name,
        }),
      );
    }
  }
  return violations;
}

function bindingDiagnosticCount(binding = {}) {
  return (binding.grants || []).reduce(
    (count, grant) =>
      count
      + (grant.aliasSites || []).length
      + (grant.dynamicSites || []).length
      + (grant.ambiguousSites || []).length
      + (grant.unsupportedSites || []).length,
    0,
  );
}

export function validateStateActionPolicyBindings(
  policyOrWriters,
  {
    contractEntries = STATE_ACTION_DELEGATION_CONTRACT,
    modulePaths = null,
  } = {},
) {
  const writers = Array.isArray(policyOrWriters)
    ? policyOrWriters
    : (policyOrWriters?.writers || []);
  const activeModulePaths = new Set(
    (
      Array.isArray(modulePaths)
        ? modulePaths
        : (contractEntries || []).map(({ modulePath }) => modulePath)
    ).map(normalizeModulePath),
  );
  const entries = (Array.isArray(contractEntries) ? contractEntries : [])
    .filter((entry) =>
      activeModulePaths.has(normalizeModulePath(entry?.modulePath))
    );
  const entriesByModulePath = new Map();
  for (const entry of entries) {
    const modulePath = normalizeModulePath(entry.modulePath);
    if (!entriesByModulePath.has(modulePath)) {
      entriesByModulePath.set(modulePath, []);
    }
    entriesByModulePath.get(modulePath).push(entry);
  }

  const violations = [];
  for (const [modulePath, moduleEntries] of entriesByModulePath) {
    const writer = writers.find(
      ({ path: writerPath }) =>
        normalizeModulePath(writerPath) === modulePath,
    );
    if (!writer) {
      violations.push(
        createViolation("state-action-policy-writer-missing", {
          modulePath,
        }),
      );
      continue;
    }
    if (writer.authority !== "domain-action") {
      violations.push(
        createViolation("state-action-policy-writer-authority-invalid", {
          modulePath,
          authority: writer.authority,
        }),
      );
    }
    const registeredNames = new Set(
      moduleEntries.map(({ exportName }) => String(exportName)),
    );
    for (const binding of writer.bindings || []) {
      if (
        binding.kind === "function-parameter"
        && !registeredNames.has(String(binding.functionName || ""))
      ) {
        violations.push(
          createViolation("state-action-policy-binding-unregistered", {
            modulePath,
            functionName: String(binding.functionName || ""),
          }),
        );
      }
    }
    for (const entry of moduleEntries) {
      const matches = (writer.bindings || []).filter(
        (binding) =>
          binding.functionName === entry.exportName,
      );
      if (!matches.length) {
        violations.push(
          createViolation("state-action-policy-binding-missing", {
            modulePath,
            exportName: entry.exportName,
          }),
        );
        continue;
      }
      if (matches.length > 1) {
        violations.push(
          createViolation("state-action-policy-binding-duplicate", {
            modulePath,
            exportName: entry.exportName,
            count: matches.length,
          }),
        );
      }
      for (const binding of matches) {
        if (
          binding.authority !== "domain-action"
          || binding.kind !== "function-parameter"
        ) {
          violations.push(
            createViolation(
              "state-action-policy-binding-authority-invalid",
              {
                modulePath,
                exportName: entry.exportName,
                authority: binding.authority,
                kind: binding.kind,
              },
            ),
          );
        }
        if (
          binding.parameterIndex !== entry.targetArgumentIndex
          || binding.parameterIndex !== 0
          || String(binding.parameterPath || "") !== "$"
        ) {
          violations.push(
            createViolation("state-action-policy-binding-shape-invalid", {
              modulePath,
              exportName: entry.exportName,
              parameterIndex: binding.parameterIndex,
              parameterPath: binding.parameterPath,
            }),
          );
        }
        const diagnosticCount = bindingDiagnosticCount(binding);
        if (diagnosticCount > 0) {
          violations.push(
            createViolation(
              "state-action-policy-binding-diagnostics-invalid",
              {
                modulePath,
                exportName: entry.exportName,
                diagnosticCount,
              },
            ),
          );
        }
      }
    }
  }
  return violations;
}
