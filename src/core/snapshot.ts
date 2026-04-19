import type {
  EngineEvaluationResult,
  EvaluationSnapshot,
  FactRecord,
  RuleDefinition
} from "./types.js";
import { nowIso } from "./utils.js";

export const createEvaluationSnapshot = <TFacts extends FactRecord>(
  engineName: string,
  environment: string,
  facts: TFacts,
  rules: readonly RuleDefinition[],
  result: EngineEvaluationResult,
): EvaluationSnapshot<TFacts> => {
  return {
    evaluationId: result.evaluationId,
    engineName,
    environment,
    facts,
    rules,
    result,
    createdAt: nowIso()
  };
};