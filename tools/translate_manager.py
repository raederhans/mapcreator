import json
import sys
import subprocess
from pathlib import Path


UI_LABELS = [
    "Fill",
    "Eraser",
    "Export Map",
    "Download Snapshot",
    "Auto-Fill Countries",
    "Clear Map",
    "Country Colors",
    "Reset Colors",
]


def ensure_googletrans():
    try:
        import googletrans  # noqa: F401
        return True
    except Exception:
        pass

    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "googletrans==4.0.0-rc1"],
            check=True,
        )
        import googletrans  # noqa: F401
        return True
    except Exception:
        return False


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


def translate_items(items, translator):
    translations = {}
    if not items:
        return translations

    try:
        results = translator.translate(items, dest="zh")
        if not isinstance(results, list):
            results = [results]
        for src, res in zip(items, results):
            translations[src] = res.text if res and res.text else f"[ZH] {src}"
        for src in items:
            if src not in translations:
                translations[src] = f"[ZH] {src}"
    except Exception:
        for src in items:
            translations[src] = f"[ZH] {src}"

    return translations


def build_locale_payload(geo_names, ui_labels, translator):
    ui_trans = translate_items(ui_labels, translator)
    geo_trans = translate_items(geo_names, translator)

    payload = {
        "ui": {k: {"en": k, "zh": ui_trans.get(k, f"[ZH] {k}")} for k in ui_labels},
        "geo": {k: {"en": k, "zh": geo_trans.get(k, f"[ZH] {k}")} for k in geo_names},
    }
    return payload


def main():
    base_dir = Path(__file__).resolve().parents[1]
    topo_path = base_dir / "data" / "europe_topology.json"
    output_path = base_dir / "data" / "locales.json"

    geo_names = load_geo_names(topo_path)
    ui_labels = list(UI_LABELS)

    has_translator = ensure_googletrans()
    translator = None
    if has_translator:
        try:
            from googletrans import Translator

            translator = Translator()
        except Exception:
            translator = None

    if translator is None:
        class FallbackTranslator:
            def translate(self, items, dest="zh"):
                return [type("R", (), {"text": f"[ZH] {item}"}) for item in items]

        translator = FallbackTranslator()

    payload = build_locale_payload(geo_names, ui_labels, translator)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"OK: Extracted {len(geo_names)} geographical names and {len(ui_labels)} UI labels.")
    print(f"Saved locales to: {output_path}")


if __name__ == "__main__":
    main()
