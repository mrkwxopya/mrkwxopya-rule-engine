# mrkwxopya-rule-engine

A production-oriented TypeScript rule engine built for deterministic evaluation, governance, observability, extensibility, and long-term maintainability.

`mrkwxopya-rule-engine` is designed for applications that need more than simple `if/else` chains. It provides a structured runtime for defining rules, evaluating facts, executing actions, tracing outcomes, filtering by namespace or tenant, replaying decisions, and extending behavior through middleware, hooks, and plugins.

---

## Features

- Deterministic rule ordering
- Strong TypeScript-first API
- Nested fact-path evaluation
- Built-in comparison operators
- Custom operator registry
- Custom action registry
- Rule lifecycle validation
- Effective date support
- Namespace filtering
- Tenant filtering
- Preflight operator and action validation
- Evaluation trace output
- Audit hooks
- Metric hooks
- Middleware pipeline
- Plugin system
- Evaluation snapshots
- Replay support
- Batch evaluation
- Field indexing
- Compiled rule cache
- Basic in-memory throttling
- npm package ready
- Test harness ready

---

## Installation

```bash
npm install mrkwxopya-rule-engine
```
````

---

## Requirements

- Node.js 18+
- TypeScript 5+

---

## Quick Start

```ts
import { RuleEngine } from "mrkwxopya-rule-engine";

const engine = new RuleEngine({
  engineName: "game-engine",
  strictMode: true,
  enableTrace: true,
});

engine.registerAction("grant_bonus", async (payload, context) => {
  console.log("grant_bonus", payload, context.facts);
});

engine.registerRule({
  metadata: {
    id: "low-score-bonus",
    name: "Low Score Bonus",
    version: "1.0.0",
    enabled: true,
    priority: 100,
  },
  when: {
    type: "comparison",
    field: "player.score",
    operator: "lt",
    value: 10,
  },
  then: [
    {
      type: "grant_bonus",
      payload: { amount: 50 },
    },
  ],
});

const result = await engine.evaluate({
  facts: {
    player: {
      score: 5,
    },
  },
});

console.log(JSON.stringify(result, null, 2));
```

---

## Core Concepts

### Facts

Facts are the runtime input data passed into the engine during evaluation.

```ts
{
  player: {
    score: 5,
    streak: 3
  },
  game: {
    round: 2
  }
}
```

### Rules

Rules define:

- metadata
- condition tree
- `then` actions
- optional `else` actions

### Operators

Operators compare fact values against rule values.

Built-in operators:

- `eq`
- `neq`
- `gt`
- `gte`
- `lt`
- `lte`
- `in`
- `not_in`
- `contains`
- `starts_with`
- `ends_with`
- `matches`

### Actions

Actions are handlers executed when a rule matches or fails into its `else` branch.

### Trace

Each evaluation can return trace records for matched or skipped rules.

---

## Rule Shape

```ts
const rule = {
  metadata: {
    id: "low-score-bonus",
    name: "Low Score Bonus",
    version: "1.0.0",
    enabled: true,
    priority: 100,
  },
  when: {
    type: "comparison",
    field: "player.score",
    operator: "lt",
    value: 10,
  },
  then: [
    {
      type: "grant_bonus",
      payload: { amount: 50 },
    },
  ],
};
```

---

## Group Conditions

You can combine multiple conditions with `all` and `any`.

```ts
engine.registerRule({
  metadata: {
    id: "streak-fast-bonus",
    name: "Streak Fast Bonus",
    version: "1.0.0",
    enabled: true,
    priority: 200,
  },
  when: {
    type: "group",
    combinator: "all",
    conditions: [
      {
        type: "comparison",
        field: "player.streak",
        operator: "gte",
        value: 5,
      },
      {
        type: "comparison",
        field: "player.answerTime",
        operator: "lt",
        value: 10,
      },
    ],
  },
  then: [
    {
      type: "grant_bonus",
      payload: { amount: 100 },
    },
  ],
});
```

---

## Custom Operators

