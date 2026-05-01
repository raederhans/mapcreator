# plan

1. 先审计当前 shared builder、strict checker、publish gate、tests 与 checked-in scenario 数据的真实状态。
2. 先完成阶段 1 的 shared contract 收口：identity、owner bucket、manifest metrics、snapshot、strict validator、safe auto-fix。
3. 再补阶段 2 最小 profile rollout：profile registry、structured report、trusted/untrusted 语义与测试。
4. 主线程独占跑 targeted 验证，再做 review / bug sweep / 第一性原理复核。
