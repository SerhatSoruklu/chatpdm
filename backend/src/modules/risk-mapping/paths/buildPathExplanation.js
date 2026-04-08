'use strict';

/**
 * @param {{
 *   pathId: string,
 *   threatId: string,
 *   targetNodeId: string,
 *   compatibilityRuleId: string,
 *   falsifierIds: readonly string[],
 * }} input
 * @returns {{
 *   pathId: string,
 *   threatId: string,
 *   targetNodeId: string,
 *   compatibilityRuleId: string,
 *   falsifierIds: readonly string[],
 * }}
 */
function buildPathExplanation(input) {
  return Object.freeze({
    pathId: input.pathId,
    threatId: input.threatId,
    targetNodeId: input.targetNodeId,
    compatibilityRuleId: input.compatibilityRuleId,
    falsifierIds: Object.freeze([...input.falsifierIds]),
  });
}

module.exports = Object.freeze({
  buildPathExplanation,
});
