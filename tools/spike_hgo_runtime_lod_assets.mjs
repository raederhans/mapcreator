import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const REPO_ROOT = process.cwd();
const DEFAULT_OUTPUT = path.join(REPO_ROOT, ".runtime", "reports", "generated", "hgo_runtime_lod_spike.json");
const HGO_RUNTIME_DIR = path.join(REPO_ROOT, "data", "hgo_runtime");
const HGO_CATALOG_DIR = path.join(REPO_ROOT, "data", "hgo_catalogs");
const BUILD_PAGES_DIST_PATH = path.join(REPO_ROOT, "tools", "build_pages_dist.py");
const FLAG_TIERS = ["small", "medium", "full"];

function parseArgs(argv) {
  const args = {
    output: DEFAULT_OUTPUT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--output") args.output = path.resolve(argv[++index]);
  }
  return args;
}

function toRepoPath(value) {
  return path.relative(REPO_ROOT, value).replace(/\\/g, "/");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function fileSummary(relativePath, includeHash = false) {
  const filePath = path.join(REPO_ROOT, relativePath);
  const stat = fs.statSync(filePath);
  const summary = {
    path: relativePath.replace(/\\/g, "/"),
    sizeBytes: stat.size,
  };
  if (includeHash) {
    summary.sha256 = sha256(filePath);
  }
  return summary;
}

function parsePythonStringTuple(source, name) {
  const match = source.match(new RegExp(`${name}\\s*=\\s*\\(([\\s\\S]*?)\\)`, "m"));
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
}

function readPagesDistHgoPolicy() {
  const source = fs.readFileSync(BUILD_PAGES_DIST_PATH, "utf8");
  return {
    sourcePath: toRepoPath(BUILD_PAGES_DIST_PATH),
    runtimeFiles: parsePythonStringTuple(source, "HGO_RUNTIME_FILES"),
    identityRuntimeFiles: parsePythonStringTuple(source, "HGO_IDENTITY_RUNTIME_FILES"),
    publishedFlagTiers: parsePythonStringTuple(source, "HGO_IDENTITY_FLAG_TIERS"),
  };
}

function readBmpHeader(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.toString("ascii", 0, 2) !== "BM") {
    throw new Error(`${toRepoPath(filePath)} is not a BMP file`);
  }
  const width = buffer.readInt32LE(18);
  const rawHeight = buffer.readInt32LE(22);
  const height = Math.abs(rawHeight);
  const bitsPerPixel = buffer.readUInt16LE(28);
  const compression = buffer.readUInt32LE(30);
  const pixelDataOffset = buffer.readUInt32LE(10);
  const imageSizeHeader = buffer.readUInt32LE(34);
  const rowStride = Math.floor((bitsPerPixel * width + 31) / 32) * 4;
  return {
    width,
    height,
    bitsPerPixel,
    compression,
    pixelDataOffset,
    imageSizeHeader,
    rowStride,
    computedPixelBytes: rowStride * height,
    topDown: rawHeight < 0,
  };
}

