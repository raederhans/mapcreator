import json
import re
import sys
from pathlib import Path

DEFAULT_PATHS = [
    'data/china_adm2.geojson',
    'data/france_arrondissements.geojson',
    'data/poland_powiaty.geojson',
]


def load_geojson(path: Path):
    return json.loads(path.read_text(encoding='utf-8'))


def summarize_keys(features):
    keys = set()
    for feat in features:
        props = feat.get('properties') or {}
        keys.update(props.keys())
    return sorted(keys)


def print_samples(features, limit=3):
    for feat in features[:limit]:
        props = feat.get('properties') or {}
        sample = {k: props.get(k) for k in list(props.keys())[:10]}
        print(sample)


def inspect_china(features, keys):
    if 'shapeID' not in keys:
        return
    ids = [f.get('properties', {}).get('shapeID', '') for f in features]
    lengths = sorted({len(i) for i in ids if i})
    hexlike = sum(1 for i in ids if i and re.fullmatch(r'[0-9A-F]+', i))
    prefix2 = {i[:2] for i in ids if len(i) >= 2}
    print('shapeID lengths:', lengths)
    print('shapeID hexlike:', f"{hexlike}/{len(ids)}")
    print('shapeID prefix2 unique:', len(prefix2), 'sample:', sorted(list(prefix2))[:10])


def inspect_france(features, keys):
    if 'code' not in keys:
        return
    codes = [f.get('properties', {}).get('code', '') for f in features]
    lengths = sorted({len(c) for c in codes if c})
    non_digit = sorted({c for c in codes if c and not c.isdigit()})
    prefix2 = {c[:2] for c in codes if len(c) >= 2}
    prefix3 = {c[:3] for c in codes if len(c) >= 3}
    print('code lengths:', lengths)
    print('code prefix2 unique:', len(prefix2), 'sample:', sorted(list(prefix2))[:10])
    print('code prefix3 unique:', len(prefix3), 'sample:', sorted(list(prefix3))[:10])
    if non_digit:
        print('code non-digit examples:', non_digit)


def inspect_poland(features, keys):
    if 'terc' not in keys:
        return
    terc = [f.get('properties', {}).get('terc', '') for f in features]
    lengths = sorted({len(t) for t in terc if t})
    prefix2 = {t[:2] for t in terc if len(t) >= 2}
    non_digit = [t for t in terc if t and not t.isdigit()]
    print('terc lengths:', lengths)
    print('terc prefix2 unique:', len(prefix2), 'sample:', sorted(list(prefix2))[:10])
    print('terc non-digit count:', len(non_digit))


def inspect(path_str):
    path = Path(path_str)
    data = load_geojson(path)
    features = data.get('features', [])
    keys = summarize_keys(features)
    print(f"{path.name}: features={len(features)}")
    print('keys:', keys)
    print_samples(features)
    if 'china' in path.name:
        inspect_china(features, keys)
    if 'france' in path.name:
        inspect_france(features, keys)
    if 'poland' in path.name:
        inspect_poland(features, keys)
    print('---')


def main():
    paths = sys.argv[1:] or DEFAULT_PATHS
    for p in paths:
        inspect(p)


if __name__ == '__main__':
    main()
