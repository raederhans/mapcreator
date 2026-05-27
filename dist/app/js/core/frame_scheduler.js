// Frame-budget scheduler for renderer follow-up work.
// It keeps exact-after-settle and interaction follow-ups off the input event call stack.
const DEFAULT_FRAME_BUDGET_MS = 8;
const HIGH_PRIORITY_MIN_PER_DRAIN = 1;
const PRIORITY_WEIGHT = {
  high: 0,
  normal: 1,
  low: 2,
};

const queue = [];
let scheduled = false;
let sequence = 0;

function nowMs() {
  return globalThis.performance?.now ? globalThis.performance.now() : Date.now();
}

function hasPendingInput(priority = "normal", { includeContinuous = null } = {}) {
  const scheduler = globalThis.navigator?.scheduling;
  if (!scheduler || typeof scheduler.isInputPending !== "function") return false;
  const resolvedIncludeContinuous = includeContinuous == null ? priority !== "high" : !!includeContinuous;
  try {
    return !!scheduler.isInputPending({ includeContinuous: resolvedIncludeContinuous });
  } catch (error) {
    return !!scheduler.isInputPending();
  }
}

function scheduleDrain() {
  if (scheduled) return;
  scheduled = true;
  // drain 统一从 idle/rAF/timer 三种入口接管，
  // 外部调用方只负责塞任务，避免每条调用链都各自维护一套“下一帧再跑”的时序。
  const drain = (deadline = null) => {
    scheduled = false;
    const idleBudget = deadline && typeof deadline.timeRemaining === "function"
      ? Math.max(1, deadline.timeRemaining())
      : DEFAULT_FRAME_BUDGET_MS;
    runFrameTasks(Math.min(DEFAULT_FRAME_BUDGET_MS, idleBudget));
  };
  if (typeof globalThis.requestIdleCallback === "function") {
    globalThis.requestIdleCallback(drain, { timeout: 80 });
    return;
  }
  if (typeof globalThis.requestAnimationFrame === "function") {
    globalThis.requestAnimationFrame(() => drain(null));
    return;
  }
  globalThis.setTimeout(() => drain(null), 0);
}

function createFrameTaskHandle(entry) {
  return {
    id: entry.id,
    cancel() {
      entry.canceled = true;
    },
  };
}

export function enqueueFrameTask(task, {
  priority = "normal",
  label = "task",
  generation = null,
  dedupe = false,
  deferOnContinuousInput = false,
} = {}) {
  // label + generation 是这里的去重合同：
  // 同一代任务可以被重复请求，但队列里只保留一个待执行实例。
  if (typeof task !== "function") return null;
  const normalizedLabel = String(label || "task");
  const normalizedGeneration = generation == null ? "" : String(generation);
  const labelGenerationKey = normalizedGeneration ? `${normalizedLabel}:${normalizedGeneration}` : normalizedLabel;
  if (dedupe) {
    const existing = queue.find((entry) =>
      entry
      && !entry.canceled
      && entry.labelGenerationKey === labelGenerationKey
    );
    if (existing) {
      existing.handle = existing.handle || createFrameTaskHandle(existing);
      return existing.handle;
    }
  }
  const entry = {
    id: sequence += 1,
    task,
    priority: Object.prototype.hasOwnProperty.call(PRIORITY_WEIGHT, priority) ? priority : "normal",
    label: normalizedLabel,
    generation: normalizedGeneration,
    labelGenerationKey,
    deferOnContinuousInput: !!deferOnContinuousInput,
    canceled: false,
  };
  entry.handle = createFrameTaskHandle(entry);
  queue.push(entry);
  scheduleDrain();
  return entry.handle;
}

export function runFrameTasks(budgetMs = DEFAULT_FRAME_BUDGET_MS) {
  const startedAt = nowMs();
  const budget = Math.max(1, Number(budgetMs) || DEFAULT_FRAME_BUDGET_MS);
  const highPriorityMinPerDrain = Math.max(0, Number(HIGH_PRIORITY_MIN_PER_DRAIN) || 0);
  let highTasksConsumed = 0;
  // 先按优先级排，再保证每轮至少吃掉少量 high 任务，
  // 这样 exact-after-settle 一类高价值刷新不会被普通队列长期饿死。
  queue.sort((left, right) => {
    const priorityDelta = PRIORITY_WEIGHT[left.priority] - PRIORITY_WEIGHT[right.priority];
    return priorityDelta || (left.id - right.id);
  });
  const runTask = (entry) => {
    try {
      entry.task({
        label: entry.label,
        elapsedMs: Math.max(0, nowMs() - startedAt),
        budgetMs: budget,
      });
    } catch (error) {
      // One failed renderer slice must not strand later exact-frame tasks.
      console.error("[frame-scheduler] task failed", error);
    }
  };

  while (queue.length && highTasksConsumed < highPriorityMinPerDrain) {
    if (nowMs() - startedAt >= budget) break;
    if (hasPendingInput("high")) break;
    const entryIndex = queue.findIndex((entry) => !!entry && !entry.canceled && entry.priority === "high");
    if (entryIndex < 0) break;
    const [entry] = queue.splice(entryIndex, 1);
    if (!entry || entry.canceled) continue;
    if (entry.deferOnContinuousInput && hasPendingInput("normal")) {
      queue.unshift(entry);
      break;
    }
    runTask(entry);
    highTasksConsumed += 1;
  }

  while (queue.length) {
    if (nowMs() - startedAt >= budget) break;
    const entry = queue.shift();
    if (!entry || entry.canceled) continue;
    // 输入还在持续时，把当前任务放回队首并尽快让出主线程，
    // 下一轮 drain 会沿用同一套优先级顺序继续处理。
    if (hasPendingInput(entry.priority, { includeContinuous: entry.deferOnContinuousInput ? true : null })) {
      queue.unshift(entry);
      break;
    }
    runTask(entry);
  }
  if (queue.some((entry) => !entry.canceled)) {
    scheduleDrain();
  }
}

export function getFrameSchedulerQueueLength({ byPriority = false, byLabelGeneration = false } = {}) {
  const stats = {
    high: 0,
    normal: 0,
    low: 0,
    total: 0,
  };
  if (byLabelGeneration) {
    stats.byLabelGeneration = {};
  }
  queue.forEach((entry) => {
    if (!entry || entry.canceled) return;
    const priority = Object.prototype.hasOwnProperty.call(PRIORITY_WEIGHT, entry.priority) ? entry.priority : "normal";
    stats[priority] += 1;
    stats.total += 1;
    if (byLabelGeneration) {
      const key = String(entry.labelGenerationKey || entry.label || "task");
      stats.byLabelGeneration[key] = (stats.byLabelGeneration[key] || 0) + 1;
    }
  });
  return byPriority || byLabelGeneration ? stats : stats.total;
}
