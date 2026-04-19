import type { EvaluationMetadata, RuleMetadata } from "./metadata.js";

export type Primitive = string | number | boolean | bigint | symbol | null | undefined;

export type FactValue =
  | Primitive
  | readonly Primitive[]
  | Record<string, unknown>
  | readonly Record<string, unknown>[];

export type FactRecord = Record<string, FactValue>;

export interface EngineContext<TFacts extends FactRecord = FactRecord> {
  readonly facts: TFacts;
  readonly metadata: EvaluationMetadata;
}

export type ComparisonOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "not_in"
  | "contains"
  | "starts_with"
  | "ends_with"
  | "matches";

export interface ConditionNodeBase {
  readonly id?: string;
  readonly not?: boolean;
}

export interface ComparisonCondition extends ConditionNodeBase {
  readonly type: "comparison";
  readonly field: string;
  readonly operator: ComparisonOperator | string;
  readonly value: unknown;
}

export interface GroupCondition extends ConditionNodeBase {
  readonly type: "group";
  readonly combinator: "all" | "any";
  readonly conditions: readonly ConditionNode[];
}

export type ConditionNode = ComparisonCondition | GroupCondition;

export interface ActionDefinition<TPayload = unknown> {
  readonly type: string;
  readonly payload?: TPayload;
}

export interface RuleDefinition<TPayload = unknown> {
  readonly metadata: RuleMetadata;
  readonly when: ConditionNode;
  readonly then: readonly ActionDefinition<TPayload>[];
  readonly else?: readonly ActionDefinition<TPayload>[];
}

export interface EvaluationTraceItem {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly matched: boolean;
  readonly skipped: boolean;
  readonly reason?: string;
  readonly durationMs: number;
}

export interface ActionExecutionResult {
  readonly actionType: string;
  readonly success: boolean;
  readonly durationMs: number;
  readonly error?: string;
}

export interface RuleExecutionResult {
  readonly ruleId: string;
  readonly matched: boolean;
  readonly actions: readonly ActionExecutionResult[];
}

export interface EngineEvaluationResult {
  readonly evaluationId: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly trace: readonly EvaluationTraceItem[];
  readonly results: readonly RuleExecutionResult[];
}

export interface EngineConfig {
  readonly engineName: string;
  readonly environment?: "development" | "staging" | "production" | string;
  readonly timeoutMs?: number;
  readonly maxRules?: number;
  readonly strictMode?: boolean;
  readonly enableTrace?: boolean;
  readonly freezeFacts?: boolean;
}

export type CustomOperator = (
  left: unknown,
  right: unknown,
  context: EngineContext,
) => boolean;

export type ActionHandler<TPayload = unknown> = (
  payload: TPayload | undefined,
  context: EngineContext<FactRecord>,
) => Promise<void> | void;

export interface OperatorRegistry {
  register(name: string, operator: CustomOperator): void;
  get(name: string): CustomOperator | undefined;
  has(name: string): boolean;
  list(): readonly string[];
}

export interface ActionRegistry {
  register(type: string, handler: ActionHandler): void;
  get(type: string): ActionHandler | undefined;
  has(type: string): boolean;
  list(): readonly string[];
}

export interface EvaluatorDependencies {
  readonly operators: OperatorRegistry;
  readonly actions: ActionRegistry;
  readonly strictMode: boolean;
  readonly timeoutMs: number;
  readonly enableTrace: boolean;
}

export interface EvaluatorOptions<TFacts extends FactRecord = FactRecord> {
  readonly facts: TFacts;
  readonly metadata?: Partial<EvaluationMetadata>;
}

export interface ConditionEvaluationResult {
  readonly matched: boolean;
}

export interface RuleEvaluationUnitResult {
  readonly trace: EvaluationTraceItem;
  readonly result: RuleExecutionResult;
}

export interface EngineEvaluateOptions<TFacts extends FactRecord = FactRecord>
  extends EvaluatorOptions<TFacts> {
  readonly namespace?: string;
  readonly tenantId?: string;
}

export interface EvaluationSnapshot<TFacts extends FactRecord = FactRecord> {
  readonly evaluationId: string;
  readonly engineName: string;
  readonly environment: string;
  readonly facts: TFacts;
  readonly rules: readonly RuleDefinition[];
  readonly result: EngineEvaluationResult;
  readonly createdAt: string;
}

export interface AuditEventBase {
  readonly timestamp: string;
  readonly evaluationId?: string;
}

export interface EvaluationStartedAuditEvent extends AuditEventBase {
  readonly type: "evaluation_started";
  readonly ruleCount: number;
}

export interface EvaluationFinishedAuditEvent extends AuditEventBase {
  readonly type: "evaluation_finished";
  readonly durationMs: number;
}

export interface EvaluationFailedAuditEvent extends AuditEventBase {
  readonly type: "evaluation_failed";
  readonly errorMessage: string;
}

export interface RuleMatchedAuditEvent extends AuditEventBase {
  readonly type: "rule_matched";
  readonly ruleId: string;
  readonly ruleName: string;
}

export interface RuleSkippedAuditEvent extends AuditEventBase {
  readonly type: "rule_skipped";
  readonly ruleId: string;
  readonly ruleName: string;
  readonly reason?: string;
}

export type AuditEvent =
  | EvaluationStartedAuditEvent
  | EvaluationFinishedAuditEvent
  | EvaluationFailedAuditEvent
  | RuleMatchedAuditEvent
  | RuleSkippedAuditEvent;

export type AuditListener = (event: AuditEvent) => Promise<void> | void;

export interface MetricEvent {
  readonly name: string;
  readonly value: number;
  readonly timestamp: string;
  readonly tags?: Readonly<Record<string, string>>;
}

export type MetricListener = (event: MetricEvent) => Promise<void> | void;

export interface PipelineContext<TFacts extends FactRecord = FactRecord> {
  readonly options: EngineEvaluateOptions<TFacts>;
}

export type EvaluationMiddleware<TFacts extends FactRecord = FactRecord> = (
  context: PipelineContext<TFacts>,
  next: () => Promise<EngineEvaluationResult>,
) => Promise<EngineEvaluationResult>;

export interface EnginePlugin {
  readonly name: string;
  setup(engine: EnginePluginApi): void;
}

export interface EnginePluginApi {
  registerOperator(name: string, operator: CustomOperator): void;
  registerAction(type: string, handler: ActionHandler): void;
  addAuditListener(listener: AuditListener): void;
  addMetricListener(listener: MetricListener): void;
}

export type CompiledConditionEvaluator = (
  context: EngineContext,
  dependencies: EvaluatorDependencies,
  startedAt: number,
) => ConditionEvaluationResult;

export interface CompiledRule {
  readonly ruleId: string;
  readonly version: string;
  readonly evaluate: CompiledConditionEvaluator;
}

export interface BatchEvaluationItem<TFacts extends FactRecord = FactRecord> {
  readonly id: string;
  readonly options: EngineEvaluateOptions<TFacts>;
}

export interface BatchEvaluationResult {
  readonly id: string;
  readonly result: EngineEvaluationResult;
}

export interface ReplayRecord<TFacts extends FactRecord = FactRecord> {
  readonly facts: TFacts;
  readonly snapshot: EvaluationSnapshot<TFacts>;
}

export interface ThrottlePolicy {
  readonly maxCalls: number;
  readonly windowMs: number;
}

export interface FieldIndex {
  readonly [field: string]: readonly string[];
}