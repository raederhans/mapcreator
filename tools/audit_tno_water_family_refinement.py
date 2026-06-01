from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCENARIO_WATER_PATH = ROOT / 'data' / 'scenarios' / 'tno_1962' / 'water_regions.geojson'
OUTPUT_PATH = ROOT / '.runtime' / 'reports' / 'generated' / 'ocean_family_refine_audit.json'
LOW_VERTEX_COUNT_THRESHOLD = 100
GLOBAL_CLONE_SOURCE_STANDARD = 'tno_cloned_from_global_water_regions'


def _count_coordinate_positions(value) -> int:
    if not isinstance(value, list):
        return 0
    if len(value) >= 2 and all(isinstance(item, (int, float)) for item in value[:2]):
        return 1
    return sum(_count_coordinate_positions(item) for item in value)


def _geometry_vertex_count(feature: dict) -> int:
    geometry = feature.get('geometry') or {}
    return _count_coordinate_positions(geometry.get('coordinates'))


def _feature_record(feature: dict) -> dict:
    props = feature.get('properties', {}) or {}
    geometry = feature.get('geometry') or {}
    return {
        'id': str(props.get('id') or '').strip(),
        'name': str(props.get('name') or '').strip(),
        'water_type': str(props.get('water_type') or '').strip(),
        'source_standard': str(props.get('source_standard') or '').strip(),
        'geometry_type': str(geometry.get('type') or '').strip(),
        'vertex_count': _geometry_vertex_count(feature),
    }


def _candidate_reasons(row: dict) -> list[str]:
    reasons = ['no marine_detail children yet']
    if row['source_standard'] == GLOBAL_CLONE_SOURCE_STANDARD:
        reasons.append('uses global water clone source')
    if int(row.get('vertex_count') or 0) < LOW_VERTEX_COUNT_THRESHOLD:
        reasons.append(f'vertex_count below {LOW_VERTEX_COUNT_THRESHOLD}')
    return reasons


def _candidate_priority(row: dict) -> str:
    reasons = _candidate_reasons(row)
    return 'high' if len(reasons) > 1 else 'medium'


def build_report(payload: dict, *, generated_at: str | None = None) -> dict:
    features = payload.get('features', []) or []
    children_by_parent: dict[str, list[dict]] = {}
    macros: list[dict] = []

    for feature in features:
        props = feature.get('properties', {}) or {}
        parent_id = str(props.get('parent_id') or '').strip()
        if parent_id:
            children_by_parent.setdefault(parent_id, []).append(_feature_record(feature))
        if str(props.get('region_group') or '').strip() == 'marine_macro':
            macros.append(feature)

    family_rows = []
    unrefined = []
    for feature in sorted(macros, key=lambda item: str((item.get('properties') or {}).get('name') or '')):
        row = _feature_record(feature)
        feature_id = row['id']
        children = sorted(children_by_parent.get(feature_id, []), key=lambda item: item['name'])
        row['child_count'] = len(children)
        row['children'] = children
        row['refinement_status'] = 'detailed' if children else 'macro_only'
        family_rows.append(row)
        if not children:
            reasons = _candidate_reasons(row)
            unrefined.append({
                'id': feature_id,
                'name': row['name'],
                'source_standard': row['source_standard'],
                'geometry_type': row['geometry_type'],
                'vertex_count': row['vertex_count'],
                'reasons': reasons,
                'suggested_priority': _candidate_priority(row),
            })

    low_precision_candidates = [
        row for row in unrefined
        if row['source_standard'] == GLOBAL_CLONE_SOURCE_STANDARD
        or int(row.get('vertex_count') or 0) < LOW_VERTEX_COUNT_THRESHOLD
    ]

    report = {
        'generated_at': generated_at or datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z'),
        'scenario_id': 'tno_1962',
        'contract': {
            'schema_version': 2,
            'low_vertex_count_threshold': LOW_VERTEX_COUNT_THRESHOLD,
            'global_clone_source_standard': GLOBAL_CLONE_SOURCE_STANDARD,
        },
        'summary': {
            'marine_macro_count': len(family_rows),
            'marine_macro_with_children_count': sum(1 for row in family_rows if row['child_count'] > 0),
            'marine_macro_without_children_count': len(unrefined),
            'low_precision_candidate_count': len(low_precision_candidates),
            'lowest_vertex_macro': min(
                (
                    {'id': row['id'], 'name': row['name'], 'vertex_count': row['vertex_count']}
                    for row in family_rows
                ),
                key=lambda item: item['vertex_count'],
                default=None,
            ),
        },
        'families': family_rows,
        'unrefined_candidates': sorted(unrefined, key=lambda item: (item['suggested_priority'], item['vertex_count'], item['name'])),
        'low_precision_candidates': sorted(
            low_precision_candidates,
            key=lambda item: (item['suggested_priority'], item['vertex_count'], item['name']),
        ),
    }
    return report


def main() -> int:
    payload = json.loads(SCENARIO_WATER_PATH.read_text(encoding='utf-8'))
    report = build_report(payload)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report['summary'], ensure_ascii=False))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
