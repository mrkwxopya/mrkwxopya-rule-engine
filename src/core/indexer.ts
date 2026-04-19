import type { ConditionNode, FieldIndex, RuleDefinition } from "./types.js";

const collectFields = (node: ConditionNode, bucket: Set<string>): void => {
  if (node.type === "comparison") {
    bucket.add(node.field);
    return;
  }

  for (const nested of node.conditions) {
    collectFields(nested, bucket);
  }
};

export const buildFieldIndex = (rules: readonly RuleDefinition[]): FieldIndex => {
  const map = new Map<string, string[]>();

  for (const rule of rules) {
    const fields = new Set<string>();
    collectFields(rule.when, fields);

    for (const field of fields) {
      const list = map.get(field) ?? [];
      list.push(rule.metadata.id);
      map.set(field, list);
    }
  }

  const output: Record<string, readonly string[]> = {};

  for (const [field, ids] of map.entries()) {
    output[field] = Object.freeze([...ids].sort((a, b) => a.localeCompare(b)));
  }

  return Object.freeze(output);
};

export const findCandidateRuleIdsByFacts = (
  index: FieldIndex,
  facts: Record<string, unknown>,
): readonly string[] => {
  const matched = new Set<string>();

  for (const key of Object.keys(index)) {
    const topLevelField = key.split(".")[0];

    if (topLevelField !== undefined && topLevelField in facts) {
      for (const ruleId of index[key] ?? []) {
        matched.add(ruleId);
      }
    }
  }

  return Object.freeze([...matched]);
};