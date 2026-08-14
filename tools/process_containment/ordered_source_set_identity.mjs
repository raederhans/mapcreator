import crypto from "node:crypto";

export const ORDERED_CSHARP_SOURCE_SET_KIND = "ordered-csharp-source-set";

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function canonicalizeContainmentSourceDescriptor(descriptor) {
  return Object.freeze({
    path: String(descriptor?.path || ""),
    gitBlob: String(descriptor?.gitBlob || ""),
    lfNormalizedSha256: String(descriptor?.lfNormalizedSha256 || ""),
  });
}

export function buildContainmentSourceDescriptor(identityPath, sourceBytes) {
  const normalized = Buffer.from(
    Buffer.from(sourceBytes).toString("utf8").replace(/\r\n?/g, "\n"),
    "utf8",
  );
  const header = Buffer.from(`blob ${normalized.length}\0`, "utf8");
  return canonicalizeContainmentSourceDescriptor({
    path: identityPath,
    gitBlob: crypto.createHash("sha1").update(header).update(normalized).digest("hex"),
    lfNormalizedSha256: sha256(normalized),
  });
}

export function buildOrderedContainmentSourceSet(descriptors) {
  if (!Array.isArray(descriptors) || descriptors.length === 0) {
    throw new TypeError("ordered source set requires at least one descriptor");
  }
  const sources = Object.freeze(descriptors.map(canonicalizeContainmentSourceDescriptor));
  return Object.freeze({
    schemaVersion: 1,
    kind: ORDERED_CSHARP_SOURCE_SET_KIND,
    sha256: sha256(Buffer.from(JSON.stringify(sources), "utf8")),
    sources,
  });
}

export function isValidOrderedContainmentSourceSet(sourceSet) {
  if (
    sourceSet?.schemaVersion !== 1
    || sourceSet?.kind !== ORDERED_CSHARP_SOURCE_SET_KIND
    || !Array.isArray(sourceSet?.sources)
    || sourceSet.sources.length === 0
    || !/^[a-f0-9]{64}$/i.test(String(sourceSet?.sha256 || ""))
  ) return false;
  const canonical = sourceSet.sources.map(canonicalizeContainmentSourceDescriptor);
  if (canonical.some((descriptor) => (
    !descriptor.path
    || !/^[a-f0-9]{40}$/i.test(descriptor.gitBlob)
    || !/^[a-f0-9]{64}$/i.test(descriptor.lfNormalizedSha256)
  ))) return false;
  return sourceSet.sha256 === sha256(Buffer.from(JSON.stringify(canonical), "utf8"));
}

export function orderedContainmentSourceSetsEqual(left, right) {
  if (!isValidOrderedContainmentSourceSet(left) || !isValidOrderedContainmentSourceSet(right)) return false;
  return left.sha256 === right.sha256
    && left.sources.length === right.sources.length
    && left.sources.every((descriptor, index) => {
      const other = right.sources[index];
      return descriptor.path === other.path
        && descriptor.gitBlob === other.gitBlob
        && descriptor.lfNormalizedSha256 === other.lfNormalizedSha256;
    });
}
