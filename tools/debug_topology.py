import json
from collections import Counter
from pathlib import Path


def load_topology(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def bbox_area(bounds):
    (minx, miny, maxx, maxy) = bounds
    return max(0.0, maxx - minx) * max(0.0, maxy - miny)


def _arc_bbox(arc, transform):
    sx, sy = (1.0, 1.0)
    tx, ty = (0.0, 0.0)
    if transform:
        sx, sy = transform.get("scale", [1.0, 1.0])
        tx, ty = transform.get("translate", [0.0, 0.0])
    x = 0.0
    y = 0.0
    minx = float("inf")
    miny = float("inf")
    maxx = float("-inf")
    maxy = float("-inf")
    for point in arc:
        if len(point) < 2:
            continue
        dx, dy = point[0], point[1]
        x += dx
        y += dy
        fx = x * sx + tx
        fy = y * sy + ty
        if fx < minx:
            minx = fx
        if fy < miny:
            miny = fy
        if fx > maxx:
            maxx = fx
        if fy > maxy:
            maxy = fy
    if minx == float("inf"):
        return None
    return (minx, miny, maxx, maxy)


def _iter_arc_indices(arcs):
    if isinstance(arcs, int):
        yield arcs
    elif isinstance(arcs, list):
        for item in arcs:
            yield from _iter_arc_indices(item)


def _geometry_bbox(geom, arc_bboxes):
    arcs = geom.get("arcs")
    if arcs is None:
        return None
    minx = float("inf")
    miny = float("inf")
    maxx = float("-inf")
    maxy = float("-inf")
    for arc_idx in _iter_arc_indices(arcs):
        if not isinstance(arc_idx, int):
            continue
        if arc_idx < 0:
            arc_idx = ~arc_idx
        if arc_idx < 0 or arc_idx >= len(arc_bboxes):
            continue
        bbox = arc_bboxes[arc_idx]
        if not bbox:
            continue
        bx0, by0, bx1, by1 = bbox
        if bx0 < minx:
            minx = bx0
        if by0 < miny:
            miny = by0
        if bx1 > maxx:
            maxx = bx1
        if by1 > maxy:
            maxy = by1
    if minx == float("inf"):
        return None
    return (minx, miny, maxx, maxy)


def _decode_arc(arc, transform):
    sx, sy = (1.0, 1.0)
    tx, ty = (0.0, 0.0)
    if transform:
        sx, sy = transform.get("scale", [1.0, 1.0])
        tx, ty = transform.get("translate", [0.0, 0.0])
    x = 0.0
    y = 0.0
    coords = []
    for point in arc:
        if len(point) < 2:
            continue
        dx, dy = point[0], point[1]
        x += dx
        y += dy
        coords.append((x * sx + tx, y * sy + ty))
    return coords


def _ring_area(coords):
    if not coords or len(coords) < 3:
        return 0.0
    area = 0.0
    x0, y0 = coords[-1]
    for x1, y1 in coords:
        area += (x0 * y1) - (x1 * y0)
        x0, y0 = x1, y1
    return area / 2.0


def _build_ring(arc_indices, arc_coords_cache):
    ring = []
    for arc_idx in arc_indices:
        if arc_idx < 0:
            arc_idx = ~arc_idx
            coords = list(reversed(arc_coords_cache[arc_idx]))
        else:
            coords = arc_coords_cache[arc_idx]
        if not coords:
            continue
        if ring:
            ring.extend(coords[1:])
        else:
            ring.extend(coords)
    return ring


def _geometry_area(geom, arc_coords_cache):
    arcs = geom.get("arcs")
    if arcs is None:
        return 0.0

    geom_type = geom.get("type")
    total_area = 0.0

    if geom_type == "Polygon":
        rings = []
        for ring_arcs in arcs:
            if not isinstance(ring_arcs, list):
                continue
            ring = _build_ring(ring_arcs, arc_coords_cache)
            if ring:
                rings.append(ring)
        if rings:
            outer = abs(_ring_area(rings[0]))
            holes = sum(abs(_ring_area(r)) for r in rings[1:])
            total_area += max(outer - holes, 0.0)
        return total_area

    if geom_type == "MultiPolygon":
        for poly in arcs:
            if not isinstance(poly, list):
                continue
            rings = []
            for ring_arcs in poly:
                if not isinstance(ring_arcs, list):
                    continue
                ring = _build_ring(ring_arcs, arc_coords_cache)
                if ring:
                    rings.append(ring)
            if rings:
                outer = abs(_ring_area(rings[0]))
                holes = sum(abs(_ring_area(r)) for r in rings[1:])
                total_area += max(outer - holes, 0.0)
        return total_area

    return 0.0


def main():
    base = Path(__file__).resolve().parents[1]
    topo_path = base / "data" / "europe_topology.json"
    if not topo_path.exists():
        raise SystemExit(f"Missing topology: {topo_path}")

    topo = load_topology(topo_path)
    objects = topo.get("objects", {})
    political = objects.get("political")
    if not political or political.get("type") != "GeometryCollection":
        raise SystemExit("Missing or invalid political object in topology")

    geoms = political.get("geometries", [])
    if not geoms:
        raise SystemExit("No political geometries found")

    # Precompute arc bboxes and decoded coordinates for TopoJSON
    arcs = topo.get("arcs", [])
    transform = topo.get("transform")
    arc_bboxes = [_arc_bbox(arc, transform) for arc in arcs]
    arc_coords_cache = [_decode_arc(arc, transform) for arc in arcs]

    all_bounds = []
    for geom in geoms:
        bbox = _geometry_bbox(geom, arc_bboxes)
        if bbox:
            all_bounds.append(bbox)
    if not all_bounds:
        raise SystemExit("Unable to compute geometry bboxes from topology arcs")

    minx = min(b[0] for b in all_bounds)
    miny = min(b[1] for b in all_bounds)
    maxx = max(b[2] for b in all_bounds)
    maxy = max(b[3] for b in all_bounds)
    full_area = bbox_area((minx, miny, maxx, maxy))

    print("Topology extent bounds:", (minx, miny, maxx, maxy))
    print("Topology extent bbox area:", full_area)

    # Check 1 - massive artifacts
    suspicious = []
    widths = []
    area_by_country = Counter()
    ru_crosses_dateline = False
    for geom in geoms:
        bbox = _geometry_bbox(geom, arc_bboxes)
        if not bbox:
            continue
        area = bbox_area(bbox)
        width = max(0.0, bbox[2] - bbox[0])
        props = geom.get("properties", {})
        geom_id = props.get("id")
        cntr_code = props.get("cntr_code")
        widths.append(
            {
                "id": geom_id,
                "cntr_code": cntr_code,
                "width": width,
                "bbox": bbox,
            }
        )
        geom_area = _geometry_area(geom, arc_coords_cache)
        if cntr_code:
            area_by_country[cntr_code] += geom_area

        if cntr_code == "RU" and bbox[0] < -170 and bbox[2] > 170:
            ru_crosses_dateline = True
        if full_area > 0 and area / full_area > 0.5:
            suspicious.append(
                {
                    "id": geom_id,
                    "cntr_code": cntr_code,
                    "area_ratio": area / full_area,
                    "bbox": bbox,
                }
            )

    if suspicious:
        print("\nSuspicious Giant Artifacts (>50% extent):")
        for entry in sorted(suspicious, key=lambda x: x["area_ratio"], reverse=True):
            print(
                f"  id={entry['id']} cntr_code={entry['cntr_code']} ratio={entry['area_ratio']:.3f} bbox={entry['bbox']}"
            )
    else:
        print("\nSuspicious Giant Artifacts: none")

    # Check 1b - top width features
    widths_sorted = sorted(widths, key=lambda x: x["width"], reverse=True)[:10]
    print("\nTop 10 Features by Bounding Box Width:")
    for entry in widths_sorted:
        print(
            f"  id={entry['id']} cntr_code={entry['cntr_code']} width={entry['width']:.3f} bbox={entry['bbox']}"
        )

    # Check 2 - missing metadata
    missing_cntr = [
        (geom.get("properties", {}) or {}).get("id")
        for geom in geoms
        if not (geom.get("properties", {}) or {}).get("cntr_code")
    ]
    print(f"\nMissing cntr_code count: {len(missing_cntr)}")
    if missing_cntr:
        print("Sample missing cntr_code IDs:", missing_cntr[:20])

    # Check 2b - top countries by area
    print("\nTop 5 Countries by Total Area (projected):")
    for code, total in area_by_country.most_common(5):
        print(f"  {code}: {total:.3f}")

    # Check 3 - Russia dateline crossing
    if ru_crosses_dateline:
        print("\nWARNING: Russia crosses dateline!")
    else:
        print("\nRussia dateline crossing: not detected")

    # Check 3 - duplicate IDs
    ids = [
        (geom.get("properties", {}) or {}).get("id")
        for geom in geoms
        if (geom.get("properties", {}) or {}).get("id")
    ]
    counts = Counter(ids)
    dups = [k for k, v in counts.items() if v > 1]
    print(f"\nDuplicate id count: {len(dups)}")
    if dups:
        sample = dups[:20]
        print("Sample duplicate IDs:", sample)


if __name__ == "__main__":
    main()
