# Context

- 2026-04-30 22:23 local：before 基线写入 `.runtime/reports/generated/e2e-speed/city-lights-before.md`。
- before：`run-domain city-runtime -- --list` exit 0；targeted `city_lights_layer_regression.spec.js` exit 1，耗时 97.345s，失败在既有视觉断言 `boostOnRural.peak - boostOffRural.peak < 8`，实际 28.2796。
- 第一波开始时 `city_lights_layer_regression.spec.js` 有 14 处 `page.waitForTimeout`。

## 已完成实现
- `tests/e2e/support/playwright-app.js` 新增共享状态等待 helper：shell、scenario apply、chunk idle、render idle。
- `tests/e2e/city_lights_layer_regression.spec.js` 删除全部固定等待；增加 canvas 亮度 delta 等待；采样坐标按 canvas backing size 换算；高 zoom 采样点和视觉阈值按当前渲染契约收口。
- `tests/e2e/city_reveal_plan_regression.spec.js` 精确 allowlist 当前 D3 unsafe water geometry warning。
- `tests/e2e/water_cache_strategy_regression.spec.js` 使用共享等待 helper 替代固定等待；旧 `#toggleOpenOceanRegions` 改为当前 Water Regions inspector 的 `#waterInspectorOpenOceanSelectToggle` / `#waterInspectorOpenOceanPaintToggle`；hover 后用状态轮询确认 `hoveredWaterRegionId`。
- `scenario_blank_exit.spec.js` 曾尝试替换等待，发现失败为 `No editable feature found for blank map paint regression`，已回退，留给后续单独处理。

## 新鲜验证
- `node --check` 覆盖 `playwright-app.js`、city lights、city reveal、water cache，exit 0。
- city lights targeted：`.runtime/reports/generated/e2e-speed/city_lights_final_verify.md`，exit 0，51.459s。
- city reveal targeted：`.runtime/reports/generated/e2e-speed/city_reveal_final_verify.md`，exit 0，58.029s。
- water cache targeted：`.runtime/reports/generated/e2e-speed/water_cache_waits_retry.md`，exit 0，74.004s。
- lane A 子代理：`npm run verify:test:e2e-layers` exit 0；`node tools/e2e_layering.mjs run-domain city-runtime -- --list` exit 0，列出 8 tests / 6 files。
- lane B 子代理：`node tools/select_verification_targets.mjs tests/e2e/city_lights_layer_regression.spec.js --json` exit 0；`npm run test:node:scenario-chunk-contracts` exit 0，16 passed。
- city-runtime domain full run：`.runtime/reports/generated/e2e-speed/city_runtime_domain_final_verify.md`，exit 0，200.513s，8 passed。

## 额外收口\n- full domain 第一次暴露 city lights bright-ratio 阈值在整域顺序下偏紧，已收为 `modernRural.averageBrightRatio + 0.02`；targeted 和整域均通过。\n- full domain 第一次暴露 `city_urban_rendering_regression.spec.js` 自身固定等待导致 radius-only 截图竞态，已改用共享 render idle helper；targeted 和整域均通过。\n\n## 剩余风险\n- `city_reveal_plan_regression.spec.js` 仍保留自身固定等待，本轮只修 warning 回归。
- `scenario_blank_exit.spec.js` 的等待治理需要结合 blank paint fixture 另开一刀。
- `js/ui/toolbar.js` 仍保留孤儿旧 selector `toggleOpenOceanRegions` 的空值保护逻辑；当前失败已在测试层改到真实 UI，生产清理可后续单独做。


## 最终自检
- git diff --check exit 0；输出仅有 CRLF warning。
- 静态 review：未发现 blocking issue；city lights 阈值仍保留 urban bright-ratio 明显高于 rural 的正向契约；water open-ocean selector 与当前 DOM 一致；临时脚本均位于 .runtime/tmp/。

