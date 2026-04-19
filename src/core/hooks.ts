import type { AuditEvent, AuditListener, MetricEvent, MetricListener } from "./types.js";

export class AuditHookRegistry {
  readonly #listeners = new Set<AuditListener>();

  public add(listener: AuditListener): void {
    this.#listeners.add(listener);
  }

  public remove(listener: AuditListener): boolean {
    return this.#listeners.delete(listener);
  }

  public list(): readonly AuditListener[] {
    return Object.freeze([...this.#listeners]);
  }

  public async emit(event: AuditEvent): Promise<void> {
    for (const listener of this.#listeners) {
      await listener(event);
    }
  }
}

export class MetricHookRegistry {
  readonly #listeners = new Set<MetricListener>();

  public add(listener: MetricListener): void {
    this.#listeners.add(listener);
  }

  public remove(listener: MetricListener): boolean {
    return this.#listeners.delete(listener);
  }

  public list(): readonly MetricListener[] {
    return Object.freeze([...this.#listeners]);
  }

  public async emit(event: MetricEvent): Promise<void> {
    for (const listener of this.#listeners) {
      await listener(event);
    }
  }
}