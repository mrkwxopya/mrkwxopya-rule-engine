import type { RuleDefinition } from "./types.js";

export interface RuleFilterContext {
  readonly namespace?: string;
  readonly tenantId?: string;
}

export const filterRules = (
  rules: readonly RuleDefinition[],
  context: RuleFilterContext,
): readonly RuleDefinition[] => {
  return rules.filter((rule) => {
    if (context.namespace && rule.metadata.namespace !== context.namespace) {
      return false;
    }

    if (context.tenantId && rule.metadata.tenantId !== context.tenantId) {
      return false;
    }

    return true;
  });
};