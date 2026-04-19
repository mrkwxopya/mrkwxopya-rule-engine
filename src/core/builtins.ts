import type { CustomOperator, EngineContext } from "./types.js";

const isNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};

const isString = (value: unknown): value is string => {
  return typeof value === "string";
};

const isArray = (value: unknown): value is readonly unknown[] => {
  return Array.isArray(value);
};

const eq: CustomOperator = (left, right) => left === right;
const neq: CustomOperator = (left, right) => left !== right;

const gt: CustomOperator = (left, right) => {
  return isNumber(left) && isNumber(right) && left > right;
};

const gte: CustomOperator = (left, right) => {
  return isNumber(left) && isNumber(right) && left >= right;
};

const lt: CustomOperator = (left, right) => {
  return isNumber(left) && isNumber(right) && left < right;
};

const lte: CustomOperator = (left, right) => {
  return isNumber(left) && isNumber(right) && left <= right;
};

const inOperator: CustomOperator = (left, right) => {
  return isArray(right) && right.includes(left);
};

const notInOperator: CustomOperator = (left, right) => {
  return isArray(right) && !right.includes(left);
};

const contains: CustomOperator = (left, right) => {
  if (isString(left) && isString(right)) {
    return left.includes(right);
  }

  if (isArray(left)) {
    return left.includes(right);
  }

  return false;
};

const startsWith: CustomOperator = (left, right) => {
  return isString(left) && isString(right) && left.startsWith(right);
};

const endsWith: CustomOperator = (left, right) => {
  return isString(left) && isString(right) && left.endsWith(right);
};

const matches: CustomOperator = (left, right) => {
  if (!isString(left)) {
    return false;
  }

  if (right instanceof RegExp) {
    return right.test(left);
  }

  if (isString(right)) {
    return new RegExp(right).test(left);
  }

  return false;
};

export const BUILTIN_OPERATORS: Readonly<Record<string, CustomOperator>> = Object.freeze({
  eq,
  neq,
  gt,
  gte,
  lt,
  lte,
  in: inOperator,
  not_in: notInOperator,
  contains,
  starts_with: startsWith,
  ends_with: endsWith,
  matches
});

export const registerBuiltinOperators = (
  register: (name: string, operator: CustomOperator) => void,
): void => {
  for (const [name, operator] of Object.entries(BUILTIN_OPERATORS)) {
    register(name, operator);
  }
};

// Keeps signature shape available for future operator families.
export const noopContextConsumer = (_context: EngineContext): void => {
  void _context;
};