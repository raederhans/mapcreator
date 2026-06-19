/* Default-off political raster worker v3 shell.
 * Metadata mode stays available by default. Bitmap mode only runs when the
 * main thread sends an explicit raster packet under the bitmap feature flag.
 */
const PROTOCOL_VERSION = 3;

function nowMs() {
  return self.performance?.now ? self.performance.now() : Date.now();
}

function reply(payload, transfer = []) {
  self.postMessage({ protocolVersion: PROTOCOL_VERSION, ...payload }, transfer);
}

function normalizeIdentity(identity = {}) {
  return {
    protocolVersion: PROTOCOL_VERSION,
    scenarioId: String(identity.scenarioId || ""),
    selectionVersion: Number(identity.selectionVersion || 0),
    topologyRevision: Number(identity.topologyRevision || 0),
    colorRevision: Number(identity.colorRevision || 0),
    transformBucket: String(identity.transformBucket || ""),
    dpr: Number(identity.dpr || 1),
    viewport: identity.viewport || null,
    passSignature: String(identity.passSignature || ""),
  };
}

function normalizeRasterPacket(packet = null) {
  if (!packet || typeof packet !== "object") return null;
  const canvasPxWidth = Math.max(0, Math.round(Number(packet.canvasPxWidth || 0)));
  const canvasPxHeight = Math.max(0, Math.round(Number(packet.canvasPxHeight || 0)));
  const entries = Array.isArray(packet.entries) ? packet.entries : [];
  if (canvasPxWidth <= 0 || canvasPxHeight <= 0 || !entries.length) return null;
  return {
    canvasPxWidth,
    canvasPxHeight,
    entries,
  };
}

function drawEntryPath(context, rings = []) {
  context.beginPath();
  rings.forEach((ring) => {
    if (!Array.isArray(ring) || ring.length < 3) return;
    let opened = false;
    ring.forEach((point) => {
      const x = Number(point?.[0]);
      const y = Number(point?.[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      if (!opened) {
        context.moveTo(x, y);
        opened = true;
      } else {
        context.lineTo(x, y);
      }
    });
    if (opened) context.closePath();
  });
}

async function rasterizePoliticalPacket(packet) {
  if (typeof OffscreenCanvas !== "function") {
    return { ok: false, reason: "offscreen-canvas-unavailable" };
  }
  const normalized = normalizeRasterPacket(packet);
  if (!normalized) {
    return { ok: false, reason: "empty-raster-packet" };
  }
  const canvas = new OffscreenCanvas(normalized.canvasPxWidth, normalized.canvasPxHeight);
  const context = canvas.getContext("2d");
  if (!context) {
    return { ok: false, reason: "2d-context-unavailable" };
  }
  context.clearRect(0, 0, normalized.canvasPxWidth, normalized.canvasPxHeight);
  let renderedFeatureCount = 0;
  normalized.entries.forEach((entry) => {
    const rings = Array.isArray(entry?.rings) ? entry.rings : [];
    if (!rings.length) return;
    drawEntryPath(context, rings);
    context.fillStyle = String(entry.fillColor || "#d8d3c4");
    context.fill("evenodd");
    context.strokeStyle = String(entry.strokeColor || entry.fillColor || "#d8d3c4");
    context.lineWidth = Math.max(0.5, Number(entry.strokeWidthPx || 0.75));
    context.lineJoin = "round";
    context.lineCap = "round";
    context.stroke();
    renderedFeatureCount += 1;
  });
  const bitmap = canvas.transferToImageBitmap();
  return {
    ok: true,
    bitmap,
    canvasPxWidth: normalized.canvasPxWidth,
    canvasPxHeight: normalized.canvasPxHeight,
    renderedFeatureCount,
    packetFeatureCount: normalized.entries.length,
  };
}

function handleRasterPoliticalPass(message) {
  const startedAt = nowMs();
  const taskId = String(message.taskId || "");
  const identity = normalizeIdentity(message.identity || {});
  const hint = message.renderHint && typeof message.renderHint === "object" ? message.renderHint : {};
  if (hint.bitmapMode) {
    rasterizePoliticalPacket(message.rasterPacket).then((result) => {
      const rasterMs = Number((nowMs() - startedAt).toFixed(3));
      if (!result.ok) {
        reply({
          type: "ERROR",
          taskId,
          identity,
          errorCode: result.reason || "bitmap-unavailable",
          rasterMs,
          packetBuildMs: Math.max(0, Number(message.packetBuildMs || 0)),
          renderHint: {
            pass: String(hint.pass || "political"),
            surface: String(hint.surface || "main"),
            bitmapMode: true,
            canvasPxWidth: Math.max(0, Number(hint.canvasPxWidth || 0)),
            canvasPxHeight: Math.max(0, Number(hint.canvasPxHeight || 0)),
          },
        });
        return;
      }
      reply({
        type: "RASTER_RESULT",
        taskId,
        accepted: true,
        identity,
        reason: "bitmap",
        bitmap: result.bitmap,
        canvasPxWidth: result.canvasPxWidth,
        canvasPxHeight: result.canvasPxHeight,
        renderedFeatureCount: result.renderedFeatureCount,
        packetFeatureCount: result.packetFeatureCount,
        rasterMs,
        encodeMs: 0,
        decodeMs: 0,
        blitMs: 0,
        packetBuildMs: Math.max(0, Number(message.packetBuildMs || 0)),
        renderHint: {
          pass: String(hint.pass || "political"),
          surface: String(hint.surface || "main"),
          bitmapMode: true,
          canvasPxWidth: Math.max(0, Number(hint.canvasPxWidth || 0)),
          canvasPxHeight: Math.max(0, Number(hint.canvasPxHeight || 0)),
        },
      }, [result.bitmap]);
    }).catch((error) => {
      reply({
        type: "ERROR",
        taskId,
        errorCode: "raster-failed",
        message: String(error?.message || error || "unknown"),
      });
    });
    return;
  }
  reply({
    type: "RASTER_RESULT",
    taskId,
    accepted: true,
    identity,
    reason: "metadata-only",
    rasterMs: Number((nowMs() - startedAt).toFixed(3)),
    encodeMs: 0,
    decodeMs: 0,
    blitMs: 0,
    renderHint: {
      pass: String(hint.pass || "political"),
      surface: String(hint.surface || "main"),
      canvasPxWidth: Math.max(0, Number(hint.canvasPxWidth || 0)),
      canvasPxHeight: Math.max(0, Number(hint.canvasPxHeight || 0)),
    },
  });
}

self.onmessage = (event) => {
  const message = event.data || {};
  const taskId = String(message.taskId || "");
  try {
    if (Number(message.protocolVersion || PROTOCOL_VERSION) !== PROTOCOL_VERSION) {
      reply({
        type: "ERROR",
        taskId,
        errorCode: "protocol-mismatch",
      });
      return;
    }
    if (message.type === "PING") {
      reply({ type: "RASTER_READY", taskId });
      return;
    }
    if (message.type === "RASTER_POLITICAL_PASS") {
      handleRasterPoliticalPass(message);
      return;
    }
    reply({
      type: "ERROR",
      taskId,
      errorCode: "unsupported-capability",
    });
  } catch (error) {
    reply({
      type: "ERROR",
      taskId,
      errorCode: "raster-failed",
      message: String(error?.message || error || "unknown"),
    });
  }
};
