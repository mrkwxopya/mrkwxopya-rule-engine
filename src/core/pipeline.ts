import type {
  EngineEvaluationResult,
  EvaluationMiddleware,
  FactRecord,
  PipelineContext
} from "./types.js";

export const composeEvaluationMiddleware = <TFacts extends FactRecord>(
  middlewares: readonly EvaluationMiddleware<TFacts>[],
  terminal: () => Promise<EngineEvaluationResult>,
  context: PipelineContext<TFacts>,
): Promise<EngineEvaluationResult> => {
  let index = -1;

  const dispatch = async (currentIndex: number): Promise<EngineEvaluationResult> => {
    if (currentIndex <= index) {
      throw new Error("Middleware next() called multiple times.");
    }

    index = currentIndex;

    const middleware = middlewares[currentIndex];

    if (middleware === undefined) {
      return terminal();
    }

    return middleware(context, () => dispatch(currentIndex + 1));
  };

  return dispatch(0);
};