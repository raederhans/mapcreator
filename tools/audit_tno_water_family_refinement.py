from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCENARIO_WATER_PATH = ROOT / 'data' / 'scenarios' / 'tno_1962' / 'water_regions.geojson'
PROVENANCE_PATH = ROOT / 'data' / 'scenarios' / 'tno_1962' / 'water_regions.provenance.json'
SOURCE_REVIEW_PATH = ROOT / 'data' / 'scenarios' / 'tno_1962' / 'water_refinement_source_reviews.json'
OUTPUT_PATH = ROOT / '.runtime' / 'reports' / 'generated' / 'ocean_family_refine_audit.json'
SCENARIO_ID = 'tno_1962'
LOW_VERTEX_COUNT_THRESHOLD = 100
HIGH_VERTEX_REVIEW_PERCENTILE = 0.90
GLOBAL_CLONE_SOURCE_STANDARD = 'tno_cloned_from_global_water_regions'
TERMINAL_PUBLIC_SOURCE_STATUS = 'terminal_public_source'
SOURCE_REVIEW_SCHEMA_VERSION = 1
SOURCE_REVIEW_STATUSES = {TERMINAL_PUBLIC_SOURCE_STATUS}
ACTIONABLE_RECOMMENDED_ACTIONS = {
    'replace_or_refine_with_public_source',
    'split_child_water_candidates',
    'add_child_detail_candidates',
}


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
        'region_group': str(props.get('region_group') or '').strip(),
        'water_type': str(props.get('water_type') or '').strip(),
        'source_standard': str(props.get('source_standard') or '').strip(),
        'source_feature_id': str(props.get('source_feature_id') or '').strip(),
        'geometry_type': str(geometry.get('type') or '').strip(),
        'vertex_count': _geometry_vertex_count(feature),
    }


def _percentile_threshold(values: list[int], percentile: float) -> int:
    if not values:
        return 0
    ordered = sorted(values)
    index = int((len(ordered) - 1) * percentile)
    return int(ordered[index])


def _source_family(source_standard: str) -> str:
    if source_standard == GLOBAL_CLONE_SOURCE_STANDARD:
        return 'local_clone'
    if source_standard.startswith('marine_regions_'):
        return 'marine_regions'
    return 'other' if source_standard else 'missing'


def _precision_band(vertex_count: int, *, high_vertex_review_threshold: int) -> str:
    if vertex_count < LOW_VERTEX_COUNT_THRESHOLD:
        return 'low'
    if high_vertex_review_threshold and vertex_count >= high_vertex_review_threshold:
        return 'high_review'
    return 'standard'


def _build_provenance_index(provenance_payload: dict | None) -> dict[str, dict]:
    if not provenance_payload:
        return {}
    records: dict[str, dict] = {}
    for item in provenance_payload.get('water_extracts', []) or []:
        feature_id = str(item.get('id') or '').strip()
        if not feature_id:
            continue
        records[feature_id] = {
            'provenance_kind': 'marine_regions',
            'source_layer': str(item.get('source_layer') or '').strip(),
            'source_query': str(item.get('source_query') or '').strip(),
            'source_record_ids': list(item.get('source_record_ids') or []),
            'source_feature_count': int(item.get('source_feature_count') or 0),
        }
    for item in provenance_payload.get('local_clone_extracts', []) or []:
        feature_id = str(item.get('id') or '').strip()
        if not feature_id:
            continue
        records[feature_id] = {
            'provenance_kind': 'local_clone',
            'source_water_region_id': str(item.get('source_water_region_id') or '').strip(),
            'source_water_region_name': str(item.get('source_water_region_name') or '').strip(),
            'source_feature_count': int(item.get('source_feature_count') or 0),
        }
    return records


def _require_review_date(value, label: str) -> str:
    text = str(value or '').strip()
    try:
        parsed = datetime.strptime(text, '%Y-%m-%d')
    except ValueError as exc:
        raise ValueError(f'{label} must use YYYY-MM-DD') from exc
    if parsed.strftime('%Y-%m-%d') != text:
        raise ValueError(f'{label} must use YYYY-MM-DD')
    return text


