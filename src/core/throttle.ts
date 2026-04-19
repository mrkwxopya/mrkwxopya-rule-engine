import { RuleEngineError } from "./errors.js";
import type { ThrottlePolicy } from "./types.js";

export class InMemoryThrottle {
  readonly #calls = new Map<string, number[]>();

  public check(key: string, policy: ThrottlePolicy): void {
    const now = Date.now();
    const windowStart = now - policy.windowMs;
    const existing = this.#calls.get(key) ?? [];
    const recent = existing.filter((timestamp) => timestamp >= windowStart);

    if (recent.length >= policy.maxCalls) {
      throw new RuleEngineError({
        code: "ENGINE_UNSUPPORTED_OPERATION",
        message: `Throttle exceeded for key "${key}".`,
        metadata: {
          key,
          maxCalls: policy.maxCalls,
          windowMs: policy.windowMs
        }
      });
    }

    recent.push(now);
    this.#calls.set(key, recent);
  }

  public clear(): void {
    this.#calls.clear();
  }
}