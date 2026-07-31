function normalizeBusListener(listener) {
  return typeof listener === "function" ? listener : null;
}

const listenersByEvent = new Map();

export function on(eventName, listener) {
  const normalizedListener = normalizeBusListener(listener);
  if (!eventName || !normalizedListener) return null;
  let listeners = listenersByEvent.get(eventName);
  if (!listeners) {
    listeners = new Set();
    listenersByEvent.set(eventName, listeners);
  }
  listeners.add(normalizedListener);
  return normalizedListener;
}

export function off(eventName, listener = null) {
  const listeners = listenersByEvent.get(eventName);
  if (!listeners) return;
  if (listener == null) {
    listenersByEvent.delete(eventName);
    return;
  }
  listeners.delete(listener);
  if (!listeners.size) {
    listenersByEvent.delete(eventName);
  }
}

export function emit(eventName, payload) {
  const listeners = listenersByEvent.get(eventName);
  if (!listeners || !listeners.size) return [];
  const snapshot = Array.from(listeners);
  const results = [];
  const errors = [];
  // Fanout is synchronous. Listener return values, including Promises, are
  // returned to the caller without awaiting so async workflows stay on the
  // single-owner handler surface.
  snapshot.forEach((listener) => {
    try {
      results.push(listener(payload));
    } catch (error) {
      errors.push(error);
    }
  });
  if (errors.length === 1) {
    throw errors[0];
  }
  if (errors.length) {
    const aggregateError = new AggregateError(
      errors,
      `State bus event "${eventName}" failed in ${errors.length} listener(s).`,
      { cause: errors[0] },
    );
    throw aggregateError;
  }
  return results;
}

export function once(eventName, listener) {
  const normalizedListener = normalizeBusListener(listener);
  if (!eventName || !normalizedListener) return null;
  const wrappedListener = (payload) => {
    off(eventName, wrappedListener);
    return normalizedListener(payload);
  };
  on(eventName, wrappedListener);
  return wrappedListener;
}
