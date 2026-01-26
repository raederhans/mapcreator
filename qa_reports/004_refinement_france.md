# Phase 3: France Surgical Refinement Plan

**Document Version:** 1.0
**Phase:** Surgical Refinement - Historical Border Accuracy
**Objective:** Enable sub-département (Arrondissement) granularity for accurate 1871 and 1860 border reconstruction

---

## Executive Summary

Current NUTS-3 (Département) granularity cannot accurately represent two critical historical borders:

1. **1871 Treaty of Frankfurt**: Germany annexed Alsace-Lorraine, but the border did NOT follow modern département boundaries. The Territoire de Belfort (now dept. 90) remained French, carved from Haut-Rhin.

2. **1860 Treaty of Turin**: France acquired Savoy and Nice from Sardinia-Piedmont. While these largely follow modern département lines, arrondissement-level control allows precise county/district simulation.

**Solution**: Implement a "drill-down" layer system that surgically replaces target départements with their constituent arrondissements.

---

## Section 1: Data Source

### 1.1 Primary Dataset

**Source**: [gregoiredavid/france-geojson](https://github.com/gregoiredavid/france-geojson) (GitHub)

**Direct Download URL**:
```
https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/arrondissements.geojson
```

**Properties per Feature**:
| Property | Description | Example |
|----------|-------------|---------|
| `code` | Arrondissement INSEE code (5 digits) | `"57001"` |
| `nom` | French name | `"Boulay-Moselle"` |

**Coordinate System**: WGS84 (EPSG:4326) - Compatible with existing pipeline

**License**: IGN Admin Express Open License (Licence Ouverte)

**File Size**: ~2.5 MB (simplified version)

### 1.2 Code Structure

The arrondissement `code` encodes the parent département:
```
Code Format: DDAAA
  DD  = Département number (01-95, 2A, 2B, 97x)
  AAA = Arrondissement index within département (001-00n)

Examples:
  57001 → Moselle (57), Arrondissement de Boulay-Moselle
  67001 → Bas-Rhin (67), Arrondissement de Haguenau-Wissembourg
  06001 → Alpes-Maritimes (06), Arrondissement de Grasse
```

### 1.3 Alternative Sources (Backup)

| Source | URL | Notes |
|--------|-----|-------|
| France GeoJSON Portal | https://france-geojson.gregoiredavid.fr/ | Web interface, individual downloads |
| data.gouv.fr | https://www.data.gouv.fr/fr/datasets/contours-des-arrondissements-francais-issus-dosm/ | Official govt, requires processing |
| OpenStreetMap | Overpass API | Most detailed, requires extraction |

---

## Section 2: Surgical Target List

### 2.1 Treaty of Frankfurt (1871) - Alsace-Lorraine

The German Empire annexed most of Alsace and the Moselle portion of Lorraine. The border was NOT a clean département boundary.

**Target Départements (NUTS-3 IDs)**:

| Dept. | Name | NUTS-3 ID | Reason |
|-------|------|-----------|--------|
| 57 | Moselle | FRF31 | Entirely annexed to Germany |
| 67 | Bas-Rhin | FRF11 | Entirely annexed to Germany |
| 68 | Haut-Rhin | FRF12 | Mostly annexed; **Belfort remained French** |
| 54 | Meurthe-et-Moselle | FRF33 | Partially annexed (Château-Salins area) |
| 88 | Vosges | FRF34 | Small western strip annexed |

**Critical Historical Note**:
- The Territoire de Belfort (modern dept. 90) was carved from Haut-Rhin and remained French
- Modern Meurthe-et-Moselle (54) is a post-1871 amalgamation; parts went to Germany
- Arrondissement-level granularity allows precise reconstruction of the Reichsland Elsaß-Lothringen

**Arrondissements to Identify (1871 German Side)**:
```
# Moselle (57) - ALL annexed
57001, 57002, 57003, 57004, 57005, 57006, 57007, 57008, 57009

# Bas-Rhin (67) - ALL annexed
67001, 67002, 67003, 67004, 67005

# Haut-Rhin (68) - ALL EXCEPT Belfort region (now dept 90)
68001, 68002, 68003, 68004, 68005, 68006

# Meurthe-et-Moselle (54) - PARTIAL
# Only Château-Salins and Sarrebourg areas (requires research)

# Vosges (88) - Small strip only
# Schirmeck/Saales area (requires research)
```

### 2.2 Treaty of Turin (1860) - Savoy & Nice

France acquired the Duchy of Savoy and County of Nice from the Kingdom of Sardinia.

**Target Départements (NUTS-3 IDs)**:

| Dept. | Name | NUTS-3 ID | Reason |
|-------|------|-----------|--------|
| 73 | Savoie | FRK27 | Former Duchy of Savoy (southern) |
| 74 | Haute-Savoie | FRK28 | Former Duchy of Savoy (northern) |
| 06 | Alpes-Maritimes | FRL06 | Former County of Nice + annexed Provençal areas |

**Historical Note**:
- The 1860 border largely follows modern département boundaries
- Arrondissement granularity allows showing the Chablais/Faucigny plebiscite zones
- Nice area shows distinct Italian cultural zone vs. interior Provençal areas

### 2.3 Complete Surgical Target List

```python
SURGICAL_TARGETS = {
    # Treaty of Frankfurt (1871)
    "FRF31",  # Moselle (57)
    "FRF11",  # Bas-Rhin (67)
    "FRF12",  # Haut-Rhin (68)
    "FRF33",  # Meurthe-et-Moselle (54)
    "FRF34",  # Vosges (88)

    # Treaty of Turin (1860)
    "FRK27",  # Savoie (73)
    "FRK28",  # Haute-Savoie (74)
    "FRL06",  # Alpes-Maritimes (06)
}

# Mapping: département number → NUTS-3 ID
DEPT_TO_NUTS = {
    "57": "FRF31",
    "67": "FRF11",
    "68": "FRF12",
    "54": "FRF33",
    "88": "FRF34",
    "73": "FRK27",
    "74": "FRK28",
    "06": "FRL06",
}
```

---

## Section 3: Implementation Plan

### 3.1 Python Pipeline Modifications (`init_map_data.py`)

#### 3.1.1 New Constant Definitions

Add after existing URL constants:

```python
# France Arrondissements (drill-down layer for historical accuracy)
FRANCE_ARROND_URL = (
    "https://raw.githubusercontent.com/gregoiredavid/france-geojson/"
    "master/arrondissements.geojson"
)

# NUTS-3 IDs requiring arrondissement replacement
SURGICAL_NUTS3_IDS = {
    "FRF31", "FRF11", "FRF12", "FRF33", "FRF34",  # Alsace-Lorraine
    "FRK27", "FRK28", "FRL06",                     # Savoy-Nice
}

# Department code → NUTS-3 ID mapping (for ID generation)
DEPT_TO_NUTS3 = {
    "57": "FRF31", "67": "FRF11", "68": "FRF12",
    "54": "FRF33", "88": "FRF34", "73": "FRK27",
    "74": "FRK28", "06": "FRL06",
}
```

#### 3.1.2 New Function: `fetch_france_arrondissements()`

```python
def fetch_france_arrondissements() -> gpd.GeoDataFrame:
    """
    Download France arrondissements from gregoiredavid/france-geojson.
    Filter to only surgical target départements.
    """
    print("Downloading France arrondissements...")
    try:
        response = requests.get(FRANCE_ARROND_URL, timeout=(10, 60))
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as exc:
        print(f"France arrondissements download failed: {exc}")
        return gpd.GeoDataFrame(columns=["id", "name", "cntr_code", "geometry"], crs="EPSG:4326")

    gdf = gpd.GeoDataFrame.from_features(data.get("features", []))
    if gdf.empty:
        print("France arrondissements GeoDataFrame is empty.")
        return gpd.GeoDataFrame(columns=["id", "name", "cntr_code", "geometry"], crs="EPSG:4326")

    gdf = gdf.set_crs("EPSG:4326", allow_override=True)

    # Extract département code from arrondissement code (first 2-3 chars)
    def get_dept_code(code: str) -> str:
        code = str(code)
        if code.startswith(("2A", "2B")):
            return code[:2]
        # Handle overseas (97x) and standard (01-95)
        if code.startswith("97"):
            return code[:3]
        return code[:2].lstrip("0") if len(code) >= 2 else code

    gdf["dept_code"] = gdf["code"].apply(get_dept_code)

    # Filter to surgical targets only
    target_depts = set(DEPT_TO_NUTS3.keys())
    gdf = gdf[gdf["dept_code"].isin(target_depts)].copy()

    if gdf.empty:
        print("No arrondissements matched surgical targets.")
        return gpd.GeoDataFrame(columns=["id", "name", "cntr_code", "geometry"], crs="EPSG:4326")

    # Build standardized ID: FR_ARR_{code}
    gdf["id"] = "FR_ARR_" + gdf["code"].astype(str)
    gdf["name"] = gdf["nom"]
    gdf["cntr_code"] = "FR"
    # Store parent NUTS-3 for replacement logic
    gdf["parent_nuts3"] = gdf["dept_code"].map(DEPT_TO_NUTS3)

    # Simplify geometry to match NUTS-3 level of detail
    gdf["geometry"] = gdf.geometry.simplify(tolerance=SIMPLIFY_NUTS3, preserve_topology=True)

    print(f"Loaded {len(gdf)} arrondissements for {len(target_depts)} target départements.")
    return gdf[["id", "name", "cntr_code", "parent_nuts3", "geometry"]].copy()
```

#### 3.1.3 New Function: `surgical_replace()`

```python
def surgical_replace(
    main_gdf: gpd.GeoDataFrame,
    drill_gdf: gpd.GeoDataFrame,
    target_parent_ids: set[str],
) -> gpd.GeoDataFrame:
    """
    Replace target regions in main_gdf with drill-down features from drill_gdf.

    Args:
        main_gdf: Primary political layer (NUTS-3 hybrid)
        drill_gdf: Drill-down layer (arrondissements) with 'parent_nuts3' column
        target_parent_ids: Set of NUTS-3 IDs to replace (e.g., {"FRF31", "FRF11"})

    Returns:
        New GeoDataFrame with targets replaced by drill-down features
    """
    if drill_gdf.empty or "parent_nuts3" not in drill_gdf.columns:
        print("Surgical replace: drill_gdf empty or missing parent_nuts3; returning main unchanged.")
        return main_gdf

    # Identify features to remove from main_gdf
    remove_mask = main_gdf["id"].isin(target_parent_ids)
    removed_count = remove_mask.sum()

    if removed_count == 0:
        print(f"Surgical replace: No matching features found for {target_parent_ids}")
        return main_gdf

    # Keep non-target features
    retained = main_gdf[~remove_mask].copy()

    # Filter drill_gdf to only replacement targets
    replacements = drill_gdf[drill_gdf["parent_nuts3"].isin(target_parent_ids)].copy()

    # Drop parent_nuts3 column (not needed in final output)
    if "parent_nuts3" in replacements.columns:
        replacements = replacements.drop(columns=["parent_nuts3"])

    # Combine
    result = gpd.GeoDataFrame(
        pd.concat([retained, replacements], ignore_index=True),
        crs=main_gdf.crs,
    )

    print(f"Surgical replace: Removed {removed_count} NUTS-3 features, added {len(replacements)} arrondissements.")
    return result
```

#### 3.1.4 Update `main()` Function

Add after `final_hybrid` is built, before `save_outputs()`:

```python
    # === SURGICAL REFINEMENT: France Arrondissements ===
    france_arrond = fetch_france_arrondissements()
    if not france_arrond.empty:
        final_hybrid = surgical_replace(
            main_gdf=final_hybrid,
            drill_gdf=france_arrond,
            target_parent_ids=SURGICAL_NUTS3_IDS,
        )
```

### 3.2 Frontend Modifications (`js/app.js`)

#### 3.2.1 Increase Zoom Capability

Current zoom likely uses `scaleExtent([1, 8])`. Update to support higher zoom for arrondissement detail:

```javascript
// Find existing zoom behavior definition (likely near d3.zoom())
const zoom = d3.zoom()
    .scaleExtent([1, 50])  // Increased from [1, 8] to [1, 50]
    .on("zoom", handleZoom);
```

#### 3.2.2 Add Zoom Level Indicator (Optional Enhancement)

```javascript
// In renderFull() or separate function:
function updateZoomIndicator() {
    const k = zoomTransform.k;
    const level = k >= 20 ? "District" : k >= 8 ? "Detailed" : k >= 3 ? "Regional" : "Overview";
    // Update UI element if exists
    const indicator = document.getElementById("zoom-level");
    if (indicator) {
        indicator.textContent = `${level} (${k.toFixed(1)}x)`;
    }
}
```

#### 3.2.3 ID Pattern Recognition (Hit Detection)

The new arrondissement IDs follow pattern `FR_ARR_XXXXX`. Update any ID-based logic:

```javascript
function getCountryFromId(id) {
    if (!id) return null;
    // Handle arrondissement IDs
    if (id.startsWith("FR_ARR_")) {
        return "FR";
    }
    // Existing NUTS-3 logic
    if (id.length >= 2 && /^[A-Z]{2}/.test(id)) {
        return id.substring(0, 2);
    }
    // Admin-1 fallback (e.g., "RU_Moscow Oblast")
    if (id.includes("_")) {
        const prefix = id.split("_")[0];
        if (prefix.length === 2) return prefix;
    }
    return null;
}
```

### 3.3 Index.html Modifications

No changes required for basic functionality. Optional: Add zoom indicator element:

```html
<div id="zoom-level" class="zoom-indicator"></div>
```

With CSS:
```css
.zoom-indicator {
    position: absolute;
    bottom: 10px;
    left: 10px;
    background: rgba(0,0,0,0.7);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-family: monospace;
}
```

---

## Section 4: Data Validation Strategy

### 4.1 Python Validation

Add to `main()` after surgical replacement:

```python
    # Validate surgical replacement
    france_ids = [f for f in final_hybrid["id"] if str(f).startswith("FR_ARR_")]
    france_nuts = [f for f in final_hybrid["id"] if str(f).startswith("FR") and not str(f).startswith("FR_ARR_")]
    print(f"France features: {len(france_nuts)} NUTS-3, {len(france_ids)} Arrondissements")

    # Check for overlap (should be zero if surgical replace worked)
    overlap = set(france_ids) & SURGICAL_NUTS3_IDS
    if overlap:
        print(f"WARNING: Surgical targets still present: {overlap}")
```

### 4.2 Browser Console Validation

```javascript
// After loadData()
function validateSurgicalRefinement() {
    const arrondFeatures = landData.features.filter(f =>
        f.properties?.id?.startsWith("FR_ARR_")
    );
    const frNutsFeatures = landData.features.filter(f => {
        const id = f.properties?.id;
        return id?.startsWith("FR") && !id?.startsWith("FR_ARR_");
    });

    console.log(`France: ${frNutsFeatures.length} NUTS-3, ${arrondFeatures.length} Arrondissements`);

    // Expected: ~85 NUTS-3 (France total) - 8 (replaced) + ~35 arrondissements
    // Rough total: ~112 France features
}
```

---

## Section 5: Historical Border Presets (Future Phase)

### 5.1 Proposed Presets

Once arrondissement granularity is available, add historical border presets:

```javascript
const HISTORICAL_PRESETS = {
    "1871_alsace_lorraine": {
        name: "German Empire (1871-1918)",
        description: "Alsace-Lorraine as annexed by Treaty of Frankfurt",
        regions: {
            // All Moselle arrondissements
            "FR_ARR_57001": "#000000", // German colors
            "FR_ARR_57002": "#000000",
            // ... etc
        }
    },
    "1860_savoy_nice": {
        name: "Kingdom of Sardinia (pre-1860)",
        description: "Savoy and Nice before French annexation",
        regions: {
            "FR_ARR_73001": "#0055A4", // Sardinian blue
            // ... etc
        }
    }
};
```

### 5.2 Implementation Notes

- Presets require mapping historical territories to modern arrondissement codes
- Some historical boundaries don't align perfectly with arrondissements
- Consider adding a "fuzzy boundary" visual effect for approximate borders

---

## Section 6: Risk Assessment

### 6.1 Data Quality Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| gregoiredavid repo becomes unavailable | High | Cache locally in `data/` or use backup source |
| Arrondissement codes change | Medium | Pin to specific commit hash |
| Geometry precision mismatch | Low | Simplify to match NUTS-3 tolerance |

### 6.2 Performance Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Increased feature count | Medium | Only replace 8 NUTS-3 with ~35 arrondissements |
| Larger TopoJSON file | Low | Arrondissements are smaller, fewer vertices |
| Hit detection slowdown | Low | Index structure handles extra features |

### 6.3 Historical Accuracy Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Arrondissement boundaries changed since 1871 | High | Cross-reference historical maps |
| Modern Territoire de Belfort (90) not in source | Medium | Manual geometry or note in documentation |

---

## Section 7: Testing Checklist

### 7.1 Python Pipeline

- [ ] `init_map_data.py` runs without errors
- [ ] Arrondissement download succeeds
- [ ] Exactly 8 NUTS-3 features replaced
- [ ] ~35 arrondissement features added
- [ ] TopoJSON file size remains < 3 MB
- [ ] No duplicate IDs in output
- [ ] All features have valid `cntr_code`

### 7.2 Frontend Rendering

- [ ] Map loads successfully
- [ ] Arrondissements visible at zoom level 10+
- [ ] Click on arrondissement applies color
- [ ] Hover shows correct name/ID
- [ ] Country fill ("Auto-Fill") includes arrondissements
- [ ] Zoom to level 50 works smoothly
- [ ] No gaps between arrondissements and neighboring features

### 7.3 Historical Validation

- [ ] Can color Alsace-Lorraine (1871 border) distinctly
- [ ] Belfort area remains separately colorable (French)
- [ ] Savoy/Nice can be colored as Sardinian territory
- [ ] Border follows known historical maps

---

## Appendix A: Arrondissement Reference

### A.1 Moselle (57) - 9 Arrondissements

| Code | Name | 1871 Status |
|------|------|-------------|
| 57001 | Boulay-Moselle | German |
| 57002 | Château-Salins | German |
| 57003 | Forbach-Bouzonville | German |
| 57004 | Metz | German |
| 57005 | Sarrebourg | German |
| 57006 | Sarreguemines | German |
| 57007 | Thionville-Est | German |
| 57008 | Thionville-Ouest | German |
| 57009 | [Additional] | German |

### A.2 Bas-Rhin (67) - 5 Arrondissements

| Code | Name | 1871 Status |
|------|------|-------------|
| 67001 | Haguenau-Wissembourg | German |
| 67002 | Molsheim | German |
| 67003 | Saverne | German |
| 67004 | Sélestat-Erstein | German |
| 67005 | Strasbourg | German |

### A.3 Haut-Rhin (68) - 6 Arrondissements

| Code | Name | 1871 Status |
|------|------|-------------|
| 68001 | Altkirch | German |
| 68002 | Colmar-Ribeauvillé | German |
| 68003 | Guebwiller | German |
| 68004 | Mulhouse | German |
| 68005 | Thann-Cernay | German |
| 68006 | [Additional] | German |

*Note: Belfort area (now dept. 90) was carved out and remained French*

---

## Appendix B: Quick Reference Commands

### Download and Inspect Data

```bash
# Download arrondissements
curl -o data/france_arrondissements.geojson \
  "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/arrondissements.geojson"

# Count features
python -c "import json; d=json.load(open('data/france_arrondissements.geojson')); print(len(d['features']))"

# Filter to target départements
python -c "
import json
d = json.load(open('data/france_arrondissements.geojson'))
targets = {'57','67','68','54','88','73','74','06'}
filtered = [f for f in d['features'] if f['properties']['code'][:2] in targets or f['properties']['code'][:2].lstrip('0') in targets]
print(f'Target arrondissements: {len(filtered)}')
for f in filtered:
    print(f\"  {f['properties']['code']}: {f['properties']['nom']}\")
"
```

### Verify TopoJSON Output

```bash
# Check object counts
python -c "
import json
t = json.load(open('data/europe_topology.json'))
pol = t['objects']['political']['geometries']
arr = [g for g in pol if g['properties'].get('id','').startswith('FR_ARR_')]
print(f'Total political: {len(pol)}, Arrondissements: {len(arr)}')
"
```

---

*End of France Surgical Refinement Plan*
