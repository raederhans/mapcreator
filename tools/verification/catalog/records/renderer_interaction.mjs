// Internal catalog definitions. Consumers use verification_catalog_source.mjs.
export const RENDERER_INTERACTION_RECORDS = [
  {
    "id": "node:test:node:click-selection-transaction-owner",
    "commandRef": "test:node:click-selection-transaction-owner",
    "sourceRefs": [
      "tests/click_selection_transaction_owner_behavior.test.mjs"
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
    "selectorOrder": 289,
    "verification": null,
    "selector": {}
  },
  {
    "id": "node:test:node:hit-canvas-scheduling-owner",
    "commandRef": "test:node:hit-canvas-scheduling-owner",
    "sourceRefs": [
      "tests/hit_canvas_scheduling_owner_behavior.test.mjs",
      "js/core/map_renderer/hit_canvas_scheduling_owner.js"
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
    "selectorOrder": 297,
    "verification": null,
    "selector": {}
  },
  {
    "id": "node:test:node:hit-canvas-scheduling-owner-inventory",
    "commandRef": "test:node:hit-canvas-scheduling-owner-inventory",
    "sourceRefs": [
      "tests/hit_canvas_scheduling_owner_inventory.test.mjs"
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
    "selectorOrder": 298,
    "verification": null,
    "selector": {}
  },
  {
    "id": "node:test:node:hit-canvas-scheduling-owner-suite",
    "commandRef": "test:node:hit-canvas-scheduling-owner-suite",
    "sourceRefs": [
      "tests/hit_canvas_scheduling_owner_behavior.test.mjs",
      "tests/hit_canvas_scheduling_owner_inventory.test.mjs",
      "tests/renderer_hit_canvas_scheduling_inventory_boundary.test.mjs",
      "js/core/map_renderer/hit_canvas_scheduling_owner.js"
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
    "selectorOrder": 299,
    "verification": null,
    "selector": {}
  },
  {
    "id": "node:test:node:interaction-hit-candidates",
    "commandRef": "test:node:interaction-hit-candidates",
    "sourceRefs": [
      "tests/interaction_hit_candidates_behavior.test.mjs",
      "js/core/map_renderer/interaction_hit_candidates.js"
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
    "selectorOrder": 229,
    "verification": null,
    "selector": {}
  },
  {
    "id": "node:test:node:map-hover-interaction",
    "commandRef": "test:node:map-hover-interaction",
    "sourceRefs": [
      "tests/map_hover_interaction_owner_behavior.test.mjs",
      "tests/map_hover_interaction_owner_inventory.test.mjs",
      "js/core/map_renderer/map_hover_interaction_owner.js"
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
    "selectorOrder": 303,
    "verification": null,
    "selector": {}
  },
  {
    "id": "node:test:node:map-hover-interaction-inventory",
    "commandRef": "test:node:map-hover-interaction-inventory",
    "sourceRefs": [
      "tests/map_hover_interaction_owner_inventory.test.mjs"
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
    "selectorOrder": 302,
    "verification": null,
    "selector": {}
  },
  {
    "id": "node:test:node:map-hover-interaction-owner",
    "commandRef": "test:node:map-hover-interaction-owner",
    "sourceRefs": [
      "tests/map_hover_interaction_owner_behavior.test.mjs",
      "js/core/map_renderer/map_hover_interaction_owner.js"
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
    "selectorOrder": 301,
    "verification": null,
    "selector": {}
  },
  {
    "id": "node:test:node:map-interaction-event-binding-owner",
    "commandRef": "test:node:map-interaction-event-binding-owner",
    "sourceRefs": [
      "tests/map_interaction_event_binding_owner_behavior.test.mjs",
      "js/core/renderer/map_interaction_event_binding_owner.js"
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
    "selectorOrder": 315,
    "verification": null,
    "selector": {}
  },
  {
    "id": "node:test:node:renderer-click-selection-transaction-inventory",
    "commandRef": "test:node:renderer-click-selection-transaction-inventory",
    "sourceRefs": [
      "tests/renderer_click_selection_transaction_inventory_boundary.test.mjs"
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
    "selectorOrder": 290,
    "verification": null,
    "selector": {}
  },
  {
    "id": "node:test:node:spatial-query-index",
    "commandRef": "test:node:spatial-query-index",
    "sourceRefs": [
      "tests/spatial_query_index_behavior.test.mjs",
      "js/core/renderer/spatial_query_index.js"
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
    "selectorOrder": 224,
    "verification": null,
    "selector": {}
  },
  {
    "id": "node:test:node:zoom-interaction-lifecycle-owner",
    "commandRef": "test:node:zoom-interaction-lifecycle-owner",
    "sourceRefs": [
      "tests/zoom_interaction_lifecycle_owner_behavior.test.mjs",
      "js/core/renderer/zoom_interaction_lifecycle_owner.js"
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
    "selectorOrder": 313,
    "verification": null,
    "selector": {}
  },
  {
    "id": "verify-core:test:node:click-selection-transaction-owner",
    "commandRef": "test:node:click-selection-transaction-owner",
    "sourceRefs": [
      "js/core/map_renderer.js",
      "js/core/map_renderer/click_selection_transaction_owner.js",
      "tests/click_selection_transaction_owner_behavior.test.mjs",
      "tests/renderer_click_selection_transaction_inventory_boundary.test.mjs",
      "tests/test_map_renderer_click_selection_transaction_boundary_contract.py",
      "tools/check_architecture_boundaries.mjs",
      "tools/verification/verification_domains.mjs",
      "tests/verification_metadata_behavior.test.mjs",
      "docs/active/renderer-click-selection-transaction-preflight-20260702.md",
      "docs/active/renderer-click-selection-transaction-preflight-p1-7-20260709.md",
      "docs/active/renderer-click-selection-pure-decision-owner-p1-8-20260709.md",
      "docs/active/renderer-runtime-context-p1-remaining-20260709/plan.md",
      "docs/active/renderer-runtime-context-p1-remaining-20260709/context.md",
      "docs/active/renderer-runtime-context-p1-remaining-20260709/task.md",
      "docs/active/_worktree_registry.md",
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
    "verificationOrder": 80,
    "selectorOrder": 67,
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
    "id": "verify-core:test:node:hit-canvas-scheduling-owner-suite",
    "commandRef": "test:node:hit-canvas-scheduling-owner-suite",
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
    "verificationOrder": 106,
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
    "id": "verify-core:test:node:map-interaction-event-binding-owner",
    "commandRef": "test:node:map-interaction-event-binding-owner",
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
    "verificationOrder": 108,
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
    "id": "verify-core:test:node:renderer-click-selection-transaction-inventory",
    "commandRef": "test:node:renderer-click-selection-transaction-inventory",
    "sourceRefs": [
      "js/core/map_renderer.js",
      "js/core/map_renderer/click_selection_transaction_owner.js",
      "js/core/map_renderer/map_hover_interaction_owner.js",
      "js/core/renderer/map_interaction_event_binding_owner.js",
      "js/core/map_renderer/interaction_hit_candidates.js",
      "js/core/interaction_funnel.js",
      "js/core/history_manager.js",
      "js/core/dirty_state.js",
      "js/core/map_renderer/public.js",
      "tools/eslint-rules/state-writer-allowlist.json",
      "tests/renderer_click_selection_transaction_inventory_boundary.test.mjs",
      "tests/click_selection_transaction_owner_behavior.test.mjs",
      "tests/test_map_renderer_click_selection_transaction_boundary_contract.py",
      "tools/check_architecture_boundaries.mjs",
      "tools/verification/verification_domains.mjs",
      "tests/verification_metadata_behavior.test.mjs",
      "docs/active/renderer-click-selection-transaction-preflight-20260702.md",
      "docs/active/renderer-click-selection-transaction-preflight-p1-7-20260709.md",
      "docs/active/renderer-click-selection-pure-decision-owner-p1-8-20260709.md",
      "docs/active/renderer-runtime-context-p1-remaining-20260709/plan.md",
      "docs/active/renderer-runtime-context-p1-remaining-20260709/context.md",
      "docs/active/renderer-runtime-context-p1-remaining-20260709/task.md",
      "docs/active/_worktree_registry.md",
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
    "verificationOrder": 81,
    "selectorOrder": 68,
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
    "id": "verify-core:test:node:zoom-interaction-lifecycle-owner",
    "commandRef": "test:node:zoom-interaction-lifecycle-owner",
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
    "verificationOrder": 107,
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
    "id": "verify-core:test:python:map-renderer-click-selection-transaction-boundary",
    "commandRef": "test:python:map-renderer-click-selection-transaction-boundary",
    "sourceRefs": [
      "js/core/map_renderer.js",
      "js/core/map_renderer/click_selection_transaction_owner.js",
      "js/core/map_renderer/map_hover_interaction_owner.js",
      "js/core/renderer/map_interaction_event_binding_owner.js",
      "js/core/map_renderer/interaction_hit_candidates.js",
      "js/core/interaction_funnel.js",
      "js/core/history_manager.js",
      "js/core/dirty_state.js",
      "js/core/map_renderer/public.js",
      "tools/eslint-rules/state-writer-allowlist.json",
      "tests/test_map_renderer_click_selection_transaction_boundary_contract.py",
      "tests/click_selection_transaction_owner_behavior.test.mjs",
      "tests/renderer_click_selection_transaction_inventory_boundary.test.mjs",
      "tools/check_architecture_boundaries.mjs",
      "tools/verification/verification_domains.mjs",
      "tests/verification_metadata_behavior.test.mjs",
      "docs/active/renderer-click-selection-transaction-preflight-20260702.md",
      "docs/active/renderer-click-selection-transaction-preflight-p1-7-20260709.md",
      "docs/active/renderer-click-selection-pure-decision-owner-p1-8-20260709.md",
      "docs/active/renderer-runtime-context-p1-remaining-20260709/plan.md",
      "docs/active/renderer-runtime-context-p1-remaining-20260709/context.md",
      "docs/active/renderer-runtime-context-p1-remaining-20260709/task.md",
      "docs/active/_worktree_registry.md",
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
    "verificationOrder": 98,
    "selectorOrder": 85,
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
    "id": "verify-core:test:python:map-renderer-hit-hover-context-boundary",
    "commandRef": "test:python:map-renderer-hit-hover-context-boundary",
    "sourceRefs": [
      "js/core/map_renderer.js",
      "js/core/map_renderer/hit_canvas_scheduling_owner.js",
      "js/core/map_renderer/map_hover_interaction_owner.js",
      "js/core/map_renderer/public.js",
      "tools/eslint-rules/state-writer-allowlist.json",
      "tests/test_map_renderer_hit_hover_context_boundary_contract.py",
      "docs/active/renderer-runtime-context-hit-hover-p1-6-20260709.md",
      "docs/active/renderer-runtime-context-p1-remaining-20260709/plan.md",
      "docs/active/renderer-runtime-context-p1-remaining-20260709/context.md",
      "docs/active/renderer-runtime-context-p1-remaining-20260709/task.md",
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
    "verificationOrder": 79,
    "selectorOrder": 66,
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
    "id": "verify-core:test:python:map-renderer-interaction-context-boundary",
    "commandRef": "test:python:map-renderer-interaction-context-boundary",
    "sourceRefs": [
      "js/core/map_renderer.js",
      "js/core/renderer/zoom_interaction_lifecycle_owner.js",
      "js/core/renderer/map_interaction_event_binding_owner.js",
      "js/core/map_renderer/public.js",
      "tools/eslint-rules/state-writer-allowlist.json",
      "tests/test_map_renderer_interaction_context_boundary_contract.py",
      "docs/active/renderer-runtime-context-interaction-p1-5-20260709.md",
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
    "verificationOrder": 77,
    "selectorOrder": 64,
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
