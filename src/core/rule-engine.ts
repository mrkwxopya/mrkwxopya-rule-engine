import type {
  ActionHandler,
  ActionRegistry,
  AuditListener,
  CustomOperator,
  EngineConfig,
  EngineEvaluateOptions,
  EngineEvaluationResult,
  EnginePlugin,
  EnginePluginApi,
  EvaluationMiddleware,
  EvaluationSnapshot,
  FactRecord,
  FieldIndex,
  MetricListener,
  OperatorRegistry,
  RuleDefinition,
  ThrottlePolicy
} from "./types.js";
import type { NormalizedEngineConfig } from "./defaults.js";
import { getValidatedAndNormalizedConfig, validateRuleCollectionSize, validateRuleDefinition } from "./validators.js";
import { InMemoryActionRegistry, InMemoryOperatorRegistry } from "./registries.js";
import { RuleStore } from "./rule-store.js";
import { registerBuiltinOperators } from "./builtins.js";
import { evaluateRules } from "./evaluator.js";
import { isRuleActive, validateRuleLifecycle } from "./governance.js";
import { filterRules } from "./filters.js";
import { preflightValidateRules } from "./preflight.js";
import { AuditHookRegistry, MetricHookRegistry } from "./hooks.js";
import { composeEvaluationMiddleware } from "./pipeline.js";
import { createEvaluationSnapshot } from "./snapshot.js";
import { PluginManager } from "./plugins.js";
import { nowIso } from "./utils.js";
import { buildFieldIndex, findCandidateRuleIdsByFacts } from "./indexer.js";
import { evaluateBatch } from "./batch.js";
import { createReplayRecord, replayEvaluation } from "./replay.js";
import { InMemoryThrottle } from "./throttle.js";
import { CompiledRuleCache } from "./compiler.js";

export interface RuleEngineDependencies {
  readonly operators?: OperatorRegistry;
  readonly actions?: ActionRegistry;
}

export class RuleEngine {
  readonly #config: NormalizedEngineConfig;
  readonly #operators: OperatorRegistry;
  readonly #actions: ActionRegistry;
  readonly #ruleStore: RuleStore;
  readonly #auditHooks: AuditHookRegistry;
  readonly #metricHooks: MetricHookRegistry;
  readonly #middlewares: EvaluationMiddleware[];
  readonly #pluginManager: PluginManager;
  readonly #throttle: InMemoryThrottle;
  readonly #compiledCache: CompiledRuleCache;
  #fieldIndex: FieldIndex;

  public constructor(config: EngineConfig, dependencies?: RuleEngineDependencies) {
    this.#config = getValidatedAndNormalizedConfig(config);
    this.#operators = dependencies?.operators ?? new InMemoryOperatorRegistry();
    this.#actions = dependencies?.actions ?? new InMemoryActionRegistry();
    this.#ruleStore = new RuleStore();
    this.#auditHooks = new AuditHookRegistry();
    this.#metricHooks = new MetricHookRegistry();
    this.#middlewares = [];
    this.#pluginManager = new PluginManager();
    this.#throttle = new InMemoryThrottle();
    this.#compiledCache = new CompiledRuleCache();
    this.#fieldIndex = Object.freeze({});

    registerBuiltinOperators((name, operator) => {
      if (!this.#operators.has(name)) {
        this.#operators.register(name, operator);
      }
    });
  }

  public getConfig(): Readonly<NormalizedEngineConfig> {
    return this.#config;
  }