def _build_source_review_index(source_review_payload: dict | None, *, valid_feature_ids: set[str]) -> dict[str, dict]:
    if not source_review_payload:
        return {}
    if int(source_review_payload.get('schema_version') or 0) != SOURCE_REVIEW_SCHEMA_VERSION:
        raise ValueError(f'source review schema_version must be {SOURCE_REVIEW_SCHEMA_VERSION}')
    if str(source_review_payload.get('scenario_id') or '').strip() != SCENARIO_ID:
        raise ValueError(f'source review scenario_id must be {SCENARIO_ID}')
    _require_review_date(source_review_payload.get('reviewed_at'), 'source review reviewed_at')
    records: dict[str, dict] = {}
    for item in source_review_payload.get('features', []) or []:
        feature_id = str(item.get('id') or '').strip()
        review_status = str(item.get('review_status') or '').strip()
        if not feature_id or not review_status:
            raise ValueError('source review records require id and review_status')
        if feature_id in records:
            raise ValueError(f'duplicate source review record: {feature_id}')
        if feature_id not in valid_feature_ids:
            raise ValueError(f'source review references unknown marine_macro id: {feature_id}')
        if review_status not in SOURCE_REVIEW_STATUSES:
            raise ValueError(f'unknown source review_status for {feature_id}: {review_status}')
        reviewed_at = _require_review_date(item.get('reviewed_at'), f'source review reviewed_at: {feature_id}')
        source_queries = item.get('source_queries') or []
        if not isinstance(source_queries, list) or not source_queries:
            raise ValueError(f'source review requires source_queries: {feature_id}')
        for query in source_queries:
            if not isinstance(query, dict):
                raise ValueError(f'source review source_queries entries must be objects: {feature_id}')
            source_layer = str(query.get('source_layer') or '').strip()
            source_filter = str(query.get('cql_filter') or query.get('source_query') or '').strip()
            if not source_layer or not source_filter:
                raise ValueError(f'source review source_queries require source_layer and query/filter: {feature_id}')
        evidence = item.get('evidence') or []
        if not isinstance(evidence, list) or not any(str(entry or '').strip() for entry in evidence):
            raise ValueError(f'source review requires evidence: {feature_id}')
        records[feature_id] = {
            'review_status': review_status,
            'reviewed_at': reviewed_at,
            'source_queries': list(source_queries),
            'evidence': list(evidence),
        }
    return records


def _has_terminal_public_source_review(row: dict) -> bool:
    review = row.get('source_review') or {}
    return review.get('review_status') == TERMINAL_PUBLIC_SOURCE_STATUS


def _candidate_reasons(row: dict) -> list[str]:
    reasons = []
    if row.get('child_count', 0) == 0:
        reasons.append('no marine_detail children yet')
    if row['source_standard'] == GLOBAL_CLONE_SOURCE_STANDARD:
        reasons.append('uses global water clone source')
    if int(row.get('vertex_count') or 0) < LOW_VERTEX_COUNT_THRESHOLD:
        reasons.append(f'vertex_count below {LOW_VERTEX_COUNT_THRESHOLD}')
    if row.get('precision_band') == 'high_review' and row.get('child_count', 0) == 0:
        if _has_terminal_public_source_review(row):
            reasons.append('public source review found no verified child polygon source')
        else:
            reasons.append('high-detail macro still needs child water split review')
    if row.get('precision_band') == 'high_review' and row.get('child_count', 0) > 0:
        reasons.append('high-detail macro already has child water coverage')
    if row.get('provenance_status') != 'recorded':
        reasons.append('missing provenance record')
    return reasons


def _candidate_score(row: dict) -> int:
    score = 0
    if row.get('child_count', 0) == 0:
        score += 40
    if row.get('source_family') == 'local_clone':
        score += 60
    if row.get('precision_band') == 'low':
        score += 80
    if row.get('precision_band') == 'high_review' and row.get('child_count', 0) == 0:
        score += 20
    if row.get('provenance_status') != 'recorded':
        score += 30
    if row.get('water_type') in {'chokepoint', 'strait', 'channel'}:
        score += 15
    return score


def _candidate_priority(row: dict) -> str:
    score = _candidate_score(row)
    if score >= 100:
        return 'high'
    if score >= 40:
        return 'medium'
    return 'low'


