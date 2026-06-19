export function collectRasterPolygonalGeometryParts(geometry) {
  if (!geometry || typeof geometry !== "object") return [];
  const geometryType = String(geometry.type || "");
  if (geometryType === "Polygon") {
    return [geometry];
  }
  if (geometryType === "MultiPolygon") {
    return (Array.isArray(geometry.coordinates) ? geometry.coordinates : [])
      .filter((partCoordinates) => Array.isArray(partCoordinates) && partCoordinates.length > 0)
      .map((partCoordinates) => ({
        type: "Polygon",
        coordinates: partCoordinates,
      }));
  }
  if (geometryType === "GeometryCollection") {
    return (Array.isArray(geometry.geometries) ? geometry.geometries : [])
      .flatMap((partGeometry) => collectRasterPolygonalGeometryParts(partGeometry));
  }
  return [];
}

export function buildWorkerPixelRingsForGeometry(geometry, projectPoint) {
  if (typeof projectPoint !== "function") return [];
  const rings = [];
  collectRasterPolygonalGeometryParts(geometry).forEach((polygonPart) => {
    (Array.isArray(polygonPart.coordinates) ? polygonPart.coordinates : []).forEach((ring) => {
      const projectedRing = (Array.isArray(ring) ? ring : [])
        .map((point) => projectPoint(point))
        .filter(Boolean);
      if (projectedRing.length >= 3) rings.push(projectedRing);
    });
  });
  return rings;
}
