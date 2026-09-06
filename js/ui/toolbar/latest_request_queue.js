export function createLatestRequestQueue({ isSameRequest, execute, settle }) {
  let active = null;
  let pending = null;

  const settleWaiter = ({ waiter, resolve }) => {
    try {
      Promise.resolve(settle(waiter)).catch(() => {}).then(resolve);
    } catch {
      resolve();
    }
  };

  const settleWaiters = (waiters) => {
    for (const waiter of waiters) settleWaiter(waiter);
  };

  const pump = () => {
    if (active || !pending) return;
    active = pending;
    pending = null;

    Promise.resolve()
      .then(() => execute(active.request))
      .catch(() => {})
      .then(() => {
        const completed = active;
        active = null;
        settleWaiters(completed.waiters);
        pump();
      });
  };

  const enqueue = (request, waiter) => new Promise((resolve) => {
    const nextWaiter = { waiter, resolve };
    if (pending && isSameRequest(pending.request, request)) {
      pending.request = request;
      pending.waiters.push(nextWaiter);
    } else {
      if (pending) settleWaiters(pending.waiters);
      pending = { request, waiters: [nextWaiter] };
    }
    pump();
  });

  return { enqueue };
}
