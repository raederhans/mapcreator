# Plan

## 验收标准

- 机场和港口标签支持可调大小、可调描边强度，并默认比旧实现更轻。
- 机场和港口长名称根据缩放、名称长度、字体大小自动缩短；低缩放优先显示短码或短名，高缩放再展示更完整名称。
- 机场和港口图标默认对比度更强，在地形和国家填色上更容易看见。
- 点击机场/港口时默认拦截底层地块选择；Transport 面板提供开关允许穿透选择。
- 现有相关测试扩展覆盖上述行为，收尾执行 targeted verification。

## 执行步骤

- [x] 读取 live owner、state、toolbar、交互链路和既有测试。
- [x] 扩展 transport overview 配置和外观面板控件。
- [x] 调整机场/港口标签算法与图标绘制。
- [x] 调整 facility 点击/hover 对底层地块选择的拦截逻辑。
- [x] 扩展现有 targeted tests。
- [x] 执行主线程验证、code review、修复 review 发现的问题。

## 当前边界

- 不改 transport workbench 数据生成和国家包 source chain。
- 不改 README。
- 不引入新依赖。
