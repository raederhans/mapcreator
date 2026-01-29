import json
from pathlib import Path

try:
    # Attempt absolute import (for when running from root via init_map_data.py)
    from tools.geo_seeds import EUROPE_GEO_SEEDS
except ImportError:
    try:
        # Attempt local import (for when running script directly from tools/ dir)
        from geo_seeds import EUROPE_GEO_SEEDS
    except ImportError:
        raise ImportError(
            "Could not import geo_seeds. Ensure execution from root or tools/ directory."
        )


MANUAL_UI_DICT = {
    "Fill": "填充",
    "Eraser": "橡皮擦",
    "Eyedropper": "吸管",
    "Export Map": "导出地图",
    "Download Snapshot": "下载截图",
    "Auto-Fill Countries": "自动填充国家",
    "Clear Map": "清空地图",
    "Country Colors": "国家配色",
    "Reset Country Colors": "重置颜色",
    "Reset Colors": "重置颜色",
    "Search...": "搜索...",
    "Search Countries": "搜索国家",
    "Search countries": "搜索国家",
    "Current Tool": "当前工具",
    "Recent": "最近使用",
    "Color Palette": "调色板",
    "Custom": "自定义",
    "Texture": "纹理",
    "Overlay": "覆盖层",
    "Map Style": "地图样式",
    "Internal Borders": "内部边界",
    "Empire Borders": "帝国边界",
    "Coastlines": "海岸线",
    "Width": "宽度",
    "Opacity": "不透明度",
    "Format": "格式",
}


def load_geo_names(topo_path: Path):
    if not topo_path.exists():
        raise FileNotFoundError(f"Missing topology file: {topo_path}")

    with topo_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    names = set()
    if isinstance(data, dict) and data.get("type") == "Topology":
        political = data.get("objects", {}).get("political")
        if political and isinstance(political, dict):
            for geom in political.get("geometries", []):
                props = geom.get("properties") or {}
                name = props.get("name")
                if isinstance(name, str) and name.strip():
                    names.add(name.strip())
                else:
                    for key, value in props.items():
                        if "name" in key.lower() and isinstance(value, str) and value.strip():
                            names.add(value.strip())
    elif isinstance(data, dict) and "features" in data:
        for feat in data.get("features", []):
            props = feat.get("properties") or {}
            for key, value in props.items():
                if "name" in key.lower() and isinstance(value, str) and value.strip():
                    names.add(value.strip())

    return sorted(names)


def load_existing_locales(path: Path):
    if not path.exists():
        return {"ui": {}, "geo": {}}
    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        ui = data.get("ui") if isinstance(data, dict) else {}
        geo = data.get("geo") if isinstance(data, dict) else {}
        return {"ui": ui or {}, "geo": geo or {}}
    except Exception:
        return {"ui": {}, "geo": {}}


def merge_ui(existing_ui):
    keys = set(existing_ui.keys()) | set(MANUAL_UI_DICT.keys())
    merged = {}
    for key in sorted(keys):
        if key in MANUAL_UI_DICT:
            zh = MANUAL_UI_DICT[key]
        else:
            zh = existing_ui.get(key, {}).get("zh", key)
        en = existing_ui.get(key, {}).get("en", key)
        merged[key] = {"en": en, "zh": zh}
    return merged


def normalize_existing_geo(existing_geo):
    normalized = {}
    for key, value in existing_geo.items():
        if isinstance(value, dict):
            en = value.get("en", key)
            zh = value.get("zh", key)
        else:
            en = key
            zh = str(value)
        normalized[key] = {"en": en, "zh": zh}
    return normalized


def merge_geo(geo_names, existing_geo):
    merged = normalize_existing_geo(existing_geo)

    for name in geo_names:
        if name in merged:
            continue
        if name in EUROPE_GEO_SEEDS:
            zh = EUROPE_GEO_SEEDS[name]
        else:
            zh = f"[TODO] {name}"
        merged[name] = {"en": name, "zh": zh}

    return {k: merged[k] for k in sorted(merged.keys())}


def main():
    base_dir = Path(__file__).resolve().parents[1]
    topo_path = base_dir / "data" / "europe_topology.json"
    output_path = base_dir / "data" / "locales.json"

    geo_names = load_geo_names(topo_path)
    existing = load_existing_locales(output_path)

    ui_payload = merge_ui(existing.get("ui", {}))
    geo_payload = merge_geo(geo_names, existing.get("geo", {}))

    payload = {"ui": ui_payload, "geo": geo_payload}

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"OK: Extracted {len(geo_names)} geographical names and {len(ui_payload)} UI labels.")
    print(f"Saved locales to: {output_path}")


if __name__ == "__main__":
    main()