function byteLengthOfJson(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function summarizeSeed(seed) {
  const sections = {};
  for (const key of Object.keys(seed).sort()) {
    const value = seed[key];
    const entry = {
      serializedBytes: byteLengthOfJson(value),
      type: Array.isArray(value) ? "array" : typeof value,
    };
    if (Array.isArray(value)) {
      entry.count = value.length;
    } else if (value && typeof value === "object") {
      entry.count = Object.keys(value).length;
    }
    sections[key] = entry;
  }
  return {
    summary: seed.summary || {},
    sections,
  };
}

function collectFlagEntries(flagManifest) {
  const entries = [];
  for (const [tag, tagEntry] of Object.entries(flagManifest.tags || {})) {
    for (const [tier, asset] of Object.entries(tagEntry.base || {})) {
      entries.push({ tag, variant: "base", tier, asset });
    }
    for (const [variant, variantEntry] of Object.entries(tagEntry.variants || {})) {
      for (const [tier, asset] of Object.entries(variantEntry || {})) {
        entries.push({ tag, variant, tier, asset });
      }
    }
  }
  return entries;
}

function emptyTierSummary() {
  return {
    manifestFileCount: 0,
    manifestBytes: 0,
    statFileCount: 0,
    statBytes: 0,
    missingFileCount: 0,
    largestFile: null,
  };
}

function summarizeFlags(flagManifest) {
  const byTier = Object.fromEntries(FLAG_TIERS.map((tier) => [tier, emptyTierSummary()]));
  for (const entry of collectFlagEntries(flagManifest)) {
    const tierSummary = byTier[entry.tier] || (byTier[entry.tier] = emptyTierSummary());
    const manifestBytes = Number(entry.asset?.byte_length || 0);
    tierSummary.manifestFileCount += 1;
    tierSummary.manifestBytes += manifestBytes;
    const assetPath = path.join(REPO_ROOT, entry.asset?.png_path || "");
    if (!entry.asset?.png_path || !fs.existsSync(assetPath)) {
      tierSummary.missingFileCount += 1;
      continue;
    }
    const statBytes = fs.statSync(assetPath).size;
    tierSummary.statFileCount += 1;
    tierSummary.statBytes += statBytes;
    if (!tierSummary.largestFile || statBytes > tierSummary.largestFile.sizeBytes) {
      tierSummary.largestFile = {
        path: toRepoPath(assetPath),
        sizeBytes: statBytes,
        tag: entry.tag,
        variant: entry.variant,
      };
    }
  }
  return {
    catalogPath: "data/hgo_catalogs/hgo_flags.png_manifest.json",
    manifestCounts: flagManifest.counts || {},
    byTier,
  };
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function buildReport() {
  const runtimeManifestPath = path.join(HGO_RUNTIME_DIR, "manifest.json");
  const seedPath = path.join(HGO_RUNTIME_DIR, "seed.json");
  const bmpPath = path.join(HGO_RUNTIME_DIR, "provinces.bmp");
  const flagManifestPath = path.join(HGO_CATALOG_DIR, "hgo_flags.png_manifest.json");

  const runtimeManifest = readJson(runtimeManifestPath);
  const seed = readJson(seedPath);
  const flagManifest = readJson(flagManifestPath);
  const pagesDistPolicy = readPagesDistHgoPolicy();
  const runtimeAssets = pagesDistPolicy.runtimeFiles.map((fileName) => fileSummary(path.join("data", "hgo_runtime", fileName), true));
  const identityRuntimeAssets = pagesDistPolicy.identityRuntimeFiles.map((fileName) => fileSummary(path.join("data", "hgo_catalogs", fileName)));
  const flagCatalog = summarizeFlags(flagManifest);
  const publishedFlagTierBytes = Object.fromEntries(
    pagesDistPolicy.publishedFlagTiers.map((tier) => [tier, flagCatalog.byTier[tier]?.statBytes || 0])
  );

  const runtimeDataBytes = sum(runtimeAssets.map((asset) => asset.sizeBytes));
  const identityRuntimeBytes = sum(identityRuntimeAssets.map((asset) => asset.sizeBytes));
  const publishedFlagBytes = sum(Object.values(publishedFlagTierBytes));
  const fullFlagTierBytes = flagCatalog.byTier.full?.statBytes || 0;

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sources: {
      runtimeManifest: toRepoPath(runtimeManifestPath),
      seed: toRepoPath(seedPath),
      provincesBmp: toRepoPath(bmpPath),
      flagManifest: toRepoPath(flagManifestPath),
      pagesDistPolicy,
    },
    runtimeManifest: {
      runtimeId: runtimeManifest.runtime_id,
      generatedAtUtc: runtimeManifest.generated_at_utc,
      seedSummary: runtimeManifest.seed_summary,
      assets: runtimeManifest.assets,
    },
    runtimeAssets: {
      files: runtimeAssets,
      totalBytes: runtimeDataBytes,
    },
    provincesBmp: {
      ...fileSummary("data/hgo_runtime/provinces.bmp", true),
      ...readBmpHeader(bmpPath),
    },
    seed: {
      ...fileSummary("data/hgo_runtime/seed.json", true),
      ...summarizeSeed(seed),
    },
    identityRuntimeAssets: {
      files: identityRuntimeAssets,
      totalBytes: identityRuntimeBytes,
    },
    flagCatalog,
    pagesDistSurface: {
      runtimeDataBytes,
      identityRuntimeBytes,
      publishedFlagTierBytes,
      publishedFlagBytes,
      totalPublishedHgoBytes: runtimeDataBytes + identityRuntimeBytes + publishedFlagBytes,
      omittedFullFlagTierBytes: fullFlagTierBytes,
    },
    candidateOrder: [
      {
        candidate: "hgo_runtime_provinces_bmp",
        measuredBytes: fs.statSync(bmpPath).size,
        reason: "single largest published HGO runtime asset",
      },
      {
        candidate: "hgo_runtime_seed",
        measuredBytes: fs.statSync(seedPath).size,
        reason: "large structured seed with province, state, country, and province_to_state sections",
      },
      {
        candidate: "hgo_identity_flags_medium_tier",
        measuredBytes: flagCatalog.byTier.medium?.statBytes || 0,
        reason: "medium flag tier is published by Pages and can be measured separately from small flags",
      },
    ],
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = buildReport();
  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  fs.writeFileSync(args.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Wrote HGO runtime LOD spike report to ${toRepoPath(args.output)}.`);
  console.log(JSON.stringify(report.pagesDistSurface));
}

main();