```ts
engine.registerOperator("between", (left, right) => {
  if (typeof left !== "number") return false;
  if (!Array.isArray(right) || right.length !== 2) return false;

  const [min, max] = right;

  return (
    typeof min === "number" &&
    typeof max === "number" &&
    left >= min &&
    left <= max
  );
});
```

Then use it in a rule:

```ts
engine.registerRule({
  metadata: {
    id: "mid-range-score",
    name: "Mid Range Score",
    version: "1.0.0",
    enabled: true,
    priority: 50,
  },
  when: {
    type: "comparison",
    field: "player.score",
    operator: "between",
    value: [10, 50],
  },
  then: [
    {
      type: "grant_bonus",
      payload: { amount: 20 },
    },
  ],
});
```

---

## Custom Actions

```ts
engine.registerAction("log_reward", async (payload, context) => {
  console.log("reward event", {
    payload,
    facts: context.facts,
    evaluationId: context.metadata.evaluationId,
  });
});
```

---

## Namespace and Tenant Filtering

Rules can be scoped with `namespace` and `tenantId`.

```ts
engine.registerRule({
  metadata: {
    id: "tenant-a-rule",
    name: "Tenant A Rule",
    version: "1.0.0",
    enabled: true,
    priority: 1,
    namespace: "game",
    tenantId: "tenant-a",
  },
  when: {
    type: "comparison",
    field: "score",
    operator: "lt",
    value: 10,
  },
  then: [{ type: "grant_bonus", payload: { amount: 5 } }],
});

const result = await engine.evaluate({
  facts: { score: 5 },
  namespace: "game",
  tenantId: "tenant-a",
});
```

---

## Rule Lifecycle

Rules support:

- `enabled`
- `effectiveFrom`
- `effectiveTo`

Example:

```ts
engine.registerRule({
  metadata: {
    id: "limited-event-rule",
    name: "Limited Event Rule",
    version: "1.0.0",
    enabled: true,
    priority: 10,
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: "2026-12-31T23:59:59.999Z",
  },
  when: {
    type: "comparison",
    field: "event.active",
    operator: "eq",
    value: true,
  },
  then: [{ type: "grant_bonus", payload: { amount: 25 } }],
});
```

---

## Strict Mode

When `strictMode` is enabled:

- missing operators throw
- missing actions throw
- action failures throw
- preflight validation is enforced before evaluation

```ts
const engine = new RuleEngine({
  engineName: "strict-engine",
  strictMode: true,
});
```

---

## Evaluation Result

`evaluate()` returns:

```ts
{
  (evaluationId, startedAt, finishedAt, durationMs, trace, results);
}
```

Example:

```ts
const result = await engine.evaluate({
  facts: {
    player: { score: 5 },
  },
});

console.log(result.trace);
console.log(result.results);
```

---

## Audit Hooks

Audit hooks let you observe engine lifecycle events.

Supported event types include:

- `evaluation_started`
- `evaluation_finished`
- `evaluation_failed`
- `rule_matched`
- `rule_skipped`

```ts
engine.addAuditListener(async (event) => {
  console.log("audit", event);
});
```

---

## Metric Hooks

Metric hooks let you consume internal engine metrics.

```ts
engine.addMetricListener(async (event) => {
  console.log("metric", event.name, event.value, event.tags);
});
```

---

## Middleware

Middleware can wrap the evaluation pipeline.

```ts
engine.useMiddleware(async (context, next) => {
  console.log("before evaluation", context.options);
  const result = await next();
  console.log("after evaluation", result.evaluationId);
  return result;
});
```

---

## Plugins

Plugins provide a clean extension surface.

```ts
import type { EnginePlugin } from "mrkwxopya-rule-engine";

const rewardPlugin: EnginePlugin = {
  name: "reward-plugin",
  setup(api) {
    api.registerAction("reward_user", async (payload) => {
      console.log("reward_user", payload);
    });

    api.addAuditListener(async (event) => {
      console.log("plugin audit", event.type);
    });
  },
};

engine.use(rewardPlugin);
```

---

## Snapshots

