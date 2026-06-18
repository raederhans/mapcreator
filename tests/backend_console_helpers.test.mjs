import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  escapeAttr,
  escapeHtml,
  formatDate,
  getBackendConsoleDocumentLang,
  getBackendConsoleMessageKeys,
  getBackendConsoleTitle,
  normalizeBackendConsoleLocale,
  sampleProjectPayload,
  translateBackendConsole,
} from "../backend/backend_console_helpers.js";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("backend console locales expose the same message keys", () => {
  assert.deepEqual(
    getBackendConsoleMessageKeys("en").sort(),
    getBackendConsoleMessageKeys("zh").sort(),
  );
});

test("backend console translator resolves locale, keys, and variables", () => {
  assert.equal(normalizeBackendConsoleLocale("en"), "en");
  assert.equal(normalizeBackendConsoleLocale("missing"), "zh");
  assert.equal(translateBackendConsole("en", "backendUnavailable"), "Open this page from the local dev server.");
  assert.equal(translateBackendConsole("zh", "adminRequired"), "需要管理员或版主权限。");
  assert.equal(translateBackendConsole("en", "custom {name}", { name: "Ada" }), "custom Ada");
});

test("backend console document metadata follows the resolved locale", () => {
  assert.equal(getBackendConsoleDocumentLang("zh"), "zh-Hans");
  assert.equal(getBackendConsoleDocumentLang("en"), "en");
  assert.equal(getBackendConsoleDocumentLang("unknown"), "zh-Hans");
  assert.equal(getBackendConsoleTitle("zh"), "Scenario Forge 社区与后台");
  assert.equal(getBackendConsoleTitle("en"), "Scenario Forge Community and Admin");
});

test("backend console page i18n keys are backed by messages", () => {
  const html = readFileSync(path.join(ROOT_DIR, "backend", "index.html"), "utf8");
  const app = readFileSync(path.join(ROOT_DIR, "backend", "app.js"), "utf8");
  const htmlKeys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]);
  const appLiteralKeys = [...app.matchAll(/\bt\("([^"]+)"/g)].map((match) => match[1]);
  const messageKeys = new Set(getBackendConsoleMessageKeys("zh"));
  const missingKeys = [...new Set([...htmlKeys, ...appLiteralKeys])]
    .filter((key) => !messageKeys.has(key))
    .sort();

  assert.deepEqual(missingKeys, []);
});

test("backend console sample project payload keeps the save schema shape", () => {
  const payload = sampleProjectPayload("manual");

  assert.equal(payload.schemaVersion, 21);
  assert.equal(payload.paintMode, "visual");
  assert.equal(payload.mapSemanticMode, "scenario");
  assert.equal(payload.activePaletteId, "manual");
  assert.deepEqual(payload.layerVisibility, { political: true, transport: true });
  assert.ok(Number.isFinite(Date.parse(payload.timestamp)));
});

test("backend console formatting helpers escape markup and tolerate dates", () => {
  assert.equal(formatDate(null), "");
  assert.equal(formatDate("not-a-date"), "not-a-date");
  assert.ok(formatDate("2026-06-18T12:00:00.000Z").length > 0);
  assert.equal(escapeHtml(`<b class="x">'&</b>`), "&lt;b class=&quot;x&quot;&gt;&#39;&amp;&lt;/b&gt;");
  assert.equal(escapeAttr("`<tag>`"), "&#96;&lt;tag&gt;&#96;");
});
