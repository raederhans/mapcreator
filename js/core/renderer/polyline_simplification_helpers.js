const COASTLINE_SIMPLIFY_LATITUDE_SCALE_MAX = 2.8;
const COASTLINE_SIMPLIFY_MIN_COS_LAT = 0.35;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getSqPointToSegmentDistance(point, start, end) {
  const vx = end[0] - start[0];
  const vy = end[1] - start[1];
  const wx = point[0] - start[0];
  const wy = point[1] - start[1];
  const lengthSq = vx * vx + vy * vy;
  if (lengthSq <= 0) {
    return wx * wx + wy * wy;
  }
  let t = (wx * vx + wy * vy) / lengthSq;
  t = clamp(t, 0, 1);
  const projX = start[0] + t * vx;
  const projY = start[1] + t * vy;
  const dx = point[0] - projX;
  const dy = point[1] - projY;
  return dx * dx + dy * dy;
}

export function simplifyPolylineRDP(points, epsilon) {
  if (!Array.isArray(points) || points.length <= 2) {
    return Array.isArray(points) ? points.slice() : [];
  }

  const eps = Math.max(0, Number(epsilon) || 0);
  if (eps <= 0) {
    return points.slice();
  }

  const sqEps = eps * eps;
  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const stack = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [startIdx, endIdx] = stack.pop();
    let maxSqDist = -1;
    let splitIdx = -1;
    const start = points[startIdx];
    const end = points[endIdx];
    for (let i = startIdx + 1; i < endIdx; i += 1) {
      const sqDist = getSqPointToSegmentDistance(points[i], start, end);
      if (sqDist > maxSqDist) {
        maxSqDist = sqDist;
        splitIdx = i;
      }
    }

    if (splitIdx >= 0 && maxSqDist > sqEps) {
      keep[splitIdx] = true;
      stack.push([startIdx, splitIdx], [splitIdx, endIdx]);
    }
  }

  const result = [];
  for (let i = 0; i < points.length; i += 1) {
    if (keep[i]) {
      result.push(points[i]);
    }
  }
  return result.length >= 2 ? result : points.slice(0, 2);
}

export function sanitizePolyline(line) {
  if (!Array.isArray(line)) return [];
  const result = [];
  line.forEach((point) => {
    if (!Array.isArray(point) || point.length < 2) return;
    const x = Number(point[0]);
    const y = Number(point[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const prev = result[result.length - 1];
    if (prev && prev[0] === x && prev[1] === y) return;
    result.push([x, y]);
  });
  return result;
}

export function getPolylineMeanAbsLatitude(line) {
  if (!Array.isArray(line) || !line.length) return 0;
  let total = 0;
  let count = 0;
  line.forEach((point) => {
    const lat = Number(point?.[1]);
    if (!Number.isFinite(lat)) return;
    total += Math.abs(lat);
    count += 1;
  });
  return count > 0 ? total / count : 0;
}

export function getLatitudeAdjustedSimplifyEpsilon(baseEpsilon, line) {
  const epsilon = Math.max(0, Number(baseEpsilon) || 0);
  if (!(epsilon > 0)) return 0;
  const meanAbsLatitude = getPolylineMeanAbsLatitude(line);
  const cosLatitude = Math.cos((meanAbsLatitude * Math.PI) / 180);
  const safeCosLatitude = clamp(Math.abs(cosLatitude), COASTLINE_SIMPLIFY_MIN_COS_LAT, 1);
  const scale = clamp(1 / safeCosLatitude, 1, COASTLINE_SIMPLIFY_LATITUDE_SCALE_MAX);
  return epsilon * scale;
}

export function getTriangleArea(points, aIndex, bIndex, cIndex) {
  const a = points[aIndex];
  const b = points[bIndex];
  const c = points[cIndex];
  if (!a || !b || !c) return Infinity;
  return Math.abs(
    (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1])) * 0.5
  );
}

export function pushMinHeap(heap, entry) {
  heap.push(entry);
  let index = heap.length - 1;
  while (index > 0) {
    const parentIndex = Math.floor((index - 1) / 2);
    if (heap[parentIndex][0] <= heap[index][0]) break;
    [heap[parentIndex], heap[index]] = [heap[index], heap[parentIndex]];
    index = parentIndex;
  }
}

export function popMinHeap(heap) {
  if (!heap.length) return null;
  const first = heap[0];
  const last = heap.pop();
  if (heap.length && last) {
    heap[0] = last;
    let index = 0;
    while (true) {
      const leftIndex = index * 2 + 1;
      const rightIndex = leftIndex + 1;
      let smallestIndex = index;
      if (leftIndex < heap.length && heap[leftIndex][0] < heap[smallestIndex][0]) {
        smallestIndex = leftIndex;
      }
      if (rightIndex < heap.length && heap[rightIndex][0] < heap[smallestIndex][0]) {
        smallestIndex = rightIndex;
      }
      if (smallestIndex === index) break;
      [heap[index], heap[smallestIndex]] = [heap[smallestIndex], heap[index]];
      index = smallestIndex;
    }
  }
  return first;
}

export function simplifyPolylineEffectiveArea(points, areaThreshold) {
  if (!Array.isArray(points) || points.length <= 2) {
    return Array.isArray(points) ? points.slice() : [];
  }
  const threshold = Math.max(0, Number(areaThreshold) || 0);
  if (!(threshold > 0)) return points.slice();

  const length = points.length;
  const previous = new Array(length);
  const next = new Array(length);
  const removed = new Array(length).fill(false);
  const areas = new Array(length).fill(Infinity);
  const heap = [];

  for (let index = 0; index < length; index += 1) {
    previous[index] = index - 1;
    next[index] = index + 1 < length ? index + 1 : -1;
  }

  const updateArea = (index) => {
    if (index <= 0 || index >= length - 1 || removed[index]) return;
    const prevIndex = previous[index];
    const nextIndex = next[index];
    if (prevIndex < 0 || nextIndex < 0 || removed[prevIndex] || removed[nextIndex]) {
      areas[index] = Infinity;
      return;
    }
    const area = getTriangleArea(points, prevIndex, index, nextIndex);
    areas[index] = area;
    pushMinHeap(heap, [area, index]);
  };

  for (let index = 1; index < length - 1; index += 1) {
    updateArea(index);
  }

  while (heap.length) {
    const entry = popMinHeap(heap);
    if (!entry) break;
    const [area, index] = entry;
    if (removed[index] || area !== areas[index]) continue;
    if (area > threshold) break;
    const prevIndex = previous[index];
    const nextIndex = next[index];
    if (prevIndex < 0 || nextIndex < 0) continue;
    removed[index] = true;
    next[prevIndex] = nextIndex;
    previous[nextIndex] = prevIndex;
    updateArea(prevIndex);
    updateArea(nextIndex);
  }

  const simplified = [];
  for (let index = 0; index < length; index += 1) {
    if (!removed[index]) simplified.push(points[index]);
  }
  return simplified.length >= 2 ? simplified : points.slice(0, 2);
}
