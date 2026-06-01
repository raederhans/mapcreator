import { strToU8, zipSync } from "../../vendor/fflate.browser.js";

const EXPORT_ARTIFACT_VERSION = 1;
const EXPORT_ARTIFACT_MIME = "application/zip";
const TEXT_ENCODER = new TextEncoder();

function normalizeArtifactToken(value, fallback = "artifact") {
  const token = String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return token || fallback;
}

function normalizeArtifactPath(value, fallback = "file.bin") {
  const raw = String(value || "").trim().replace(/\\/g, "/");
  const cleaned = raw
    .split("/")
    .map((part) => String(part || "").trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, "-").replace(/^-+|-+$/g, ""))
    .filter((part) => part && part !== "." && part !== "..")
    .filter(Boolean)
    .join("/");
  return cleaned || fallback;
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Bytes(bytes) {
  if (!globalThis.crypto?.subtle?.digest) {
    throw new Error("SHA-256 digest API is unavailable.");
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return `sha256_${bytesToHex(new Uint8Array(digest))}`;
}

function normalizeManifestFileEntry(file = {}, fallbackPath = "file.bin") {
  const source = file?.meta && typeof file.meta === "object" ? file.meta : file;
  const path = normalizeArtifactPath(source?.path || source?.name, fallbackPath);
  const role = normalizeArtifactToken(source?.role, "payload");
  const mime = String(source?.mime || "application/octet-stream").trim() || "application/octet-stream";
  const entry = { path, role, mime };
  const byteLength = Number(source?.byteLength);
  if (Number.isFinite(byteLength) && byteLength >= 0) {
    entry.byteLength = Math.round(byteLength);
  }
  const checksum = String(source?.checksum || "").trim();
  if (checksum) {
    entry.checksum = checksum;
  }
  const dimensions = source?.dimensions && typeof source.dimensions === "object" ? source.dimensions : null;
  const width = Math.max(0, Math.round(Number(dimensions?.width || 0) || 0));
  const height = Math.max(0, Math.round(Number(dimensions?.height || 0) || 0));
  if (width || height) {
    entry.dimensions = { width, height };
  }
  return entry;
}

function serializeJsonBytes(value) {
  return strToU8(JSON.stringify(value, null, 2));
}

async function canvasToPngBytes(canvas) {
  if (!canvas || typeof canvas.toBlob !== "function") {
    throw new Error("Artifact canvas is unavailable.");
  }
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (nextBlob) {
        resolve(nextBlob);
        return;
      }
      reject(new Error("Unable to encode artifact canvas."));
    }, "image/png");
  });
  return new Uint8Array(await blob.arrayBuffer());
}

async function resolveArtifactFileBytes(file) {
  if (file?.bytes instanceof Uint8Array) return file.bytes;
  if (file?.bytes instanceof ArrayBuffer) return new Uint8Array(file.bytes);
  if (file?.blob instanceof Blob) return new Uint8Array(await file.blob.arrayBuffer());
  if (file?.canvas) return canvasToPngBytes(file.canvas);
  if (file?.json !== undefined) return serializeJsonBytes(file.json);
  if (file?.text !== undefined) return TEXT_ENCODER.encode(String(file.text));
  throw new Error(`Artifact file "${file?.path || ""}" has no encodable payload.`);
}

async function normalizeArtifactFiles(files = []) {
  const seenPaths = new Set();
  const normalized = [];
  for (const file of Array.isArray(files) ? files : []) {
    const path = normalizeArtifactPath(file?.path || file?.name, `file-${normalized.length + 1}.bin`);
    if (seenPaths.has(path)) {
      throw new Error(`Duplicate artifact file path: ${path}`);
    }
    seenPaths.add(path);
    const bytes = await resolveArtifactFileBytes(file);
    const width = Math.max(0, Math.round(Number(file?.width || file?.canvas?.width || 0) || 0));
    const height = Math.max(0, Math.round(Number(file?.height || file?.canvas?.height || 0) || 0));
    const checksum = await sha256Bytes(bytes);
    normalized.push({
      path,
      bytes,
      meta: {
        path,
        role: normalizeArtifactToken(file?.role, "payload"),
        mime: String(file?.mime || "application/octet-stream").trim(),
        byteLength: bytes.byteLength,
        checksum,
        ...(width || height ? { dimensions: { width, height } } : {}),
      },
    });
  }
  return normalized;
}

function buildExportArtifactManifest({
  artifactKind = "artifact",
  files = [],
  scenario = null,
  project = null,
  exportUi = null,
  publishedTarget = null,
  generatedAt = new Date().toISOString(),
} = {}) {
  return {
    artifactVersion: EXPORT_ARTIFACT_VERSION,
    artifactKind: normalizeArtifactToken(artifactKind),
    generatedAt,
    scenario,
    project,
    exportUi,
    publishedTarget,
    files: files.map((file, index) => normalizeManifestFileEntry(file, `file-${index + 1}.bin`)),
  };
}

async function buildExportArtifactPackage({
  artifactKind = "artifact",
  fileStem = "",
  files = [],
  scenario = null,
  project = null,
  exportUi = null,
  publishedTarget = null,
  generatedAt = new Date().toISOString(),
  manifestPath = "manifest.json",
} = {}) {
  const normalizedFiles = await normalizeArtifactFiles(files);
  const normalizedManifestPath = normalizeArtifactPath(manifestPath, "manifest.json");
  if (normalizedFiles.some((file) => file.path === normalizedManifestPath)) {
    throw new Error(`Artifact manifest path conflicts with payload file: ${normalizedManifestPath}`);
  }
  const manifest = buildExportArtifactManifest({
    artifactKind,
    files: normalizedFiles,
    scenario,
    project,
    exportUi,
    publishedTarget,
    generatedAt,
  });
  const zipEntries = Object.fromEntries(normalizedFiles.map((file) => [file.path, file.bytes]));
  zipEntries[normalizedManifestPath] = serializeJsonBytes(manifest);
  const zipBytes = zipSync(zipEntries);
  return {
    blob: new Blob([zipBytes], { type: EXPORT_ARTIFACT_MIME }),
    extension: "zip",
    fileStem: normalizeArtifactToken(fileStem, normalizeArtifactToken(artifactKind)),
    manifest,
  };
}

export {
  EXPORT_ARTIFACT_MIME,
  EXPORT_ARTIFACT_VERSION,
  buildExportArtifactManifest,
  buildExportArtifactPackage,
  sha256Bytes,
  normalizeManifestFileEntry,
  normalizeArtifactPath,
  normalizeArtifactToken,
};
