import { RuleEngineError } from "./errors.js";
import type {
  ActionExecutionResult,
  EngineContext,
  EngineEvaluationResult,
  EvaluatorDependencies,
  EvaluatorOptions,
  FactRecord,
  RuleDefinition,
  RuleEvaluationUnitResult,
  RuleExecutionResult
} from "./types.js";
import {
  assertNotTimedOut,
  createEvaluationId,
  deepFreeze,
  durationMsFrom,
  nowIso
} from "./utils.js";
import { compileRule } from "./compiler.js";

const executeActions = async (
  rule: RuleDefinition,
  matched: boolean,
  context: EngineContext,
  dependencies: EvaluatorDependencies,
  startedAt: number,
): Promise<readonly ActionExecutionResult[]> => {
  assertNotTimedOut(startedAt, dependencies.timeoutMs);

  const actionsToRun = matched ? rule.then : (rule.else ?? []);
  const actionResults: ActionExecutionResult[] = [];

  for (const action of actionsToRun) {
    assertNotTimedOut(startedAt, dependencies.timeoutMs);

    const actionStartedAt = Date.now();
    const handler = dependencies.actions.get(action.type);

    if (handler === undefined) {
      if (dependencies.strictMode) {
        throw new RuleEngineError({
          code: "ENGINE_ACTION_NOT_FOUND",
          message: `Action "${action.type}" is not registered.`,
          metadata: {
            ruleId: rule.metadata.id,
            actionType: action.type
          }
        });
      }

      actionResults.push({
        actionType: action.type,
        success: false,
        durationMs: durationMsFrom(actionStartedAt, Date.now()),
        error: `Action "${action.type}" is not registered.`
      });

      continue;
    }

    try {
      await handler(action.payload, context);

      actionResults.push({
        actionType: action.type,
        success: true,
        durationMs: durationMsFrom(actionStartedAt, Date.now())
      });
    } catch (error) {
      if (dependencies.strictMode) {
        throw new RuleEngineError({
          code: "ENGINE_EVALUATION_FAILED",
          message: `Action "${action.type}" failed during execution.`,
          cause: error,
          metadata: {
            ruleId: rule.metadata.id,
            actionType: action.type
          }
        });
      }

      actionResults.push({
        actionType: action.type,
        success: false,
        durationMs: durationMsFrom(actionStartedAt, Date.now()),
        error: error instanceof Error ? error.message : "Unknown action execution error."
      });
    }
  }

  return Object.freeze(actionResults);
};

export const evaluateSingleRule = async (
  rule: RuleDefinition,
  context: EngineContext,
  dependencies: EvaluatorDependencies,
  startedAt: number,
): Promise<RuleEvaluationUnitResult> => {
  assertNotTimedOut(startedAt, dependencies.timeoutMs);

  const ruleStartedAt = Date.now();

  if (!rule.metadata.enabled) {
    const trace = {
      ruleId: rule.metadata.id,
      ruleName: rule.metadata.name,
      matched: false,
      skipped: true,
      reason: "Rule is disabled.",
      durationMs: durationMsFrom(ruleStartedAt, Date.now())
    } as const;

    const result: RuleExecutionResult = {
      ruleId: rule.metadata.id,
      matched: false,
      actions: Object.freeze([])
    };

    return { trace, result };
  }

  const compiled = compileRule(rule);
  const conditionResult = compiled.evaluate(context, dependencies, startedAt);
  const actionResults = await executeActions(rule, conditionResult.matched, context, dependencies, startedAt);

  const trace = {
    ruleId: rule.metadata.id,
    ruleName: rule.metadata.name,
    matched: conditionResult.matched,
    skipped: false,
    durationMs: durationMsFrom(ruleStartedAt, Date.now())
  } as const;

  const result: RuleExecutionResult = {
    ruleId: rule.metadata.id,
    matched: conditionResult.matched,
    actions: actionResults
  };

  return { trace, result };
};

export const evaluateRules = async <TFacts extends FactRecord>(
  rules: readonly RuleDefinition[],
  options: EvaluatorOptions<TFacts>,
  dependencies: EvaluatorDependencies,
  freezeFacts: boolean,
): Promise<EngineEvaluationResult> => {
  const startedAtMs = Date.now();
  const startedAtIso = nowIso();

  const facts = freezeFacts ? deepFreeze(options.facts) : options.facts;
  const evaluationId = options.metadata?.evaluationId ?? createEvaluationId();

  const metadata = {
    evaluationId,
    timestamp: options.metadata?.timestamp ?? startedAtIso,
    ...(options.metadata?.correlationId !== undefined
      ? { correlationId: options.metadata.correlationId }
      : {}),
    ...(options.metadata?.causationId !== undefined
      ? { causationId: options.metadata.causationId }
      : {}),
    ...(options.metadata?.requestId !== undefined
      ? { requestId: options.metadata.requestId }
      : {})
  };

  const context: EngineContext<TFacts> = {
    facts,
    metadata
  };

  const trace = [];
  const results = [];

  for (const rule of rules) {
    assertNotTimedOut(startedAtMs, dependencies.timeoutMs);

    const unit = await evaluateSingleRule(rule, context, dependencies, startedAtMs);
    trace.push(unit.trace);
    results.push(unit.result);
  }

  const finishedAtMs = Date.now();
  const finishedAtIso = nowIso();

  return {
    evaluationId,
    startedAt: startedAtIso,
    finishedAt: finishedAtIso,
    durationMs: durationMsFrom(startedAtMs, finishedAtMs),
    trace: Object.freeze(trace),
    results: Object.freeze(results)
  };
};