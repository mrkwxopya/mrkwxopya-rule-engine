import { RuleEngineError } from "./errors.js";
import type { OperatorRegistry, ActionRegistry, RuleDefinition } from "./types.js";

export const preflightValidateRules = (
  rules: readonly RuleDefinition[],
  operators: OperatorRegistry,
  actions: ActionRegistry,
): void => {
  for (const rule of rules) {
    validateRuleOperators(rule, operators);
    validateRuleActions(rule, actions);
  }
};

const validateRuleOperators = (
  rule: RuleDefinition,
  operators: OperatorRegistry,
): void => {
  const stack = [rule.when];

  while (stack.length > 0) {
    const node = stack.pop();

    if (!node) continue;

    if (node.type === "comparison") {
      if (!operators.has(node.operator)) {
        throw new RuleEngineError({
          code: "ENGINE_OPERATOR_NOT_FOUND",
          message: `Operator "${node.operator}" not registered`,
          metadata: { ruleId: rule.metadata.id }
        });
      }
    }

    if (node.type === "group") {
      for (const c of node.conditions) {
        stack.push(c);
      }
    }
  }
};

const validateRuleActions = (
  rule: RuleDefinition,
  actions: ActionRegistry,
): void => {
  const check = (list?: readonly { type: string }[]) => {
    if (!list) return;

    for (const action of list) {
      if (!actions.has(action.type)) {
        throw new RuleEngineError({
          code: "ENGINE_ACTION_NOT_FOUND",
          message: `Action "${action.type}" not registered`,
          metadata: { ruleId: rule.metadata.id }
        });
      }
    }
  };

  check(rule.then);
  check(rule.else);
};