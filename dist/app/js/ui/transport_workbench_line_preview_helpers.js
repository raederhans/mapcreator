export function createLinePathDFromPoints(points) {
  if (!Array.isArray(points) || !points.length) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point[0]} ${point[1]}`).join(" ");
}

export function listLineGeometryParts(geometry) {
  if (!geometry || typeof geometry !== "object") return [];
  if (geometry.type === "LineString") return Array.isArray(geometry.coordinates) ? [geometry.coordinates] : [];
  if (geometry.type === "MultiLineString") return Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
  return [];
}

export function createLinePathD(geometry) {
  return listLineGeometryParts(geometry)
    .map((line) => createLinePathDFromPoints(line))
    .filter(Boolean)
    .join(" ");
}

export function measureProjectedLineLength(geometry) {
  let length = 0;
  listLineGeometryParts(geometry).forEach((line) => {
    for (let index = 1; index < line.length; index += 1) {
      const [x0, y0] = line[index - 1];
      const [x1, y1] = line[index];
      length += Math.hypot(x1 - x0, y1 - y0);
    }
  });
  return length;
}

export function buildProjectedLineSegments(geometry) {
  return listLineGeometryParts(geometry)
    .filter((line) => Array.isArray(line) && line.length >= 2)
    .map((line) => {
      let length = 0;
      const segments = [];
      for (let index = 1; index < line.length; index += 1) {
        const start = line[index - 1];
        const end = line[index];
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const segmentLength = Math.hypot(dx, dy);
        segments.push({
          start,
          end,
          startDistance: length,
          length: segmentLength,
          angle: Math.atan2(dy, dx) * (180 / Math.PI),
        });
        length += segmentLength;
      }
      return {
        points: line,
        pathD: createLinePathDFromPoints(line),
        length,
        segments,
      };
    })
    .filter((line) => line.length > 0);
}

export function keepFirstPerGridBucket(entries, {
  gridSize,
  getScreenPoint,
  getBucketParts = () => [],
} = {}) {
  const usedBuckets = new Set();
  return entries.filter((entry) => {
    const screenPoint = getScreenPoint(entry);
    if (!screenPoint) return false;
    const bucketParts = [
      Math.round(screenPoint.x / gridSize),
      Math.round(screenPoint.y / gridSize),
      ...getBucketParts(entry),
    ];
    const bucketKey = bucketParts.join(":");
    if (usedBuckets.has(bucketKey)) return false;
    usedBuckets.add(bucketKey);
    return true;
  });
}

function datasetKeyToAttributeName(datasetKey) {
  return String(datasetKey || "").replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

export function findClosestDatasetNode(startNode, datasetKey, boundaryNode) {
  const ElementCtor = boundaryNode?.ownerDocument?.defaultView?.Element || globalThis.Element;
  const startElement = ElementCtor && startNode instanceof ElementCtor
    ? startNode
    : startNode?.parentElement;
  if (!startElement || typeof startElement.closest !== "function") return null;
  const datasetAttribute = datasetKeyToAttributeName(datasetKey);
  const node = startElement.closest(`[data-${datasetAttribute}]`);
  if (!node) return null;
  if (!boundaryNode) return node;
  if (node === boundaryNode) return node;
  return typeof boundaryNode.contains === "function" && boundaryNode.contains(node) ? node : null;
}
