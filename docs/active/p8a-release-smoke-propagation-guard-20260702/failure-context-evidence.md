# P8A Failure Context Evidence

Date: 2026-07-02

Purpose: prove the current release gate writes retry and preflight metadata into failure context artifacts.

## Negative Validation Command

Command:

```powershell
$env:PLAYWRIGHT_TEST_BASE_URL='http://127.0.0.1:8899/dist/'
npm run test:e2e:pages-public-release-gate
```

Expected result: exit code 1. Port 8899 had no listener, so the gate should fail during release-smoke preflight after one retry.

Observed error:

```text
[release-smoke] failed after 2 attempt(s); retryAttempted=true; phase=landing-preflight. release smoke preflight could not fetch all public Pages entrypoints
```

## Attempt 1 Context

Source artifact at capture time:

```text
.runtime/tests/playwright/release-pages_public_release_gate-public-Pages-release-gate/attachments/pages-public-release-gate-attempt-1-failure-context-29991c3fe172e0f061e194f7ad64704e03f5c7d2.json
```

Stable excerpt:

```json
{
  "baseUrl": "http://127.0.0.1:8899/dist/",
  "attempt": 1,
  "maxAttempts": 2,
  "phase": "landing-preflight",
  "retryable": true,
  "willRetry": true,
  "retryAttempted": true,
  "retryDelayMs": 30000,
  "preflightResults": [
    {
      "id": "landing-root",
      "status": "failed",
      "ok": false,
      "url": "http://127.0.0.1:8899/dist/"
    },
    {
      "id": "sample-runs",
      "status": "failed",
      "ok": false,
      "url": "http://127.0.0.1:8899/dist/assets/sample-runs.json"
    },
    {
      "id": "app-shell",
      "status": "failed",
      "ok": false,
      "url": "http://127.0.0.1:8899/dist/app/"
    }
  ]
}
```

## Final Context

Source artifact at capture time:

```text
.runtime/tests/playwright/release-pages_public_release_gate-public-Pages-release-gate/attachments/pages-public-release-gate-failure-context-03397bbbc7bba12f5fe522f4cc5c6afdc3cba03e.json
```

Stable excerpt:

```json
{
  "baseUrl": "http://127.0.0.1:8899/dist/",
  "attempt": 2,
  "maxAttempts": 2,
  "phase": "landing-preflight",
  "retryable": true,
  "willRetry": false,
  "retryAttempted": true,
  "retryDelayMs": 0,
  "preflightResults": [
    {
      "id": "landing-root",
      "status": "failed",
      "ok": false,
      "url": "http://127.0.0.1:8899/dist/"
    },
    {
      "id": "sample-runs",
      "status": "failed",
      "ok": false,
      "url": "http://127.0.0.1:8899/dist/assets/sample-runs.json"
    },
    {
      "id": "app-shell",
      "status": "failed",
      "ok": false,
      "url": "http://127.0.0.1:8899/dist/app/"
    }
  ]
}
```
