// Internal catalog definitions. Consumers use verification_catalog_source.mjs.
export const RENDERER_PROJECTION_VIEWPORT_RECORDS = [
  {
    "id": "node:test:node:projected-geometry-bounds-owner",
    "commandRef": "test:node:projected-geometry-bounds-owner",
    "sourceRefs": [
      "tests/projected_geometry_bounds_owner_behavior.test.mjs",
      "js/core/renderer/projected_geometry_bounds_owner.js"
    ],
    "ownerHints": [
      "renderer-runtime"
    ],
    "domains": [
      "renderer-runtime"
    ],
    "tiers": [
      "contract"
    ],
    "cost": "fast",
    "resourceLocks": [],
    "executionOwners": [
      "child-safe"
    ],
    "profiles": [
      "pr-fast"
    ],
    "platforms": [
      "all"
    ],
    "entrypointPolicyIndex": 4,
    "verificationOrder": null,
    "selectorOrder": 309,
    "verification": null,
    "selector": {}
  },
  {
    "id": "node:test:node:renderer-fit-projection-lifecycle",
    "commandRef": "test:node:renderer-fit-projection-lifecycle",
    "sourceRefs": [
      "tests/renderer_fit_projection_owner_behavior.test.mjs",
      "tests/renderer_fit_projection_lifecycle_inventory_boundary.test.mjs",
      "js/core/renderer/renderer_fit_projection_owner.js"
    ],
    "ownerHints": [
      "renderer-runtime"
    ],
    "domains": [
      "renderer-runtime"
    ],
    "tiers": [
      "contract"
    ],
    "cost": "fast",
    "resourceLocks": [],
    "executionOwners": [
      "child-safe"
    ],
    "profiles": [
      "pr-fast"
    ],
    "platforms": [
      "all"
    ],
    "entrypointPolicyIndex": 4,
    "verificationOrder": null,
    "selectorOrder": 258,
    "verification": null,
    "selector": {}
  },
  {
    "id": "node:test:node:renderer-fit-projection-lifecycle-inventory",
    "commandRef": "test:node:renderer-fit-projection-lifecycle-inventory",
    "sourceRefs": [
      "tests/renderer_fit_projection_lifecycle_inventory_boundary.test.mjs"
    ],
    "ownerHints": [
      "renderer-runtime"
    ],
    "domains": [
      "renderer-runtime"
    ],
    "tiers": [
      "contract"
    ],
    "cost": "fast",
    "resourceLocks": [],
    "executionOwners": [
      "child-safe"
    ],
    "profiles": [
      "pr-fast"
    ],
    "platforms": [
      "all"
    ],
    "entrypointPolicyIndex": 4,
    "verificationOrder": null,
    "selectorOrder": 257,
    "verification": null,
    "selector": {}
  },
  {
    "id": "node:test:node:renderer-fit-projection-owner",
    "commandRef": "test:node:renderer-fit-projection-owner",
    "sourceRefs": [
      "tests/renderer_fit_projection_owner_behavior.test.mjs",
      "js/core/renderer/renderer_fit_projection_owner.js"
    ],
    "ownerHints": [
      "renderer-runtime"
    ],
    "domains": [
      "renderer-runtime"
    ],
    "tiers": [
      "contract"
    ],
    "cost": "fast",
    "resourceLocks": [],
    "executionOwners": [
      "child-safe"
    ],
    "profiles": [
      "pr-fast"
    ],
    "platforms": [
      "all"
    ],
    "entrypointPolicyIndex": 4,
    "verificationOrder": null,
    "selectorOrder": 256,
    "verification": null,
    "selector": {}
  },
  {
    "id": "node:test:node:renderer-projection-contract",
    "commandRef": "test:node:renderer-projection-contract",
    "sourceRefs": [
      "tests/renderer_projection_contract_inventory.test.mjs",
      "tools/verification/renderer_projection_contract.mjs",
      "js/core/map_renderer.js",
      "js/core/map_renderer/public.js",
      "js/core/renderer/renderer_projection_path_owner.js",
      "js/core/renderer/renderer_surface_lifecycle_owner.js",
      "js/core/renderer/renderer_surface_host.js",
      "js/core/renderer/projected_geometry_bounds_owner.js",
      "js/core/renderer/viewport_read_model_owner.js",
      "docs/active/renderer-projection-path-lifecycle-preflight-20260627.md",
      "package.json"
    ],
    "ownerHints": [
      "renderer-runtime"
    ],
    "domains": [
      "renderer-runtime"
    ],
    "tiers": [
      "contract"
    ],
    "cost": "fast",
    "resourceLocks": [],
    "executionOwners": [
      "child-safe"
    ],
    "profiles": [
      "pr-fast"
    ],
    "platforms": [
      "all"
    ],
    "entrypointPolicyIndex": 4,
    "verificationOrder": null,
    "selectorOrder": 389,
    "verification": null,
    "selector": {}
  },
  {
    "id": "node:test:node:renderer-projection-path-lifecycle",
    "commandRef": "test:node:renderer-projection-path-lifecycle",
    "sourceRefs": [
      "tests/renderer_projection_path_owner_behavior.test.mjs",
      "tests/renderer_projection_path_lifecycle_inventory_boundary.test.mjs",
      "js/core/renderer/renderer_projection_path_owner.js"
    ],
    "ownerHints": [
      "renderer-runtime"
    ],
    "domains": [
      "renderer-runtime"
    ],
    "tiers": [
      "contract"
    ],
    "cost": "fast",
    "resourceLocks": [],
    "executionOwners": [
      "child-safe"
    ],
    "profiles": [
      "pr-fast"
    ],
    "platforms": [
      "all"
    ],
    "entrypointPolicyIndex": 4,
    "verificationOrder": null,
    "selectorOrder": 252,
    "verification": null,
    "selector": {}
  },
  {
    "id": "node:test:node:renderer-projection-path-lifecycle-inventory",
    "commandRef": "test:node:renderer-projection-path-lifecycle-inventory",
    "sourceRefs": [
      "tests/renderer_projection_path_lifecycle_inventory_boundary.test.mjs"
    ],
    "ownerHints": [
      "renderer-runtime"
    ],
    "domains": [
      "renderer-runtime"
    ],
    "tiers": [
      "contract"
    ],
    "cost": "fast",
    "resourceLocks": [],
    "executionOwners": [
      "child-safe"
    ],
    "profiles": [
      "pr-fast"
    ],
    "platforms": [
      "all"
    ],
    "entrypointPolicyIndex": 4,
    "verificationOrder": null,
    "selectorOrder": 251,
    "verification": null,
    "selector": {}
  },
  {
    "id": "node:test:node:renderer-projection-path-owner",
    "commandRef": "test:node:renderer-projection-path-owner",
    "sourceRefs": [
      "tests/renderer_projection_path_owner_behavior.test.mjs",
      "js/core/renderer/renderer_projection_path_owner.js"
    ],
    "ownerHints": [
      "renderer-runtime"
    ],
    "domains": [
      "renderer-runtime"
    ],
    "tiers": [
      "contract"
    ],
    "cost": "fast",
    "resourceLocks": [],
    "executionOwners": [
      "child-safe"
    ],
    "profiles": [
      "pr-fast"
    ],
    "platforms": [
      "all"
    ],
    "entrypointPolicyIndex": 4,
    "verificationOrder": null,
    "selectorOrder": 250,
    "verification": null,
    "selector": {}
  },
  {
    "id": "node:test:node:renderer-viewport-update-owner",
    "commandRef": "test:node:renderer-viewport-update-owner",
    "sourceRefs": [
      "tests/renderer_viewport_update_owner_behavior.test.mjs",
      "js/core/renderer/renderer_viewport_update_owner.js"
    ],
    "ownerHints": [
      "renderer-runtime"
    ],
    "domains": [
      "renderer-runtime"
    ],
    "tiers": [
      "contract"
    ],
    "cost": "fast",
    "resourceLocks": [],
    "executionOwners": [
      "child-safe"
    ],
    "profiles": [
      "pr-fast"
    ],
    "platforms": [
      "all"
    ],
    "entrypointPolicyIndex": 4,
    "verificationOrder": null,
    "selectorOrder": 259,
    "verification": null,
    "selector": {}
  },
  {
    "id": "node:test:node:viewport-command-owner",
    "commandRef": "test:node:viewport-command-owner",
    "sourceRefs": [
      "tests/viewport_command_owner_behavior.test.mjs",
      "js/core/renderer/viewport_command_owner.js"
    ],
    "ownerHints": [
      "renderer-runtime"
    ],
    "domains": [
      "renderer-runtime"
    ],
    "tiers": [
      "contract"
    ],
    "cost": "fast",
    "resourceLocks": [],
    "executionOwners": [
      "child-safe"
    ],
    "profiles": [
      "pr-fast"
    ],
    "platforms": [
      "all"
    ],
    "entrypointPolicyIndex": 4,
    "verificationOrder": null,
    "selectorOrder": 311,
    "verification": null,
    "selector": {}
  },
  {
    "id": "node:test:node:viewport-read-model-owner",
    "commandRef": "test:node:viewport-read-model-owner",
    "sourceRefs": [
      "tests/viewport_read_model_owner_behavior.test.mjs",
      "js/core/renderer/viewport_read_model_owner.js"
    ],
    "ownerHints": [
      "renderer-runtime"
    ],
    "domains": [
      "renderer-runtime"
    ],
    "tiers": [
      "contract"
    ],
    "cost": "fast",
    "resourceLocks": [],
    "executionOwners": [
      "child-safe"
    ],
    "profiles": [
      "pr-fast"
    ],
    "platforms": [
      "all"
    ],
    "entrypointPolicyIndex": 4,
    "verificationOrder": null,
    "selectorOrder": 310,
    "verification": null,
    "selector": {}
  },
  {
    "id": "node:test:node:viewport-resize-lifecycle-owner",
    "commandRef": "test:node:viewport-resize-lifecycle-owner",
    "sourceRefs": [
      "tests/viewport_resize_lifecycle_owner_behavior.test.mjs",
      "js/core/renderer/viewport_resize_lifecycle_owner.js"
    ],
    "ownerHints": [
      "renderer-runtime"
    ],
    "domains": [
      "renderer-runtime"
    ],
    "tiers": [
      "contract"
    ],
    "cost": "fast",
    "resourceLocks": [],
    "executionOwners": [
      "child-safe"
    ],
    "profiles": [
      "pr-fast"
    ],
    "platforms": [
      "all"
    ],
    "entrypointPolicyIndex": 4,
    "verificationOrder": null,
    "selectorOrder": 312,
    "verification": null,
    "selector": {}
  },
  {
    "id": "verify-core:test:node:renderer-viewport-update-owner",
    "commandRef": "test:node:renderer-viewport-update-owner",
    "sourceRefs": [
      "js/core/map_renderer.js",
      "js/core/renderer/renderer_viewport_update_owner.js",
      "tests/renderer_viewport_update_owner_behavior.test.mjs",
      "docs/active/renderer-runtime-context-viewport-mutation-chain-p1-4-20260709.md",
      "package.json"
    ],
    "ownerHints": [
      "renderer-runtime"
    ],
    "domains": [
      "renderer-runtime"
    ],
    "tiers": [
      "contract"
    ],
    "cost": "fast",
    "resourceLocks": [],
    "executionOwners": [
      "child-safe"
    ],
    "profiles": [
      "pr-fast"
    ],
    "platforms": [
      "all"
    ],
    "entrypointPolicyIndex": 4,
    "verificationOrder": 74,
    "selectorOrder": 61,
    "verification": {
      "commandType": "package-script",
      "packageScriptRequired": true,
      "verifyCoreDefaultGroup": "renderer-owner",
      "supervisorDomain": "renderer-runtime",
      "routeRegistry": true
    },
    "selector": {}
  },
  {
    "id": "verify-core:test:node:viewport-command-owner",
    "commandRef": "test:node:viewport-command-owner",
    "sourceRefs": [
      "package.json",
      "tests/verify_core_runner_behavior.test.mjs"
    ],
    "ownerHints": [
      "renderer-runtime"
    ],
    "domains": [
      "renderer-runtime"
    ],
    "tiers": [
      "contract"
    ],
    "cost": "fast",
    "resourceLocks": [],
    "executionOwners": [
      "child-safe"
    ],
    "profiles": [
      "pr-fast"
    ],
    "platforms": [
      "all"
    ],
    "entrypointPolicyIndex": 4,
    "verificationOrder": 113,
    "selectorOrder": null,
    "verification": {
      "commandType": "package-script",
      "packageScriptRequired": true,
      "verifyCoreDefaultGroup": "renderer-owner",
      "supervisorDomain": "renderer-runtime"
    },
    "selector": null
  },
  {
    "id": "verify-core:test:node:viewport-read-model-owner",
    "commandRef": "test:node:viewport-read-model-owner",
    "sourceRefs": [
      "package.json",
      "tests/verify_core_runner_behavior.test.mjs"
    ],
    "ownerHints": [
      "renderer-runtime"
    ],
    "domains": [
      "renderer-runtime"
    ],
    "tiers": [
      "contract"
    ],
    "cost": "fast",
    "resourceLocks": [],
    "executionOwners": [
      "child-safe"
    ],
    "profiles": [
      "pr-fast"
    ],
    "platforms": [
      "all"
    ],
    "entrypointPolicyIndex": 4,
    "verificationOrder": 112,
    "selectorOrder": null,
    "verification": {
      "commandType": "package-script",
      "packageScriptRequired": true,
      "verifyCoreDefaultGroup": "renderer-owner",
      "supervisorDomain": "renderer-runtime"
    },
    "selector": null
  },
  {
    "id": "verify-core:test:node:viewport-resize-lifecycle-owner",
    "commandRef": "test:node:viewport-resize-lifecycle-owner",
    "sourceRefs": [
      "js/core/map_renderer.js",
      "js/core/renderer/viewport_resize_lifecycle_owner.js",
      "tests/viewport_resize_lifecycle_owner_behavior.test.mjs",
      "docs/active/renderer-runtime-context-viewport-mutation-chain-p1-4-20260709.md",
      "package.json"
    ],
    "ownerHints": [
      "renderer-runtime"
    ],
    "domains": [
      "renderer-runtime"
    ],
    "tiers": [
      "contract"
    ],
    "cost": "fast",
    "resourceLocks": [],
    "executionOwners": [
      "child-safe"
    ],
    "profiles": [
      "pr-fast"
    ],
    "platforms": [
      "all"
    ],
    "entrypointPolicyIndex": 4,
    "verificationOrder": 75,
    "selectorOrder": 62,
    "verification": {
      "commandType": "package-script",
      "packageScriptRequired": true,
      "verifyCoreDefaultGroup": "renderer-owner",
      "supervisorDomain": "renderer-runtime",
      "routeRegistry": true
    },
    "selector": {}
  },
  {
    "id": "verify-core:test:python:map-renderer-projection-viewport-context-boundary",
    "commandRef": "test:python:map-renderer-projection-viewport-context-boundary",
    "sourceRefs": [
      "js/core/map_renderer.js",
      "js/core/renderer/renderer_projection_path_owner.js",
      "js/core/renderer/viewport_read_model_owner.js",
      "js/core/renderer/viewport_command_owner.js",
      "tests/test_map_renderer_projection_viewport_context_boundary_contract.py",
      "docs/active/renderer-runtime-context-projection-viewport-p1-3-20260709.md",
      "package.json"
    ],
    "ownerHints": [
      "renderer-runtime"
    ],
    "domains": [
      "renderer-runtime"
    ],
    "tiers": [
      "contract"
    ],
    "cost": "fast",
    "resourceLocks": [],
    "executionOwners": [
      "child-safe"
    ],
    "profiles": [
      "pr-fast"
    ],
    "platforms": [
      "all"
    ],
    "entrypointPolicyIndex": 4,
    "verificationOrder": 71,
    "selectorOrder": 58,
    "verification": {
      "commandType": "package-script",
      "packageScriptRequired": true,
      "verifyCoreDefaultGroup": "renderer-owner",
      "supervisorDomain": "renderer-runtime",
      "routeRegistry": true
    },
    "selector": {}
  },
  {
    "id": "verify-core:test:python:map-renderer-viewport-mutation-context-boundary",
    "commandRef": "test:python:map-renderer-viewport-mutation-context-boundary",
    "sourceRefs": [
      "js/core/map_renderer.js",
      "js/core/map_renderer/public.js",
      "tools/eslint-rules/state-writer-allowlist.json",
      "tests/test_map_renderer_viewport_mutation_context_boundary_contract.py",
      "docs/active/renderer-runtime-context-viewport-mutation-chain-p1-4-20260709.md",
      "package.json"
    ],
    "ownerHints": [
      "renderer-runtime"
    ],
    "domains": [
      "renderer-runtime"
    ],
    "tiers": [
      "contract"
    ],
    "cost": "fast",
    "resourceLocks": [],
    "executionOwners": [
      "child-safe"
    ],
    "profiles": [
      "pr-fast"
    ],
    "platforms": [
      "all"
    ],
    "entrypointPolicyIndex": 4,
    "verificationOrder": 73,
    "selectorOrder": 60,
    "verification": {
      "commandType": "package-script",
      "packageScriptRequired": true,
      "verifyCoreDefaultGroup": "renderer-owner",
      "supervisorDomain": "renderer-runtime",
      "routeRegistry": true
    },
    "selector": {}
  }
];
