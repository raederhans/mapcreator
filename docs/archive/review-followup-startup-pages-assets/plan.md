# Review follow-up: startup localization and Pages transport packs

目标：修复 review 指出的两个真实运行路径缺口。

验收标准：
- `loadStartupBaseData()` 在 startup bundle 失败或缺失时仍向 `loadMapData()` 传入 `data/scenarios/<scenario>/locales.startup.json` 与 `geo_aliases.startup.json`。
- Pages dist 保留 airport/port workbench manifest 在 full pack 路径会请求的 Japan full GeoJSON。
- 定向测试覆盖两个契约。
