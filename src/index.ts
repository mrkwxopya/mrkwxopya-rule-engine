export { VERSION } from "./version.js";

export type {
  Primitive,
  FactValue,
  FactRecord,
  EngineContext,
  ComparisonOperator,
  ConditionNodeBase,
  ComparisonCondition,
  GroupCondition,
  ConditionNode,
  ActionDefinition,
  RuleDefinition,
  EvaluationTraceItem,
  ActionExecutionResult,
  RuleExecutionResult,
  EngineEvaluationResult,
  EngineConfig,
  CustomOperator,
  ActionHandler,
  OperatorRegistry,
  ActionRegistry,
  EvaluatorDependencies,
  EvaluatorOptions,
  ConditionEvaluationResult,
  RuleEvaluationUnitResult,
  EngineEvaluateOptions,
  EvaluationSnapshot,
  AuditEventBase,
  EvaluationStartedAuditEvent,
  EvaluationFinishedAuditEvent,
  EvaluationFailedAuditEvent,
  RuleMatchedAuditEvent,
  RuleSkippedAuditEvent,
  AuditEvent,
  AuditListener,
  MetricEvent,
  MetricListener,
  PipelineContext,
  EvaluationMiddleware,
  EnginePlugin,
  EnginePluginApi,
  CompiledConditionEvaluator,
  CompiledRule,
  BatchEvaluationItem,
  BatchEvaluationResult,
  ReplayRecord,
  ThrottlePolicy,
  FieldIndex
} from "./core/types.js";

export type {
  RuleMetadata,
  EngineMetadata,
  EvaluationMetadata
} from "./core/metadata.js";

export type {
  RuleEngineErrorCode,
  RuleEngineErrorDetails
} from "./core/errors.js";

export {
  RuleEngineError,
  isRuleEngineError
} from "./core/errors.js";

export type {
  NormalizedEngineConfig
} from "./core/defaults.js";

export {
  DEFAULT_ENGINE_CONFIG,
  normalizeEngineConfig
} from "./core/defaults.js";

export {
  validateEngineConfig,
  validateConditionNode,
  validateRuleDefinition,
  validateRuleCollectionSize,
  getValidatedAndNormalizedConfig,
  getDefaultEngineConfig
} from "./core/validators.js";

export {
  InMemoryOperatorRegistry,
  InMemoryActionRegistry
} from "./core/registries.js";

export {
  RuleStore
} from "./core/rule-store.js";

export {
  BUILTIN_OPERATORS,
  registerBuiltinOperators,
  noopContextConsumer
} from "./core/builtins.js";

export {
  deepFreeze,
  getValueByPath,
  createEvaluationId,
  nowIso,
  durationMsFrom,
  assertNotTimedOut
} from "./core/utils.js";

export {
  evaluateSingleRule,
  evaluateRules
} from "./core/evaluator.js";

export {
  isRuleActive,
  validateRuleLifecycle
} from "./core/governance.js";

export type {
  RuleFilterContext
} from "./core/filters.js";

export {
  filterRules
} from "./core/filters.js";

export {
  preflightValidateRules
} from "./core/preflight.js";

export {
  AuditHookRegistry,
  MetricHookRegistry
} from "./core/hooks.js";

export {
  composeEvaluationMiddleware
} from "./core/pipeline.js";

export {
  createEvaluationSnapshot
} from "./core/snapshot.js";

export {
  PluginManager
} from "./core/plugins.js";

export {
  compileConditionNode,
  compileRule,
  CompiledRuleCache
} from "./core/compiler.js";

export {
  buildFieldIndex,
  findCandidateRuleIdsByFacts
} from "./core/indexer.js";

export {
  evaluateBatch
} from "./core/batch.js";

export {
  replayEvaluation,
  createReplayRecord
} from "./core/replay.js";

export {
  InMemoryThrottle
} from "./core/throttle.js";

export type {
  RuleEngineDependencies
} from "./core/rule-engine.js";

export {
  RuleEngine
} from "./core/rule-engine.js";