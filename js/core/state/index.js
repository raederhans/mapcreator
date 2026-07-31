import { emit, off, on, once } from "./bus.js";
import {
  STATE_BUS_EVENTS,
  STATE_HANDLER_HOOK_NAMES,
  STATE_NOTIFICATION_HOOK_NAMES,
} from "./config.js";

export * from "./config.js";
export * from "./bus.js";
export * from "../state_defaults.js";
export * from "../state_catalog.js";
export * from "./boot_state.js";
export * from "./content_state.js";
export * from "./color_state.js";
export * from "./ui_state.js";

const notificationHookNames = new Set(STATE_NOTIFICATION_HOOK_NAMES);
const handlerHookNames = new Set(STATE_HANDLER_HOOK_NAMES);
const legacyNotificationSlotsByHookName = new Map();
const notificationDispatchersByHookName = new Map();
const handlerEntriesByHookName = new Map();
const handlerDispatchersByHookName = new Map();
const compatTargets = new WeakSet();

// Runtime hook 分为通知型 bus 和有返回值的 handler；两类共享注册入口，但分发语义分开维护。
// Registry 按 hookName 全局共享；target 只负责绑定 legacy compatibility properties。
// 当前应用只有一个 canonical state。未来多实例支持需要先把 registry 实例化。
function normalizeRuntimeHook(hook) {
  return typeof hook === "function" ? hook : null;
}

// bus payload 只能带一个值，因此多参数 hook 统一包成显式 envelope，再在 listener 侧还原。
function packRuntimeHookArgs(args) {
  if (!Array.isArray(args) || !args.length) {
    return undefined;
  }
  if (args.length === 1) {
    return args[0];
  }
  return { __runtimeHookArgs: args };
}

function unpackRuntimeHookArgs(payload) {
  if (
    payload
    && typeof payload === "object"
    && Array.isArray(payload.__runtimeHookArgs)
  ) {
    return payload.__runtimeHookArgs;
  }
  if (payload === undefined) {
    return [];
  }
  return [payload];
}

function getNotificationDispatcher(hookName) {
  if (!notificationDispatchersByHookName.has(hookName)) {
    notificationDispatchersByHookName.set(hookName, (...args) => emitRuntimeHookBusEvent(null, hookName, ...args));
  }
  return notificationDispatchersByHookName.get(hookName);
}

function getHandlerDispatcher(hookName) {
  if (!handlerDispatchersByHookName.has(hookName)) {
    handlerDispatchersByHookName.set(hookName, (...args) => callRuntimeHook(null, hookName, ...args));
  }
  return handlerDispatchersByHookName.get(hookName);
}

export function isRuntimeHookBusEventName(hookName) {
  return notificationHookNames.has(String(hookName || "").trim());
}

export function isRuntimeHookHandlerName(hookName) {
  return handlerHookNames.has(String(hookName || "").trim());
}

export function readRuntimeHookBusDispatcher(_target, hookName) {
  if (!isRuntimeHookBusEventName(hookName)) {
    return null;
  }
  return legacyNotificationSlotsByHookName.has(hookName)
    ? getNotificationDispatcher(hookName)
    : null;
}

export function registerRuntimeHookBusListener(target, hookName, listener) {
  const normalizedHookName = String(hookName || "").trim();
  if (!isRuntimeHookBusEventName(normalizedHookName)) {
    return null;
  }
  bindStateCompatSurface(target);
  const eventName = STATE_BUS_EVENTS[normalizedHookName];
  const previousSlot = legacyNotificationSlotsByHookName.get(normalizedHookName);
  if (previousSlot) {
    off(eventName, previousSlot.wrapped);
    legacyNotificationSlotsByHookName.delete(normalizedHookName);
  }
  const normalizedListener = normalizeRuntimeHook(listener);
  if (!normalizedListener) {
    return null;
  }
  const token = Symbol(normalizedHookName);
  const wrappedListener = (payload) => normalizedListener(...unpackRuntimeHookArgs(payload));
  legacyNotificationSlotsByHookName.set(normalizedHookName, Object.freeze({
    source: normalizedListener,
    wrapped: wrappedListener,
    token,
  }));
  on(eventName, wrappedListener);
  return wrappedListener;
}

export function subscribeRuntimeNotification(target, hookName, listener) {
  const normalizedHookName = String(hookName || "").trim();
  if (!isRuntimeHookBusEventName(normalizedHookName)) {
    throw new TypeError(`Unknown runtime notification hook: ${normalizedHookName || "<empty>"}`);
  }
  const normalizedListener = normalizeRuntimeHook(listener);
  if (!normalizedListener) {
    throw new TypeError(`Runtime notification listener must be a function: ${normalizedHookName}`);
  }
  bindStateCompatSurface(target);
  const eventName = STATE_BUS_EVENTS[normalizedHookName];
  const wrappedListener = (payload) => normalizedListener(...unpackRuntimeHookArgs(payload));
  on(eventName, wrappedListener);
  let active = true;
  return Object.freeze({
    dispatcher: getNotificationDispatcher(normalizedHookName),
    dispose() {
      if (!active) return false;
      active = false;
      off(eventName, wrappedListener);
      return true;
    },
  });
}

export function emitRuntimeHookBusEvent(_target, hookName, ...args) {
  const normalizedHookName = String(hookName || "").trim();
  if (!isRuntimeHookBusEventName(normalizedHookName)) {
    return [];
  }
  return emit(STATE_BUS_EVENTS[normalizedHookName], packRuntimeHookArgs(args));
}

