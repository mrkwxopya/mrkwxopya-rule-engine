export type RuleLifecycleStatus =
  | "draft"
  | "published"
  | "deprecated"
  | "disabled";

export interface RuleMetadata {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly version: string;
  readonly tags?: readonly string[];
  readonly namespace?: string;
  readonly tenantId?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly enabled: boolean;
  readonly priority: number;
  readonly effectiveFrom?: string;
  readonly effectiveTo?: string;
  readonly status?: RuleLifecycleStatus;
}

export interface EngineMetadata {
  readonly name: string;
  readonly version: string;
  readonly environment?: "development" | "staging" | "production" | string;
}

export interface EvaluationMetadata {
  readonly evaluationId: string;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly requestId?: string;
  readonly timestamp: string;
}