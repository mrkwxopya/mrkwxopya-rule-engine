import { RuleEngineError } from "./errors.js";

export const deepFreeze = <T>(value: T): Readonly<T> => {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Object.isFrozen(value)) {
    return value;
  }

  const target = value as Record<string, unknown>;
  const propertyNames = Object.getOwnPropertyNames(target);

  for (const propertyName of propertyNames) {
    const propertyValue = target[propertyName];
    deepFreeze(propertyValue);
  }

  return Object.freeze(value);
};

export const getValueByPath = (source: unknown, path: string): unknown => {
  if (typeof path !== "string" || path.trim().length === 0) {
    return undefined;
  }

  const segments = path.split(".").map((segment) => segment.trim()).filter(Boolean);

  let current: unknown = source;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
};

export const createEvaluationId = (): string => {
  const randomPart = Math.random().toString(36).slice(2, 10);
  const timestampPart = Date.now().toString(36);
  return `eval_${timestampPart}_${randomPart}`;
};

export const nowIso = (): string => {
  return new Date().toISOString();
};

export const durationMsFrom = (startedAt: number, endedAt: number): number => {
  return Math.max(0, endedAt - startedAt);
};

export const assertNotTimedOut = (
  startedAt: number,
  timeoutMs: number,
  message?: string,
): void => {
  const now = Date.now();

  if (now - startedAt > timeoutMs) {
    throw new RuleEngineError({
      code: "ENGINE_EXECUTION_TIMEOUT",
      message: message ?? `Rule evaluation exceeded timeout of ${String(timeoutMs)}ms.`
    });
  }
};