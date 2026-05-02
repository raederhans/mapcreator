import {
  getTransportCapabilityFamilyMetadata,
  isTransportCapabilityLivePreviewFamily,
  isTransportCapabilityManifestOnlyFamily,
  listTransportCapabilityWarmupPlans,
  listTransportRuntimeCapabilityFamilyIds,
} from "../core/transport_capability_registry.js";

export function getTransportWorkbenchFamilyRuntimeConfig(familyId) {
  const metadata = getTransportCapabilityFamilyMetadata(familyId);
  return metadata?.runtimeKind === "board" ? null : metadata;
}

export function listTransportWorkbenchRuntimeFamilyIds() {
  return listTransportRuntimeCapabilityFamilyIds();
}

export function listTransportWorkbenchWarmupPlans() {
  return listTransportCapabilityWarmupPlans();
}

export function isTransportWorkbenchLivePreviewFamily(familyId) {
  return isTransportCapabilityLivePreviewFamily(familyId);
}

export function isTransportWorkbenchManifestOnlyRuntimeFamily(familyId) {
  return isTransportCapabilityManifestOnlyFamily(familyId);
}
