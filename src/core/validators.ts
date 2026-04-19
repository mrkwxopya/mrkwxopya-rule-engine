import { RuleEngineError } from "./errors.js";
import type {
  ActionDefinition,
  ComparisonCondition,
  ConditionNode,
  EngineConfig,
  GroupCondition,
  RuleDefinition
} from "./types.js";
import type { RuleMetadata } from "./metadata.js";
import { DEFAULT_ENGINE_CONFIG, normalizeEngineConfig } from "./defaults.js";

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const isSafeInteger = (value: unknown): value is number => {
  return typeof value === "number" && Number.isSafeInteger(value);
};

export const validateEngineConfig = (config: EngineConfig): void => {
  if (!isNonEmptyString(config.engineName)) {
    throw new RuleEngineError({
      code: "ENGINE_INVALID_CONFIG",
      message: "Engine config must include a non-empty engineName."
    });
  }

  const normalized = normalizeEngineConfig(config);

  if (!isSafeInteger(normalized.timeoutMs) || normalized.timeoutMs <= 0) {
    throw new RuleEngineError({
      code: "ENGINE_INVALID_CONFIG",
      message: "Engine config timeoutMs must be a positive safe integer."
    });
  }

  if (!isSafeInteger(normalized.maxRules) || normalized.maxRules <= 0) {
    throw new RuleEngineError({
      code: "ENGINE_INVALID_CONFIG",
      message: "Engine config maxRules must be a positive safe integer."
    });
  }
};

const validateRuleMetadata = (metadata: RuleMetadata): void => {
  if (!isNonEmptyString(metadata.id)) {
    throw new RuleEngineError({
      code: "ENGINE_INVALID_RULE",
      message: "Rule metadata.id must be a non-empty string."
    });
  }

  if (!isNonEmptyString(metadata.name)) {
    throw new RuleEngineError({
      code: "ENGINE_INVALID_RULE",
      message: `Rule "${metadata.id}" metadata.name must be a non-empty string.`
    });
  }

  if (!isNonEmptyString(metadata.version)) {
    throw new RuleEngineError({
      code: "ENGINE_INVALID_RULE",
      message: `Rule "${metadata.id}" metadata.version must be a non-empty string.`
    });
  }

  if (typeof metadata.enabled !== "boolean") {
    throw new RuleEngineError({
      code: "ENGINE_INVALID_RULE",
      message: `Rule "${metadata.id}" metadata.enabled must be a boolean.`
    });
  }

  if (!isSafeInteger(metadata.priority)) {
    throw new RuleEngineError({
      code: "ENGINE_INVALID_RULE",
      message: `Rule "${metadata.id}" metadata.priority must be a safe integer.`
    });
  }
};

const validateComparisonCondition = (condition: ComparisonCondition): void => {
  if (!isNonEmptyString(condition.field)) {
    throw new RuleEngineError({
      code: "ENGINE_INVALID_RULE",
      message: "Comparison condition field must be a non-empty string."
    });
  }

  if (!isNonEmptyString(condition.operator)) {
    throw new RuleEngineError({
      code: "ENGINE_INVALID_RULE",
      message: `Comparison condition "${condition.field}" must have a valid operator.`
    });
  }
};

const validateGroupCondition = (condition: GroupCondition): void => {
  if (!Array.isArray(condition.conditions) || condition.conditions.length === 0) {
    throw new RuleEngineError({
      code: "ENGINE_INVALID_RULE",
      message: "Group condition must contain at least one nested condition."
    });
  }

  for (const nestedCondition of condition.conditions) {
    validateConditionNode(nestedCondition);
  }
};

export const validateConditionNode = (condition: ConditionNode): void => {
  if (condition.type === "comparison") {
    validateComparisonCondition(condition);
    return;
  }

  if (condition.type === "group") {
    if (condition.combinator !== "all" && condition.combinator !== "any") {
      throw new RuleEngineError({
        code: "ENGINE_INVALID_RULE",
        message: "Group condition combinator must be either 'all' or 'any'."
      });
    }

    validateGroupCondition(condition);
    return;
  }

  throw new RuleEngineError({
    code: "ENGINE_INVALID_RULE",
    message: "Condition node type is invalid or unsupported."
  });
};

const validateActionDefinition = (action: ActionDefinition, ruleId: string): void => {
  if (!isNonEmptyString(action.type)) {
    throw new RuleEngineError({
      code: "ENGINE_INVALID_RULE",
      message: `Rule "${ruleId}" contains an action with an invalid type.`
    });
  }
};

export const validateRuleDefinition = (rule: RuleDefinition): void => {
  validateRuleMetadata(rule.metadata);
  validateConditionNode(rule.when);

  if (!Array.isArray(rule.then) || rule.then.length === 0) {
    throw new RuleEngineError({
      code: "ENGINE_INVALID_RULE",
      message: `Rule "${rule.metadata.id}" must define at least one 'then' action.`
    });
  }

  for (const action of rule.then) {
    validateActionDefinition(action, rule.metadata.id);
  }

  if (rule.else !== undefined) {
    for (const action of rule.else) {
      validateActionDefinition(action, rule.metadata.id);
    }
  }
};

export const validateRuleCollectionSize = (
  currentSize: number,
  incomingCount: number,
  maxRules: number,
): void => {
  if (currentSize + incomingCount > maxRules) {
    throw new RuleEngineError({
      code: "ENGINE_INVALID_CONFIG",
      message: `Rule limit exceeded. Max allowed rules: ${String(maxRules)}.`
    });
  }
};

export const getValidatedAndNormalizedConfig = (config: EngineConfig) => {
  validateEngineConfig(config);
  return normalizeEngineConfig(config);
};

export const getDefaultEngineConfig = () => DEFAULT_ENGINE_CONFIG;