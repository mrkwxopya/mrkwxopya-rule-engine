import type { EngineConfig } from "./types.js";

export interface NormalizedEngineConfig {
  readonly engineName: string;
  readonly environment: string;
  readonly timeoutMs: number;
  readonly maxRules: number;
  readonly strictMode: boolean;
  readonly enableTrace: boolean;
  readonly freezeFacts: boolean;
}

export const DEFAULT_ENGINE_CONFIG: Readonly<NormalizedEngineConfig> = {
  engineName: "mrkwxopya-rule-engine",
  environment: "development",
  timeoutMs: 5_000,
  maxRules: 10_000,
  strictMode: true,
  enableTrace: true,
  freezeFacts: false
};

export const normalizeEngineConfig = (
  config: EngineConfig,
): NormalizedEngineConfig => {
  return {
    engineName: config.engineName,
    environment: config.environment ?? DEFAULT_ENGINE_CONFIG.environment,
    timeoutMs: config.timeoutMs ?? DEFAULT_ENGINE_CONFIG.timeoutMs,
    maxRules: config.maxRules ?? DEFAULT_ENGINE_CONFIG.maxRules,
    strictMode: config.strictMode ?? DEFAULT_ENGINE_CONFIG.strictMode,
    enableTrace: config.enableTrace ?? DEFAULT_ENGINE_CONFIG.enableTrace,
    freezeFacts: config.freezeFacts ?? DEFAULT_ENGINE_CONFIG.freezeFacts
  };
};