export function emitStateBusEvent(eventName, payload) {
  const normalizedEventName = String(eventName || "").trim();
  if (!normalizedEventName) {
    return [];
  }
  return emit(normalizedEventName, payload);
}

export function subscribeStateBusEvent(eventName, listener) {
  return on(String(eventName || "").trim(), listener);
}

export function readRuntimeHook(target, hookName) {
  const normalizedHookName = String(hookName || "").trim();
  if (!normalizedHookName) {
    return null;
  }
  bindStateCompatSurface(target);
  if (isRuntimeHookBusEventName(normalizedHookName)) {
    return readRuntimeHookBusDispatcher(target, normalizedHookName);
  }
  if (isRuntimeHookHandlerName(normalizedHookName) && handlerEntriesByHookName.has(normalizedHookName)) {
    return getHandlerDispatcher(normalizedHookName);
  }
  return null;
}

export function readRegisteredRuntimeHookSource(target, hookName) {
  const normalizedHookName = String(hookName || "").trim();
  if (!normalizedHookName) {
    return null;
  }
  bindStateCompatSurface(target);
  if (isRuntimeHookBusEventName(normalizedHookName)) {
    return legacyNotificationSlotsByHookName.get(normalizedHookName)?.source || null;
  }
  if (isRuntimeHookHandlerName(normalizedHookName)) {
    return handlerEntriesByHookName.get(normalizedHookName)?.source || null;
  }
  return null;
}

export function registerRuntimeHandler(target, hookName, handler) {
  const normalizedHookName = String(hookName || "").trim();
  if (!isRuntimeHookHandlerName(normalizedHookName)) {
    throw new TypeError(`Unknown runtime handler hook: ${normalizedHookName || "<empty>"}`);
  }
  const normalizedHandler = normalizeRuntimeHook(handler);
  if (!normalizedHandler) {
    throw new TypeError(`Runtime handler must be a function: ${normalizedHookName}`);
  }
  bindStateCompatSurface(target);
  const token = Symbol(normalizedHookName);
  handlerEntriesByHookName.set(normalizedHookName, Object.freeze({
    source: normalizedHandler,
    token,
  }));
  return Object.freeze({
    dispatcher: getHandlerDispatcher(normalizedHookName),
    dispose() {
      const currentEntry = handlerEntriesByHookName.get(normalizedHookName);
      if (!currentEntry || currentEntry.token !== token) return false;
      handlerEntriesByHookName.delete(normalizedHookName);
      return true;
    },
  });
}

export function registerRuntimeHook(target, hookName, hook) {
  const normalizedHookName = String(hookName || "").trim();
  if (!normalizedHookName) {
    return null;
  }
  bindStateCompatSurface(target);
  if (isRuntimeHookBusEventName(normalizedHookName)) {
    // 通知型 hook 暴露 dispatcher，兼容旧代码直接调用 state.someHook(...) 的写法。
    registerRuntimeHookBusListener(target, normalizedHookName, hook);
    return readRuntimeHookBusDispatcher(target, normalizedHookName);
  }
  if (!isRuntimeHookHandlerName(normalizedHookName)) {
    return null;
  }
  const normalizedHook = normalizeRuntimeHook(hook);
  if (!normalizedHook) {
    handlerEntriesByHookName.delete(normalizedHookName);
    return null;
  }
  handlerEntriesByHookName.set(normalizedHookName, Object.freeze({
    source: normalizedHook,
    token: Symbol(normalizedHookName),
  }));
  return getHandlerDispatcher(normalizedHookName);
}

export function callRuntimeHook(target, hookName, ...args) {
  const normalizedHookName = String(hookName || "").trim();
  if (!normalizedHookName) {
    return undefined;
  }
  bindStateCompatSurface(target);
  if (isRuntimeHookBusEventName(normalizedHookName)) {
    return emitRuntimeHookBusEvent(target, normalizedHookName, ...args);
  }
  const hook = handlerEntriesByHookName.get(normalizedHookName)?.source || null;
  if (!hook) {
    return undefined;
  }
  return hook(...args);
}

export function callRuntimeHooks(target, hookNames, ...args) {
  const normalizedHookNames = Array.isArray(hookNames) ? hookNames : [];
  return normalizedHookNames.map((hookName) => callRuntimeHook(target, hookName, ...args));
}

export function bindStateCompatSurface(target) {
  if (!target || typeof target !== "object" || compatTargets.has(target)) {
    return target;
  }
  compatTargets.add(target);

  // 兼容层把旧的 state 属性读写映射到集中 hook registry，避免各 owner 继续互相保存闭包引用。
  STATE_NOTIFICATION_HOOK_NAMES.forEach((hookName) => {
    Object.defineProperty(target, hookName, {
      configurable: true,
      enumerable: true,
      get() {
        return readRuntimeHookBusDispatcher(target, hookName);
      },
      set(nextHook) {
        registerRuntimeHookBusListener(target, hookName, nextHook);
      },
    });
  });

  STATE_HANDLER_HOOK_NAMES.forEach((hookName) => {
    Object.defineProperty(target, hookName, {
      configurable: true,
      enumerable: true,
      get() {
        return handlerEntriesByHookName.has(hookName)
          ? getHandlerDispatcher(hookName)
          : null;
      },
      set(nextHook) {
        registerRuntimeHook(target, hookName, nextHook);
      },
    });
  });

  return target;
}
