# Belarus Fragment Study Context

## Findings

- `map_builder/processors/belarus.py` already replaces coarse Belarus with a hybrid ADM2-derived layer.
- Current build policy keeps border rayons as individual `adm2_hybrid_border` features, merges western historical groups, and dissolves remaining oblast interiors into `BY_INT_*` features.
- `data/europe_topology.json` has 1 Belarus feature. `data/europe_topology.na_v2.json` and `data/europe_topology.runtime_political_v1.json` both have 35 Belarus features.
- The visible small pieces are mostly multipart components inside large interior features, especially `BY_INT_VITEBSK`, `BY_INT_MOGILEV`, and `BY_INT_MINSK`.
- Runtime sample: `BY_INT_VITEBSK` has 30 parts below 50 km2, `BY_INT_MOGILEV` has 13, `BY_INT_MINSK` has 13. Many touch Belarus border rayons or historical groups; a few also touch Russian runtime features.
- Frontend fill/history already supports multi-id operations through paths like `setFeatureOwnerCodes(featureIds, ownerCode)` and `applyVisualSubdivisionFill(targetIds, ...)`.
- The existing parent-group batch path uses `admin1_group`, which is a natural hook for treating fragmented Belarus interiors as one interaction group while preserving real feature ids.

## External GIS Guidance

- GIS tools commonly eliminate small/sliver polygons by selecting small polygons and merging them into a neighboring polygon by longest shared border or largest area.
- Multipart polygon part elimination is also a recognized operation, usually using area or percent thresholds.
- GeoPandas `dissolve()` is the standard feature aggregation pattern when grouped geometries are intentionally merged.

## Current Judgment

The safest first path is interaction-level grouping for Belarus fragment families. Data-level geometry editing needs a separate generated report because it can silently move borders and country ownership if thresholds are too broad.
