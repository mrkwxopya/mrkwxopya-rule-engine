import { RuleEngineError } from "./errors.js";
import type {
  CompiledConditionEvaluator,
  CompiledRule,
  ComparisonCondition,
  ConditionEvaluationResult,
  ConditionNode,
  EvaluatorDependencies,
  GroupCondition,
  RuleDefinition
} from "./types.js";
import { assertNotTimedOut, getValueByPath } from "./utils.js";

const applyNegation = (matched: boolean, not?: boolean): boolean => {
  return not === true ? !matched : matched;
};

const compileComparison = (condition: ComparisonCondition): CompiledConditionEvaluator => {
  return (context, dependencies, startedAt): ConditionEvaluationResult => {
    assertNotTimedOut(startedAt, dependencies.timeoutMs);

    const operator = dependencies.operators.get(condition.operator);

    if (operator === undefined) {
      throw new RuleEngineError({
        code: "ENGINE_OPERATOR_NOT_FOUND",
        message: `Operator "${condition.operator}" is not registered.`,
        metadata: {
          operator: condition.operator,
          field: condition.field
        }
      });
    }

    const leftValue = getValueByPath(context.facts, condition.field);
    const matched = operator(leftValue, condition.value, context);
    return { matched: applyNegation(matched, condition.not) };
  };
};

const compileGroup = (condition: GroupCondition): CompiledConditionEvaluator => {
  const evaluators = condition.conditions.map((item) => compileConditionNode(item));

  return (context, dependencies, startedAt): ConditionEvaluationResult => {
    assertNotTimedOut(startedAt, dependencies.timeoutMs);

    if (condition.combinator === "all") {
      for (const evaluator of evaluators) {
        const result = evaluator(context, dependencies, startedAt);
        if (!result.matched) {
          return { matched: applyNegation(false, condition.not) };
        }
      }

      return { matched: applyNegation(true, condition.not) };
    }

    for (const evaluator of evaluators) {
      const result = evaluator(context, dependencies, startedAt);
      if (result.matched) {
        return { matched: applyNegation(true, condition.not) };
      }
    }

    return { matched: applyNegation(false, condition.not) };
  };
};

export const compileConditionNode = (condition: ConditionNode): CompiledConditionEvaluator => {
  if (condition.type === "comparison") {
    return compileComparison(condition);
  }

  if (condition.type === "group") {
    return compileGroup(condition);
  }

  throw new RuleEngineError({
    code: "ENGINE_COMPILATION_FAILED",
    message: "Unsupported condition node during compilation."
  });
};

export const compileRule = (rule: RuleDefinition): CompiledRule => {
  return {
    ruleId: rule.metadata.id,
    version: rule.metadata.version,
    evaluate: compileConditionNode(rule.when)
  };
};

export class CompiledRuleCache {
  readonly #cache = new Map<string, CompiledRule>();

  public get(rule: RuleDefinition): CompiledRule {
    const cacheKey = `${rule.metadata.id}@${rule.metadata.version}`;
    const existing = this.#cache.get(cacheKey);

    if (existing !== undefined) {
      return existing;
    }

    const compiled = compileRule(rule);
    this.#cache.set(cacheKey, compiled);
    return compiled;
  }

  public clear(): void {
    this.#cache.clear();
  }

  public size(): number {
    return this.#cache.size;
  }
}