def _recommended_action(row: dict) -> str:
    if row.get('source_family') == 'local_clone' or row.get('precision_band') == 'low':
        return 'replace_or_refine_with_public_source'
    if (
        row.get('precision_band') == 'high_review'
        and row.get('child_count', 0) == 0
        and _has_terminal_public_source_review(row)
    ):
        return 'monitor_terminal_public_source'
    if row.get('precision_band') == 'high_review' and row.get('child_count', 0) == 0:
        return 'split_child_water_candidates'
    if row.get('precision_band') == 'high_review' and row.get('child_count', 0) > 0:
        return 'monitor_simplification_only_if_performance_requires'
    if row.get('child_count', 0) == 0:
        return 'add_child_detail_candidates'
    return 'monitor'


def _is_actionable_backlog(row: dict) -> bool:
    action = str(row.get('recommended_action') or '').strip()
    return action in ACTIONABLE_RECOMMENDED_ACTIONS


def build_report(
    payload: dict,
    *,
    provenance_payload: dict | None = None,
    source_review_payload: dict | None = None,
    generated_at: str | None = None,
) -> dict:
    features = payload.get('features', []) or []
    children_by_parent: dict[str, list[dict]] = {}
    macros: list[dict] = []
    provenance_by_id = _build_provenance_index(provenance_payload)

    for feature in features:
        props = feature.get('properties', {}) or {}
        parent_id = str(props.get('parent_id') or '').strip()
        if parent_id:
            children_by_parent.setdefault(parent_id, []).append(_feature_record(feature))
        if str(props.get('region_group') or '').strip() == 'marine_macro':
            macros.append(feature)
    source_review_by_id = _build_source_review_index(
        source_review_payload,
        valid_feature_ids={_feature_record(feature)['id'] for feature in macros},
    )

    family_rows = []
    unrefined = []
    high_precision_split_candidates = []
    terminal_public_source_candidates = []
    simplification_review_candidates = []
    provenance_gaps = []
    macro_vertex_counts = [_geometry_vertex_count(feature) for feature in macros]
    high_vertex_review_threshold = _percentile_threshold(macro_vertex_counts, HIGH_VERTEX_REVIEW_PERCENTILE)
    for feature in sorted(macros, key=lambda item: str((item.get('properties') or {}).get('name') or '')):
        row = _feature_record(feature)
        feature_id = row['id']
        children = sorted(children_by_parent.get(feature_id, []), key=lambda item: item['name'])
        provenance = provenance_by_id.get(feature_id)
        row['child_count'] = len(children)
        row['children'] = children
        row['refinement_status'] = 'detailed' if children else 'macro_only'
        row['source_family'] = _source_family(row['source_standard'])
        row['precision_band'] = _precision_band(
            int(row.get('vertex_count') or 0),
            high_vertex_review_threshold=high_vertex_review_threshold,
        )
        row['provenance_status'] = 'recorded' if provenance else 'missing'
        row['provenance'] = provenance or {}
        row['source_review'] = source_review_by_id.get(feature_id, {})
        row['recommended_action'] = _recommended_action(row)
        row['candidate_score'] = _candidate_score(row)
        family_rows.append(row)
        if row['precision_band'] == 'high_review':
            high_precision_record = {
                'id': feature_id,
                'name': row['name'],
                'source_standard': row['source_standard'],
                'geometry_type': row['geometry_type'],
                'vertex_count': row['vertex_count'],
                'precision_band': row['precision_band'],
                'child_count': row['child_count'],
                'recommended_action': row['recommended_action'],
                'reasons': _candidate_reasons(row),
            }
            if row['child_count'] == 0:
                if row['recommended_action'] == 'monitor_terminal_public_source':
                    high_precision_record['source_review'] = row['source_review']
                    terminal_public_source_candidates.append(high_precision_record)
                else:
                    high_precision_split_candidates.append(high_precision_record)
            elif row['recommended_action'] == 'monitor_simplification_only_if_performance_requires':
                simplification_review_candidates.append(high_precision_record)
        if row['provenance_status'] != 'recorded':
            provenance_gaps.append({
                'id': feature_id,
                'name': row['name'],
                'source_standard': row['source_standard'],
                'source_feature_id': row['source_feature_id'],
                'reason': 'missing provenance record',
            })
        if not children:
            reasons = _candidate_reasons(row)
            unrefined.append({
                'id': feature_id,
                'name': row['name'],
                'source_standard': row['source_standard'],
                'source_family': row['source_family'],
                'geometry_type': row['geometry_type'],
                'vertex_count': row['vertex_count'],
                'precision_band': row['precision_band'],
                'child_count': row['child_count'],
                'provenance_status': row['provenance_status'],
                'source_review': row['source_review'],
                'candidate_score': row['candidate_score'],
                'reasons': reasons,
                'suggested_priority': _candidate_priority(row),
                'recommended_action': row['recommended_action'],
            })

    low_precision_candidates = [
        row for row in unrefined
        if row['precision_band'] == 'low'
    ]
    source_replacement_candidates = [
        row for row in family_rows
        if row['source_family'] == 'local_clone'
        or row['precision_band'] == 'low'
    ]
    backlog_candidates = [
        row for row in unrefined
        if _is_actionable_backlog(row)
    ]
    source_summary = {}
    precision_summary = {}
    for row in family_rows:
        source_summary[row['source_family']] = source_summary.get(row['source_family'], 0) + 1
        precision_summary[row['precision_band']] = precision_summary.get(row['precision_band'], 0) + 1

    report = {
        'generated_at': generated_at or datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z'),
        'scenario_id': SCENARIO_ID,
        'contract': {
            'schema_version': 4,
            'low_vertex_count_threshold': LOW_VERTEX_COUNT_THRESHOLD,
            'high_vertex_review_percentile': HIGH_VERTEX_REVIEW_PERCENTILE,
            'high_vertex_review_threshold': high_vertex_review_threshold,
            'global_clone_source_standard': GLOBAL_CLONE_SOURCE_STANDARD,
            'terminal_public_source_status': TERMINAL_PUBLIC_SOURCE_STATUS,
        },
        'summary': {
            'marine_macro_count': len(family_rows),
            'marine_macro_with_children_count': sum(1 for row in family_rows if row['child_count'] > 0),
            'marine_macro_without_children_count': len(unrefined),
            'low_precision_candidate_count': len(low_precision_candidates),
            'source_replacement_candidate_count': len(source_replacement_candidates),
            'high_precision_split_candidate_count': len(high_precision_split_candidates),
            'terminal_public_source_candidate_count': len(terminal_public_source_candidates),
            'simplification_review_candidate_count': len(simplification_review_candidates),
            'provenance_gap_count': len(provenance_gaps),
            'backlog_candidate_count': len(backlog_candidates),
            'source_summary': source_summary,
            'precision_summary': precision_summary,
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
        'unrefined_candidates': sorted(unrefined, key=lambda item: (-item['candidate_score'], item['vertex_count'], item['name'])),
        'backlog_candidates': sorted(backlog_candidates, key=lambda item: (-item['candidate_score'], item['vertex_count'], item['name'])),
        'low_precision_candidates': sorted(
            low_precision_candidates,
            key=lambda item: (-item['candidate_score'], item['vertex_count'], item['name']),
        ),
        'source_replacement_candidates': sorted(
            source_replacement_candidates,
            key=lambda item: (-item['candidate_score'], item['vertex_count'], item['name']),
        ),
        'high_precision_split_candidates': sorted(
            high_precision_split_candidates,
            key=lambda item: (-item['vertex_count'], item['name']),
        ),
        'terminal_public_source_candidates': sorted(
            terminal_public_source_candidates,
            key=lambda item: (-item['vertex_count'], item['name']),
        ),
        'simplification_review_candidates': sorted(
            simplification_review_candidates,
            key=lambda item: (-item['vertex_count'], item['name']),
        ),
        'provenance_gaps': sorted(provenance_gaps, key=lambda item: item['name']),
    }
    return report


def main() -> int:
    payload = json.loads(SCENARIO_WATER_PATH.read_text(encoding='utf-8'))
    provenance_payload = json.loads(PROVENANCE_PATH.read_text(encoding='utf-8')) if PROVENANCE_PATH.exists() else None
    source_review_payload = json.loads(SOURCE_REVIEW_PATH.read_text(encoding='utf-8')) if SOURCE_REVIEW_PATH.exists() else None
    report = build_report(
        payload,
        provenance_payload=provenance_payload,
        source_review_payload=source_review_payload,
    )
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report['summary'], ensure_ascii=False))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
