export type RuleEngineErrorCode =
  | "ENGINE_INVALID_CONFIG"
  | "ENGINE_INVALID_RULE"
  | "ENGINE_DUPLICATE_RULE_ID"
  | "ENGINE_RULE_NOT_FOUND"
  | "ENGINE_OPERATOR_NOT_FOUND"
  | "ENGINE_ACTION_NOT_FOUND"
  | "ENGINE_CONTEXT_VALIDATION_FAILED"
  | "ENGINE_EXECUTION_TIMEOUT"
  | "ENGINE_EXECUTION_ABORTED"
  | "ENGINE_COMPILATION_FAILED"
  | "ENGINE_EVALUATION_FAILED"
  | "ENGINE_CONFLICT_DETECTED"
  | "ENGINE_UNSUPPORTED_OPERATION";

export interface RuleEngineErrorDetails {
  readonly code: RuleEngineErrorCode;
  readonly message: string;
  readonly cause?: unknown;
  readonly metadata?: Record<string, unknown>;
}

export class RuleEngineError extends Error {
  public readonly code: RuleEngineErrorCode;
  public readonly metadata?: Record<string, unknown>;

  public constructor(details: RuleEngineErrorDetails) {
    super(details.message);

    this.name = "RuleEngineError";
    this.code = details.code;

    if (details.metadata !== undefined) {
      this.metadata = details.metadata;
    }

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const isRuleEngineError = (value: unknown): value is RuleEngineError => {
  return value instanceof RuleEngineError;
};