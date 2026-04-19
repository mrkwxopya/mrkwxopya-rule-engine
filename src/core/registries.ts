import { RuleEngineError } from "./errors.js";
import type {
  ActionHandler,
  ActionRegistry,
  CustomOperator,
  OperatorRegistry
} from "./types.js";

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

export class InMemoryOperatorRegistry implements OperatorRegistry {
  readonly #operators = new Map<string, CustomOperator>();

  public register(name: string, operator: CustomOperator): void {
    if (!isNonEmptyString(name)) {
      throw new RuleEngineError({
        code: "ENGINE_INVALID_CONFIG",
        message: "Operator name must be a non-empty string."
      });
    }

    if (typeof operator !== "function") {
      throw new RuleEngineError({
        code: "ENGINE_INVALID_CONFIG",
        message: `Operator "${name}" must be a function.`
      });
    }

    this.#operators.set(name, operator);
  }

  public get(name: string): CustomOperator | undefined {
    return this.#operators.get(name);
  }

  public has(name: string): boolean {
    return this.#operators.has(name);
  }

  public list(): readonly string[] {
    return Object.freeze([...this.#operators.keys()]);
  }
}

export class InMemoryActionRegistry implements ActionRegistry {
  readonly #actions = new Map<string, ActionHandler>();

  public register(type: string, handler: ActionHandler): void {
    if (!isNonEmptyString(type)) {
      throw new RuleEngineError({
        code: "ENGINE_INVALID_CONFIG",
        message: "Action type must be a non-empty string."
      });
    }

    if (typeof handler !== "function") {
      throw new RuleEngineError({
        code: "ENGINE_INVALID_CONFIG",
        message: `Action handler "${type}" must be a function.`
      });
    }

    this.#actions.set(type, handler);
  }

  public get(type: string): ActionHandler | undefined {
    return this.#actions.get(type);
  }

  public has(type: string): boolean {
    return this.#actions.has(type);
  }

  public list(): readonly string[] {
    return Object.freeze([...this.#actions.keys()]);
  }
}