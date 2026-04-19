import { RuleEngineError } from "./errors.js";
import type { RuleDefinition } from "./types.js";

export const isRuleActive = (rule: RuleDefinition, now: Date): boolean => {
  if (!rule.metadata.enabled) {
    return false;
  }

  const { effectiveFrom, effectiveTo } = rule.metadata;

  if (effectiveFrom) {
    const from = new Date(effectiveFrom);
    if (now < from) return false;
  }

  if (effectiveTo) {
    const to = new Date(effectiveTo);
    if (now > to) return false;
  }

  return true;
};

export const validateRuleLifecycle = (rule: RuleDefinition): void => {
  const { effectiveFrom, effectiveTo } = rule.metadata;

  if (effectiveFrom && isNaN(Date.parse(effectiveFrom))) {
    throw new RuleEngineError({
      code: "ENGINE_INVALID_RULE",
      message: `Rule "${rule.metadata.id}" has invalid effectiveFrom date`
    });
  }

  if (effectiveTo && isNaN(Date.parse(effectiveTo))) {
    throw new RuleEngineError({
      code: "ENGINE_INVALID_RULE",
      message: `Rule "${rule.metadata.id}" has invalid effectiveTo date`
    });
  }

  if (effectiveFrom && effectiveTo) {
    if (new Date(effectiveFrom) > new Date(effectiveTo)) {
      throw new RuleEngineError({
        code: "ENGINE_INVALID_RULE",
        message: `Rule "${rule.metadata.id}" effectiveFrom > effectiveTo`
      });
    }
  }
};