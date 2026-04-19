import { RuleEngineError } from "./errors.js";
import type { RuleDefinition } from "./types.js";

const compareRules = (left: RuleDefinition, right: RuleDefinition): number => {
  if (left.metadata.priority !== right.metadata.priority) {
    return right.metadata.priority - left.metadata.priority;
  }

  return left.metadata.id.localeCompare(right.metadata.id);
};

const cloneRuleArray = (rules: readonly RuleDefinition[]): RuleDefinition[] => {
  return [...rules];
};

export class RuleStore {
  readonly #rulesById = new Map<string, RuleDefinition>();
  #sortedRules: readonly RuleDefinition[] = Object.freeze([]);

  public add(rule: RuleDefinition): void {
    const ruleId = rule.metadata.id;

    if (this.#rulesById.has(ruleId)) {
      throw new RuleEngineError({
        code: "ENGINE_DUPLICATE_RULE_ID",
        message: `A rule with id "${ruleId}" is already registered.`,
        metadata: { ruleId }
      });
    }

    this.#rulesById.set(ruleId, rule);
    this.#rebuildSortedRules();
  }

  public addMany(rules: readonly RuleDefinition[]): void {
    const seen = new Set<string>();

    for (const rule of rules) {
      const ruleId = rule.metadata.id;

      if (seen.has(ruleId) || this.#rulesById.has(ruleId)) {
        throw new RuleEngineError({
          code: "ENGINE_DUPLICATE_RULE_ID",
          message: `A rule with id "${ruleId}" is already registered.`,
          metadata: { ruleId }
        });
      }

      seen.add(ruleId);
    }

    for (const rule of rules) {
      this.#rulesById.set(rule.metadata.id, rule);
    }

    this.#rebuildSortedRules();
  }

  public get(ruleId: string): RuleDefinition | undefined {
    return this.#rulesById.get(ruleId);
  }

  public has(ruleId: string): boolean {
    return this.#rulesById.has(ruleId);
  }

  public remove(ruleId: string): boolean {
    const removed = this.#rulesById.delete(ruleId);

    if (removed) {
      this.#rebuildSortedRules();
    }

    return removed;
  }

  public clear(): void {
    this.#rulesById.clear();
    this.#sortedRules = Object.freeze([]);
  }

  public size(): number {
    return this.#rulesById.size;
  }

  public list(): readonly RuleDefinition[] {
    return this.#sortedRules;
  }

  #rebuildSortedRules(): void {
    const sorted = cloneRuleArray([...this.#rulesById.values()]).sort(compareRules);
    this.#sortedRules = Object.freeze(sorted);
  }
}