Snapshots capture an evaluation for inspection or replay workflows.

```ts
const facts = { value: 1 };
const result = await engine.evaluate({ facts });
const snapshot = engine.createSnapshot(facts, result);

console.log(snapshot);
```

---

## Replay

You can create replay records and re-run previous evaluations.

```ts
const facts = { value: 1 };
const result = await engine.evaluate({ facts });
const snapshot = engine.createSnapshot(facts, result);
const record = engine.createReplayRecord(facts, snapshot);

const replayed = await engine.replay(record);
console.log(replayed);
```

---

## Batch Evaluation

```ts
const batch = await engine.evaluateBatch([
  {
    id: "a",
    options: { facts: { value: 1 } },
  },
  {
    id: "b",
    options: { facts: { value: 2 } },
  },
]);

console.log(batch);
```

---

## Field Indexing

The engine builds a field index to reduce candidate rules for evaluation.

```ts
const index = engine.getFieldIndex();
console.log(index);
```

---

## Throttling

A simple in-memory throttle is included.

```ts
engine.checkThrottle("player-1", {
  maxCalls: 5,
  windowMs: 1000,
});
```

You can also use the exported throttle directly:

```ts
import { InMemoryThrottle } from "mrkwxopya-rule-engine";

const throttle = new InMemoryThrottle();

throttle.check("user-1", {
  maxCalls: 3,
  windowMs: 1000,
});
```

---

## Public API Highlights

Main exports include:

- `RuleEngine`
- `RuleStore`
- `compileRule`
- `CompiledRuleCache`
- `buildFieldIndex`
- `evaluateBatch`
- `createReplayRecord`
- `replayEvaluation`
- `InMemoryThrottle`
- `createEvaluationSnapshot`
- `validateRuleDefinition`
- `validateRuleLifecycle`
- `filterRules`

---

## Example: Game Scoring Engine

```ts
import { RuleEngine } from "mrkwxopya-rule-engine";

const engine = new RuleEngine({
  engineName: "scoring-engine",
  strictMode: true,
});

engine.registerAction("add_score", async (payload) => {
  console.log("score awarded", payload);
});

engine.registerRule({
  metadata: {
    id: "fast-answer-bonus",
    name: "Fast Answer Bonus",
    version: "1.0.0",
    enabled: true,
    priority: 100,
  },
  when: {
    type: "group",
    combinator: "all",
    conditions: [
      {
        type: "comparison",
        field: "player.correct",
        operator: "eq",
        value: true,
      },
      {
        type: "comparison",
        field: "player.answerTime",
        operator: "lt",
        value: 5,
      },
    ],
  },
  then: [
    {
      type: "add_score",
      payload: { amount: 50, reason: "fast_answer_bonus" },
    },
  ],
});
```

---

## Development

```bash
npm install
npm run typecheck
npm run test
npm run build
```

---

## Test Commands

```bash
npm run test
npm run test:watch
```

---

## Publish Checklist

Before publishing:

```bash
npm run typecheck
npm run test
npm run build
npm pack
```

Then publish:

```bash
npm publish
```

---

## Versioning Guidance

Suggested release flow:

- `0.1.x` for early public stabilization
- `0.2.x` for adapter and storage improvements
- `0.3.x` for schema and policy improvements
- `1.0.0` after API freeze and real-world validation

---

## Design Goals

- Deterministic execution
- Strong runtime safety
- Explicit extension boundaries
- Auditability
- Observability
- Testability
- Governance support
- Production-hardening friendly architecture

---

## Current Scope

This package is a strong production-grade rule engine foundation, but it is not a full business rule management suite.

It currently focuses on:

- runtime rule execution
- governance
- extension hooks
- observability
- replayability
- packaging discipline

Future enhancements can include:

- persistent audit adapters
- persistent snapshot stores
- bounded concurrent batch execution
- conflict resolution strategies
- JSON schema-based rule validation
- AST optimization
- benchmark tooling
- rule authoring DSL

---

## License

MIT

---

## Author

**mrkwxopya**
