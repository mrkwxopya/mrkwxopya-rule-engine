import type {
  EngineEvaluateOptions,
  EngineEvaluationResult,
  EvaluationSnapshot,
  FactRecord,
  ReplayRecord
} from "./types.js";

export interface ReplayCapableEngine {
  evaluate<TFacts extends FactRecord>(
    options: EngineEvaluateOptions<TFacts>,
  ): Promise<EngineEvaluationResult>;
}

export const replayEvaluation = async <TFacts extends FactRecord>(
  engine: ReplayCapableEngine,
  record: ReplayRecord<TFacts>,
): Promise<EngineEvaluationResult> => {
  return engine.evaluate({
    facts: record.facts,
    metadata: {
      evaluationId: record.snapshot.evaluationId,
      timestamp: record.snapshot.createdAt
    }
  });
};

export const createReplayRecord = <TFacts extends FactRecord>(
  facts: TFacts,
  snapshot: EvaluationSnapshot<TFacts>,
): ReplayRecord<TFacts> => {
  return {
    facts,
    snapshot
  };
};