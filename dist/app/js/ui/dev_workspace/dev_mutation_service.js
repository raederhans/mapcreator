const DEV_SCENARIO_MUTATION_PREFIX = "/__dev/scenario/";
const DEV_SCENARIO_MUTATION_ENDPOINTS = new Set([
  "/__dev/scenario/districts/save",
  "/__dev/scenario/district-templates/save",
  "/__dev/scenario/district-templates/apply",
  "/__dev/scenario/tag/create",
  "/__dev/scenario/ownership/save",
  "/__dev/scenario/country/save",
  "/__dev/scenario/capital/save",
  "/__dev/scenario/geo-locale/save",
]);

/**
 * Sends dev-only scenario mutation POST requests through one narrow boundary.
 * Diagnostics, runtime metadata, and manifest-driven reload URLs stay in their own API domains.
 */
export async function postDevScenarioMutation(endpoint, payload) {
  const normalizedEndpoint = String(endpoint || "").trim();
  if (
    !normalizedEndpoint.startsWith(DEV_SCENARIO_MUTATION_PREFIX) ||
    !DEV_SCENARIO_MUTATION_ENDPOINTS.has(normalizedEndpoint)
  ) {
    throw new Error(`Invalid dev scenario mutation endpoint: ${normalizedEndpoint}`);
  }

  const response = await fetch(normalizedEndpoint, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  return { response, result };
}