  public registerRule(rule: RuleDefinition): this {
    validateRuleLifecycle(rule);
    validateRuleDefinition(rule);
    validateRuleCollectionSize(this.#ruleStore.size(), 1, this.#config.maxRules);
    this.#ruleStore.add(rule);
    this.#compiledCache.get(rule);
    this.#rebuildIndexes();
    return this;
  }

  public registerRules(rules: readonly RuleDefinition[]): this {
    validateRuleCollectionSize(this.#ruleStore.size(), rules.length, this.#config.maxRules);

    for (const rule of rules) {
      validateRuleLifecycle(rule);
      validateRuleDefinition(rule);
    }

    this.#ruleStore.addMany(rules);

    for (const rule of rules) {
      this.#compiledCache.get(rule);
    }

    this.#rebuildIndexes();
    return this;
  }

  public removeRule(ruleId: string): boolean {
    const removed = this.#ruleStore.remove(ruleId);

    if (removed) {
      this.#rebuildIndexes();
    }

    return removed;
  }

  public clearRules(): this {
    this.#ruleStore.clear();
    this.#compiledCache.clear();
    this.#rebuildIndexes();
    return this;
  }

  public getRule(ruleId: string): RuleDefinition | undefined {
    return this.#ruleStore.get(ruleId);
  }

  public hasRule(ruleId: string): boolean {
    return this.#ruleStore.has(ruleId);
  }

  public getRules(): readonly RuleDefinition[] {
    return this.#ruleStore.list();
  }

  public getRuleCount(): number {
    return this.#ruleStore.size();
  }

  public getFieldIndex(): FieldIndex {
    return this.#fieldIndex;
  }

  public registerOperator(name: string, operator: CustomOperator): this {
    this.#operators.register(name, operator);
    return this;
  }

  public hasOperator(name: string): boolean {
    return this.#operators.has(name);
  }

  public getOperator(name: string): CustomOperator | undefined {
    return this.#operators.get(name);
  }

  public listOperators(): readonly string[] {
    return this.#operators.list();
  }

  public registerAction(type: string, handler: ActionHandler): this {
    this.#actions.register(type, handler);
    return this;
  }

  public hasAction(type: string): boolean {
    return this.#actions.has(type);
  }

  public getAction(type: string): ActionHandler | undefined {
    return this.#actions.get(type);
  }

  public listActions(): readonly string[] {
    return this.#actions.list();
  }

  public addAuditListener(listener: AuditListener): this {
    this.#auditHooks.add(listener);
    return this;
  }

  public removeAuditListener(listener: AuditListener): boolean {
    return this.#auditHooks.remove(listener);
  }

  public listAuditListeners(): readonly AuditListener[] {
    return this.#auditHooks.list();
  }

  public addMetricListener(listener: MetricListener): this {
    this.#metricHooks.add(listener);
    return this;
  }

  public removeMetricListener(listener: MetricListener): boolean {
    return this.#metricHooks.remove(listener);
  }

  public listMetricListeners(): readonly MetricListener[] {
    return this.#metricHooks.list();
  }

  public useMiddleware<TFacts extends FactRecord>(middleware: EvaluationMiddleware<TFacts>): this {
    this.#middlewares.push(middleware as EvaluationMiddleware);
    return this;
  }

  public listMiddlewares(): readonly EvaluationMiddleware[] {
    return Object.freeze([...this.#middlewares]);
  }

  public use(plugin: EnginePlugin): this {
    const api: EnginePluginApi = {
      registerOperator: (name, operator) => {
        this.registerOperator(name, operator);
      },
      registerAction: (type, handler) => {
        this.registerAction(type, handler);
      },
      addAuditListener: (listener) => {
        this.addAuditListener(listener);
      },
      addMetricListener: (listener) => {
        this.addMetricListener(listener);
      }
    };

    this.#pluginManager.use(plugin, api);
    return this;
  }

  public hasPlugin(name: string): boolean {
    return this.#pluginManager.has(name);
  }

  public listPlugins(): readonly string[] {
    return this.#pluginManager.list();
  }

  public createSnapshot<TFacts extends FactRecord>(
    facts: TFacts,
    result: EngineEvaluationResult,
    rules?: readonly RuleDefinition[],
  ): EvaluationSnapshot<TFacts> {
    return createEvaluationSnapshot(
      this.#config.engineName,
      this.#config.environment,
      facts,
      rules ?? this.#ruleStore.list(),
      result,
    );
  }

  public createReplayRecord<TFacts extends FactRecord>(
    facts: TFacts,
    snapshot: EvaluationSnapshot<TFacts>,
  ) {
    return createReplayRecord(facts, snapshot);
  }

  public async replay<TFacts extends FactRecord>(
    record: ReturnType<typeof createReplayRecord<TFacts>>,
  ): Promise<EngineEvaluationResult> {
    return replayEvaluation(this, record);
  }

  public checkThrottle(key: string, policy: ThrottlePolicy): void {
    this.#throttle.check(key, policy);
  }

  public async evaluateBatch<TFacts extends FactRecord>(
    items: readonly {
      readonly id: string;
      readonly options: EngineEvaluateOptions<TFacts>;
    }[],
  ) {
    return evaluateBatch(this, items);
  }

  public async evaluate<TFacts extends FactRecord>(
    options: EngineEvaluateOptions<TFacts>,
  ): Promise<EngineEvaluationResult> {
    const now = new Date();

    let rules = this.#ruleStore.list();

    const filterContext = {
      ...(options.namespace !== undefined ? { namespace: options.namespace } : {}),
      ...(options.tenantId !== undefined ? { tenantId: options.tenantId } : {})
    };

    rules = filterRules(rules, filterContext);
    rules = rules.filter((rule) => isRuleActive(rule, now));

    const candidateRuleIds = findCandidateRuleIdsByFacts(
      this.#fieldIndex,
      options.facts as Record<string, unknown>,
    );

    if (candidateRuleIds.length > 0) {
      const candidateSet = new Set(candidateRuleIds);
      rules = rules.filter((rule) => candidateSet.has(rule.metadata.id));
    }

    if (this.#config.strictMode) {
      preflightValidateRules(rules, this.#operators, this.#actions);
    }

    const emitStartedAt = nowIso();

    const terminal = async (): Promise<EngineEvaluationResult> => {
      try {
        await this.#auditHooks.emit({
          type: "evaluation_started",
          timestamp: emitStartedAt,
          ruleCount: rules.length
        });

        const result = await evaluateRules(
          rules,
          options,
          {
            operators: this.#operators,
            actions: this.#actions,
            strictMode: this.#config.strictMode,
            timeoutMs: this.#config.timeoutMs,
            enableTrace: this.#config.enableTrace
          },
          this.#config.freezeFacts,
        );

        for (const traceItem of result.trace) {
          if (traceItem.matched) {
            await this.#auditHooks.emit({
              type: "rule_matched",
              timestamp: nowIso(),
              evaluationId: result.evaluationId,
              ruleId: traceItem.ruleId,
              ruleName: traceItem.ruleName
            });
          } else if (traceItem.skipped) {
            await this.#auditHooks.emit({
              type: "rule_skipped",
              timestamp: nowIso(),
              evaluationId: result.evaluationId,
              ruleId: traceItem.ruleId,
              ruleName: traceItem.ruleName,
              ...(traceItem.reason !== undefined ? { reason: traceItem.reason } : {})
            });
          }
        }

        await this.#auditHooks.emit({
          type: "evaluation_finished",
          timestamp: nowIso(),
          evaluationId: result.evaluationId,
          durationMs: result.durationMs
        });

        await this.#metricHooks.emit({
          name: "engine_evaluation_duration_ms",
          value: result.durationMs,
          timestamp: nowIso(),
          tags: Object.freeze({
            engine: this.#config.engineName,
            environment: this.#config.environment
          })
        });

        await this.#metricHooks.emit({
          name: "engine_rule_count",
          value: rules.length,
          timestamp: nowIso(),
          tags: Object.freeze({
            engine: this.#config.engineName,
            environment: this.#config.environment
          })
        });

        return result;
      } catch (error) {
        await this.#auditHooks.emit({
          type: "evaluation_failed",
          timestamp: nowIso(),
          errorMessage: error instanceof Error ? error.message : "Unknown evaluation error."
        });

        throw error;
      }
    };

    return composeEvaluationMiddleware(
      this.#middlewares as readonly EvaluationMiddleware<TFacts>[],
      terminal,
      { options }
    );
  }

  #rebuildIndexes(): void {
    this.#fieldIndex = buildFieldIndex(this.#ruleStore.list());
  }
}