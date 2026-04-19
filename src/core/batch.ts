import type {
  BatchEvaluationItem,
  BatchEvaluationResult,
  EngineEvaluateOptions,
  EngineEvaluationResult,
  FactRecord
} from "./types.js";

export interface BatchCapableEngine {
  evaluate<TFacts extends FactRecord>(
    options: EngineEvaluateOptions<TFacts>,
  ): Promise<EngineEvaluationResult>;
}

export const evaluateBatch = async <TFacts extends FactRecord>(
  engine: BatchCapableEngine,
  items: readonly BatchEvaluationItem<TFacts>[],
): Promise<readonly BatchEvaluationResult[]> => {
  const results: BatchEvaluationResult[] = [];

  for (const item of items) {
    const result = await engine.evaluate(item.options);
    results.push({
      id: item.id,
      result
    });
  }

  return Object.freeze(results);
};