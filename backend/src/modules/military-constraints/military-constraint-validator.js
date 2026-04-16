'use strict';

const {
  MILITARY_CONSTRAINT_REASON_CODES,
} = require('./military-constraint-reason-codes');
const {
  isLocatorBoundToSource,
  isNonEmptyString,
  isReviewedClauseProvenance,
} = require('./reference-pack-utils');

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function freezeResult(result) {
  return Object.freeze({
    ...result,
    errors: Object.freeze([...result.errors]),
  });
}

function makeResult() {
  return {
    valid: true,
    reasonCode: null,
    errors: [],
  };
}

function fail(result, reasonCode, message) {
  result.valid = false;
  if (result.reasonCode === null) {
    result.reasonCode = reasonCode;
  }
  result.errors.push(message);
}

function finish(result) {
  return freezeResult(result);
}

function sortStrings(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function sortObjectKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const ordered = {};
  Object.keys(value).sort().forEach((key) => {
    ordered[key] = sortObjectKeys(value[key]);
  });
  return ordered;
}

function canonicalJSONStringify(value) {
  return JSON.stringify(sortObjectKeys(value));
}

function canonicalBundlePayload(bundle) {
  const clone = cloneJson(bundle);
  delete clone.bundleHash;
  delete clone.compiledAt;
  return sortObjectKeys(clone);
}

function computeBundleHash(bundle) {
  const crypto = require('node:crypto');
  const canonicalJson = canonicalJSONStringify(canonicalBundlePayload(bundle));
  return `sha256:${crypto.createHash('sha256').update(canonicalJson, 'utf8').digest('hex')}`;
}

function getSchemaType(node) {
  if (!isPlainObject(node)) {
    return null;
  }

  if (node.format === 'date-time') {
    return 'timestamp';
  }

  const rawType = node.type;

  if (Array.isArray(rawType)) {
    if (rawType.includes('integer') || rawType.includes('number')) {
      return 'number';
    }
    if (rawType.includes('boolean')) {
      return 'boolean';
    }
    if (rawType.includes('string')) {
      return node.enum ? 'enum-string' : 'string';
    }
    if (rawType.includes('array')) {
      return 'array';
    }
    return null;
  }

  if (rawType === 'integer' || rawType === 'number') {
    return 'number';
  }

  if (rawType === 'boolean') {
    return 'boolean';
  }

  if (rawType === 'string') {
    return node.enum ? 'enum-string' : 'string';
  }

  if (rawType === 'array') {
    return 'array';
  }

  return null;
}

function collectFactCatalog(schema, prefix, catalog) {
  if (!isPlainObject(schema)) {
    return;
  }

  if (schema.type === 'object' && isPlainObject(schema.properties)) {
    Object.keys(schema.properties).forEach((key) => {
      collectFactCatalog(schema.properties[key], prefix.concat(key), catalog);
    });
    return;
  }

  const path = prefix.join('.');
  if (path) {
    const kind = getSchemaType(schema);
    if (kind !== null) {
      catalog.set(path, {
        kind,
        schema,
      });
    }
  }

  if (schema.type === 'array' && isPlainObject(schema.items)) {
    const itemKind = getSchemaType(schema.items);
    catalog.set(path, {
      kind: 'array',
      itemKind,
      schema,
    });
  }
}

function buildFactCatalog(factSchema) {
  const catalog = new Map();
  collectFactCatalog(factSchema, [], catalog);
  return catalog;
}

function getOperandKind(operand, factCatalog) {
  if (!isPlainObject(operand)) {
    return { kind: 'unknown' };
  }

  if (typeof operand.fact === 'string') {
    const factInfo = factCatalog.get(operand.fact);
    if (!factInfo) {
      return { kind: 'unknown-fact', path: operand.fact };
    }
    return { kind: factInfo.kind, path: operand.fact, factInfo };
  }

  if (Object.prototype.hasOwnProperty.call(operand, 'value')) {
    const value = operand.value;
    if (Array.isArray(value)) {
      return { kind: 'array', value };
    }
    if (value === null) {
      return { kind: 'null', value };
    }
    if (typeof value === 'boolean') {
      return { kind: 'boolean', value };
    }
    if (typeof value === 'number') {
      return { kind: 'number', value };
    }
    if (typeof value === 'string') {
      return Number.isNaN(Date.parse(value))
        ? { kind: 'string', value }
        : { kind: 'timestamp', value };
    }
  }

  return { kind: 'unknown' };
}

function isNumericKind(kind) {
  return kind === 'number';
}

function isTimestampKind(kind) {
  return kind === 'timestamp';
}

function isScalarKind(kind) {
  return kind === 'boolean'
    || kind === 'string'
    || kind === 'enum-string'
    || kind === 'number'
    || kind === 'timestamp'
    || kind === 'null';
}

function areEqCompatible(left, right) {
  if (left.kind === 'unknown' || right.kind === 'unknown') {
    return false;
  }

  if (left.kind === 'unknown-fact' || right.kind === 'unknown-fact') {
    return false;
  }

  if (left.kind === 'array' || right.kind === 'array') {
    if (left.kind !== 'array' || right.kind !== 'array') {
      return false;
    }
    const leftItemKind = left.factInfo ? left.factInfo.itemKind : null;
    const rightItemKind = right.factInfo ? right.factInfo.itemKind : null;
    return leftItemKind !== null
      && rightItemKind !== null
      && leftItemKind === rightItemKind;
  }

  if (left.kind === 'timestamp' || right.kind === 'timestamp') {
    return left.kind === 'timestamp' && right.kind === 'timestamp';
  }

  if (isNumericKind(left.kind) || isNumericKind(right.kind)) {
    return isNumericKind(left.kind) && isNumericKind(right.kind);
  }

  if (left.kind === 'boolean' || right.kind === 'boolean') {
    return left.kind === 'boolean' && right.kind === 'boolean';
  }

  if (left.kind === 'string' || left.kind === 'enum-string'
    || right.kind === 'string' || right.kind === 'enum-string') {
    return (left.kind === 'string' || left.kind === 'enum-string')
      && (right.kind === 'string' || right.kind === 'enum-string');
  }

  return false;
}

function isComparisonCompatible(kind) {
  return isNumericKind(kind) || isTimestampKind(kind);
}

function isArrayOperandKind(kind) {
  return kind === 'array';
}

function getRuleScopeSignature(scope) {
  const ordered = {
    actionKinds: sortStrings(scope.actionKinds || []),
    domains: sortStrings(scope.domains || []),
    jurisdiction: scope.jurisdiction,
    missionTypes: sortStrings(scope.missionTypes || []),
  };
  return canonicalJSONStringify(ordered);
}

function normalizePredicate(node) {
  if (!isPlainObject(node)) {
    return node;
  }

  if (Array.isArray(node.all)) {
    return {
      all: sortStrings(node.all.map((entry) => canonicalJSONStringify(normalizePredicate(entry)))),
    };
  }

  if (Array.isArray(node.any)) {
    return {
      any: sortStrings(node.any.map((entry) => canonicalJSONStringify(normalizePredicate(entry)))),
    };
  }

  if (Object.prototype.hasOwnProperty.call(node, 'not')) {
    return {
      not: canonicalJSONStringify(normalizePredicate(node.not)),
    };
  }

  const keys = Object.keys(node);
  if (keys.length === 0) {
    return node;
  }

  const operator = keys[0];
  const value = node[operator];
  if (Array.isArray(value)) {
    return {
      [operator]: value.map((entry) => normalizePredicate(entry)),
    };
  }

  return node;
}

function getRuleSemanticSignature(rule) {
  return canonicalJSONStringify(sortObjectKeys({
    authority: {
      delegationEdgeIds: sortStrings((rule.authority && rule.authority.delegationEdgeIds) || []),
      minimumLevelId: rule.authority && rule.authority.minimumLevelId,
      requiresExplicitDelegation: Boolean(rule.authority && rule.authority.requiresExplicitDelegation),
    },
    effect: rule.effect,
    predicate: normalizePredicate(rule.predicate),
    requiredFacts: sortStrings(rule.requiredFacts || []),
    scope: {
      actionKinds: sortStrings((rule.scope && rule.scope.actionKinds) || []),
      domains: sortStrings((rule.scope && rule.scope.domains) || []),
      jurisdiction: rule.scope && rule.scope.jurisdiction,
      missionTypes: sortStrings((rule.scope && rule.scope.missionTypes) || []),
    },
    stage: rule.stage,
  }));
}

function ruleSourceRefs(rule) {
  if (!isPlainObject(rule) || !Array.isArray(rule.sourceRefs)) {
    return [];
  }

  return rule.sourceRefs.filter((entry) => isPlainObject(entry));
}

function validateRuleProvenance(rule, result) {
  if (!isReviewedClauseProvenance(rule.provenance)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `rule ${rule.ruleId} must retain provenance metadata.`);
    return;
  }

  const provenance = rule.provenance;

  if (provenance.derivationType === 'ILLUSTRATIVE') {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `rule ${rule.ruleId} cannot retain illustrative provenance.`);
    return;
  }

  if (provenance.derivationType === 'COMPOSED') {
    if (!Array.isArray(provenance.parentClauseIds) || provenance.parentClauseIds.length === 0) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `rule ${rule.ruleId} requires parentClauseIds when provenance is COMPOSED.`);
      return;
    }
    return;
  }

  if (Array.isArray(provenance.parentClauseIds) && provenance.parentClauseIds.length > 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `rule ${rule.ruleId} may only declare parentClauseIds when provenance is COMPOSED.`);
  }
}

function validateSourceRegistrySnapshot(bundle, rules, result) {
  if (!Array.isArray(bundle.sourceRegistrySnapshot) || bundle.sourceRegistrySnapshot.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'bundle.sourceRegistrySnapshot must be a non-empty array.');
    return;
  }

  const snapshotIndex = new Map();
  bundle.sourceRegistrySnapshot.forEach((entry) => {
    if (!isPlainObject(entry)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'bundle.sourceRegistrySnapshot must contain plain objects.');
      return;
    }

    if (!isNonEmptyString(entry.sourceId) || !isNonEmptyString(entry.role) || !isNonEmptyString(entry.sourceVersion) || !isNonEmptyString(entry.trustTier) || !isNonEmptyString(entry.locator)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'bundle.sourceRegistrySnapshot entries must retain sourceId, role, sourceVersion, trustTier, and locator.');
      return;
    }

    if (snapshotIndex.has(entry.sourceId)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `bundle.sourceRegistrySnapshot contains duplicate sourceId "${entry.sourceId}".`);
      return;
    }

    snapshotIndex.set(entry.sourceId, entry);
  });

  if (!result.valid) {
    return;
  }

  const usedSourceIds = sortStrings([
    ...new Set(rules.flatMap((rule) => ruleSourceRefs(rule).map((entry) => entry.sourceId))),
  ].filter((sourceId) => isNonEmptyString(sourceId)));
  const snapshotSourceIds = sortStrings([...snapshotIndex.keys()]);

  if (usedSourceIds.length !== snapshotSourceIds.length || usedSourceIds.some((sourceId, index) => sourceId !== snapshotSourceIds[index])) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'bundle.sourceRegistrySnapshot must match the sourceRefs used by bundle.rules exactly.');
    return;
  }

  rules.forEach((rule) => {
    ruleSourceRefs(rule).forEach((sourceRef) => {
      if (!isNonEmptyString(sourceRef.sourceId) || !isNonEmptyString(sourceRef.locator)) {
        fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `rule ${rule.ruleId} sourceRefs must retain sourceId and locator.`);
        return;
      }

      const snapshotEntry = snapshotIndex.get(sourceRef.sourceId);
      if (!isPlainObject(snapshotEntry)) {
        fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `bundle.sourceRegistrySnapshot is missing sourceId "${sourceRef.sourceId}".`);
        return;
      }

      if (!isLocatorBoundToSource(snapshotEntry.locator, sourceRef.locator)) {
        fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `rule ${rule.ruleId} sourceRef locator "${sourceRef.locator}" is not bound to source locator anchor "${snapshotEntry.locator}".`);
      }
    });
  });
}

function validateBundleIntegrity({ bundle, rules, authorityGraph }) {
  const result = makeResult();

  if (!isPlainObject(bundle)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'bundle must be a plain object.');
    return finish(result);
  }

  if (!isPlainObject(authorityGraph)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'authorityGraph must be a plain object.');
  }

  const bundleRules = Array.isArray(bundle.rules) ? bundle.rules : [];
  const incomingRules = Array.isArray(rules) ? rules : bundleRules;

  if (!Array.isArray(bundleRules) || bundleRules.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'bundle.rules must be a non-empty array.');
  }

  if (bundle.authorityGraphId !== authorityGraph.authorityGraphId) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.AUTHORITY_UNRESOLVED, 'bundle.authorityGraphId must match authorityGraph.authorityGraphId.');
  }

  if (bundle.authorityGraph && !isPlainObject(bundle.authorityGraph)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'embedded authorityGraph must be a plain object when present.');
  }

  if (isPlainObject(bundle.authorityGraph) && authorityGraph && bundle.authorityGraph.authorityGraphId !== authorityGraph.authorityGraphId) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.AUTHORITY_UNRESOLVED, 'embedded authorityGraph must match authorityGraph.');
  }

  if (isPlainObject(bundle.authorityGraph) && authorityGraph && bundle.authorityGraph.version !== authorityGraph.version) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.AUTHORITY_UNRESOLVED, 'embedded authorityGraph version must match authorityGraph version.');
  }

  if (bundle.bundleHash !== computeBundleHash(bundle)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.BUNDLE_HASH_MISMATCH, 'bundleHash does not match canonical bundle hash.');
  }

  if (typeof bundle.bundleVersion !== 'string' || bundle.bundleVersion.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.BUNDLE_VERSION_IMMUTABLE_VIOLATION, 'bundleVersion must be a stable semantic version string.');
  }

  const bundleRuleIds = bundleRules
    .filter((rule) => isPlainObject(rule) && typeof rule.ruleId === 'string')
    .map((rule) => `${rule.ruleId}@${rule.version}`);

  const incomingRuleIds = incomingRules
    .filter((rule) => isPlainObject(rule) && typeof rule.ruleId === 'string')
    .map((rule) => `${rule.ruleId}@${rule.version}`);

  if (bundleRuleIds.length !== incomingRuleIds.length || bundleRuleIds.some((id, index) => id !== incomingRuleIds[index])) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'bundle.rules must match the supplied rules array exactly.');
  }

  bundleRules.forEach((rule) => {
    if (isPlainObject(rule)) {
      validateRuleProvenance(rule, result);
    }
  });

  if (!result.valid) {
    return finish(result);
  }

  if (authorityGraph && Array.isArray(authorityGraph.levels)) {
    const graphLevelIds = new Set(
      authorityGraph.levels
        .filter((level) => isPlainObject(level) && typeof level.levelId === 'string')
        .map((level) => level.levelId),
    );

    const declaredLevelId = bundle.authorityOwner;
    if (typeof declaredLevelId === 'string' && declaredLevelId.length > 0 && !graphLevelIds.has(declaredLevelId)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.AUTHORITY_UNRESOLVED, 'bundle.authorityOwner must resolve inside authorityGraph.levels.');
    }
  }

  validateSourceRegistrySnapshot(bundle, incomingRules, result);

  return finish(result);
}

/**
 * Validate authority references in the compiled bundle.
 *
 * @param {{ bundle: object, rules: Array<object>, authorityGraph: object }} input
 * @returns {{ valid: boolean, reasonCode: string|null, errors: string[] }}
 */
function validateAuthorityReferences(input) {
  const result = makeResult();
  const bundle = isPlainObject(input) ? input.bundle : null;
  const rules = isPlainObject(input) && Array.isArray(input.rules) ? input.rules : [];
  const authorityGraph = isPlainObject(input) ? input.authorityGraph : null;

  if (!isPlainObject(bundle) || !isPlainObject(authorityGraph)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'bundle and authorityGraph must be plain objects.');
    return finish(result);
  }

  const levelIds = new Set();
  const edgeIds = new Set();

  (authorityGraph.levels || []).forEach((level) => {
    if (isPlainObject(level) && typeof level.levelId === 'string' && level.levelId.length > 0) {
      levelIds.add(level.levelId);
    }
  });

  (authorityGraph.delegationEdges || []).forEach((edge) => {
    if (isPlainObject(edge) && typeof edge.edgeId === 'string' && edge.edgeId.length > 0) {
      edgeIds.add(edge.edgeId);
    }
  });

  if (typeof bundle.authorityOwner === 'string' && bundle.authorityOwner.length > 0 && !levelIds.has(bundle.authorityOwner)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.AUTHORITY_UNRESOLVED, `bundle.authorityOwner "${bundle.authorityOwner}" does not exist in authorityGraph.levels.`);
  }

  rules.forEach((rule) => {
    if (!isPlainObject(rule) || !isPlainObject(rule.authority)) {
      return;
    }

    if (typeof rule.authority.minimumLevelId === 'string' && rule.authority.minimumLevelId.length > 0 && !levelIds.has(rule.authority.minimumLevelId)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.AUTHORITY_UNRESOLVED, `rule ${rule.ruleId} references unknown authority.minimumLevelId "${rule.authority.minimumLevelId}".`);
    }

    if (rule.authority.requiresExplicitDelegation === true && (!Array.isArray(rule.authority.delegationEdgeIds) || rule.authority.delegationEdgeIds.length === 0)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.AUTHORITY_UNRESOLVED, `rule ${rule.ruleId} requires an explicit delegation path.`);
    }

    if (Array.isArray(rule.authority.delegationEdgeIds)) {
      rule.authority.delegationEdgeIds.forEach((edgeId) => {
        if (typeof edgeId === 'string' && edgeId.length > 0 && !edgeIds.has(edgeId)) {
          fail(result, MILITARY_CONSTRAINT_REASON_CODES.AUTHORITY_UNRESOLVED, `rule ${rule.ruleId} references unknown authority.delegationEdgeId "${edgeId}".`);
        }
      });
    }
  });

  return finish(result);
}

function validateFactOperandExists(operand, factCatalog, result, ruleId, operatorName) {
  if (!isPlainObject(operand) || typeof operand.fact !== 'string' || operand.fact.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.PREDICATE_INVALID, `rule ${ruleId} ${operatorName} requires a fact operand.`);
    return null;
  }

  const factInfo = factCatalog.get(operand.fact);
  if (!factInfo) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.PREDICATE_INVALID, `rule ${ruleId} references unknown fact path "${operand.fact}".`);
    return null;
  }

  return factInfo;
}

function validateComparisonOperands(rule, operatorName, leftOperand, rightOperand, factCatalog, result) {
  const leftInfo = isPlainObject(leftOperand) && typeof leftOperand.fact === 'string'
    ? validateFactOperandExists(leftOperand, factCatalog, result, rule.ruleId, operatorName)
    : getOperandKind(leftOperand, factCatalog);

  const rightInfo = isPlainObject(rightOperand) && typeof rightOperand.fact === 'string'
    ? validateFactOperandExists(rightOperand, factCatalog, result, rule.ruleId, operatorName)
    : getOperandKind(rightOperand, factCatalog);

  if (!leftInfo || !rightInfo) {
    return;
  }

  const leftKind = leftInfo.kind || leftInfo;
  const rightKind = rightInfo.kind || rightInfo;

  if (!isComparisonCompatible(leftKind) || !isComparisonCompatible(rightKind)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.PREDICATE_OPERAND_TYPE_INVALID, `rule ${rule.ruleId} ${operatorName} requires numeric or timestamp-compatible operands.`);
  }

  if (leftKind !== rightKind) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.PREDICATE_OPERAND_TYPE_INVALID, `rule ${rule.ruleId} ${operatorName} operands must be the same comparison family.`);
  }
}

function validateMembershipOperands(rule, operatorName, leftOperand, rightOperand, factCatalog, result) {
  const leftInfo = isPlainObject(leftOperand) && typeof leftOperand.fact === 'string'
    ? validateFactOperandExists(leftOperand, factCatalog, result, rule.ruleId, operatorName)
    : getOperandKind(leftOperand, factCatalog);

  const rightInfo = isPlainObject(rightOperand) && typeof rightOperand.fact === 'string'
    ? validateFactOperandExists(rightOperand, factCatalog, result, rule.ruleId, operatorName)
    : getOperandKind(rightOperand, factCatalog);

  if (!leftInfo || !rightInfo) {
    return;
  }

  const leftKind = leftInfo.kind || leftInfo;
  const rightKind = rightInfo.kind || rightInfo;

  if (!isScalarKind(leftKind)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.PREDICATE_OPERAND_TYPE_INVALID, `rule ${rule.ruleId} ${operatorName} requires a scalar left operand.`);
  }

  if (!isArrayOperandKind(rightKind)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.PREDICATE_OPERAND_TYPE_INVALID, `rule ${rule.ruleId} ${operatorName} requires an array right operand.`);
  }
}

function validateEqualityOperands(rule, operatorName, leftOperand, rightOperand, factCatalog, result) {
  const leftInfo = isPlainObject(leftOperand) && typeof leftOperand.fact === 'string'
    ? validateFactOperandExists(leftOperand, factCatalog, result, rule.ruleId, operatorName)
    : getOperandKind(leftOperand, factCatalog);

  const rightInfo = isPlainObject(rightOperand) && typeof rightOperand.fact === 'string'
    ? validateFactOperandExists(rightOperand, factCatalog, result, rule.ruleId, operatorName)
    : getOperandKind(rightOperand, factCatalog);

  if (!leftInfo || !rightInfo) {
    return;
  }

  if (!areEqCompatible(leftInfo, rightInfo)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.PREDICATE_OPERAND_TYPE_INVALID, `rule ${rule.ruleId} ${operatorName} operands resolve to incompatible type families.`);
  }
}

function walkPredicate(rule, predicate, factCatalog, result) {
  if (!isPlainObject(predicate)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.PREDICATE_INVALID, `rule ${rule.ruleId} predicate must be a plain object.`);
    return;
  }

  const operators = Object.keys(predicate);
  if (operators.length !== 1) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.PREDICATE_INVALID, `rule ${rule.ruleId} predicate must contain exactly one operator.`);
    return;
  }

  const operatorName = operators[0];
  const operatorValue = predicate[operatorName];

  if (operatorName === 'all' || operatorName === 'any') {
    if (!Array.isArray(operatorValue) || operatorValue.length === 0) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.PREDICATE_INVALID, `rule ${rule.ruleId} ${operatorName} requires a non-empty array.`);
      return;
    }
    operatorValue.forEach((entry) => walkPredicate(rule, entry, factCatalog, result));
    return;
  }

  if (operatorName === 'not') {
    walkPredicate(rule, operatorValue, factCatalog, result);
    return;
  }

  if (!Array.isArray(operatorValue)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.PREDICATE_INVALID, `rule ${rule.ruleId} ${operatorName} requires an operand array.`);
    return;
  }

  if (operatorName === 'exists' || operatorName === 'not_exists') {
    if (operatorValue.length !== 1) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.PREDICATE_INVALID, `rule ${rule.ruleId} ${operatorName} requires exactly one fact operand.`);
      return;
    }
    validateFactOperandExists(operatorValue[0], factCatalog, result, rule.ruleId, operatorName);
    return;
  }

  if (operatorValue.length !== 2) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.PREDICATE_INVALID, `rule ${rule.ruleId} ${operatorName} requires exactly two operands.`);
    return;
  }

  const [leftOperand, rightOperand] = operatorValue;

  if (operatorName === 'gt' || operatorName === 'gte' || operatorName === 'lt' || operatorName === 'lte') {
    validateComparisonOperands(rule, operatorName, leftOperand, rightOperand, factCatalog, result);
    return;
  }

  if (operatorName === 'in' || operatorName === 'not_in') {
    validateMembershipOperands(rule, operatorName, leftOperand, rightOperand, factCatalog, result);
    return;
  }

  if (operatorName === 'eq' || operatorName === 'neq') {
    validateEqualityOperands(rule, operatorName, leftOperand, rightOperand, factCatalog, result);
    return;
  }

  fail(result, MILITARY_CONSTRAINT_REASON_CODES.PREDICATE_INVALID, `rule ${rule.ruleId} uses unsupported predicate operator "${operatorName}".`);
}

/**
 * Validate predicate operand families against the fact schema.
 *
 * @param {{ rules: Array<object>, factSchema: object }} input
 * @returns {{ valid: boolean, reasonCode: string|null, errors: string[] }}
 */
function validatePredicateOperandTypes(input) {
  const result = makeResult();
  const rules = isPlainObject(input) && Array.isArray(input.rules) ? input.rules : [];
  const factSchema = isPlainObject(input) ? input.factSchema : null;

  if (!isPlainObject(factSchema)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'factSchema must be a plain object.');
    return finish(result);
  }

  const factCatalog = buildFactCatalog(factSchema);

  rules.forEach((rule) => {
    if (!isPlainObject(rule) || !isPlainObject(rule.predicate)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, 'each rule must contain a predicate object.');
      return;
    }
    walkPredicate(rule, rule.predicate, factCatalog, result);
  });

  return finish(result);
}

/**
 * Validate same-stage conflicts conservatively.
 *
 * @param {{ bundle: object, rules: Array<object> }} input
 * @returns {{ valid: boolean, reasonCode: string|null, errors: string[] }}
 */
function validateSameStageConflicts(input) {
  const result = makeResult();
  const bundle = isPlainObject(input) ? input.bundle : null;
  const rules = isPlainObject(input) && Array.isArray(input.rules) ? input.rules : [];

  if (!isPlainObject(bundle)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'bundle must be a plain object.');
    return finish(result);
  }

  if (!bundle.precedencePolicy || bundle.precedencePolicy.sameStageConflictPolicy !== 'REFUSE') {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'bundle.precedencePolicy.sameStageConflictPolicy must be REFUSE.');
    return finish(result);
  }

  const activeRules = rules.filter((rule) => isPlainObject(rule) && rule.status === 'ACTIVE');
  const seenRuleIds = new Set();
  const seenSemanticSignatures = new Map();
  const sameStageGroups = new Map();

  activeRules.forEach((rule) => {
    if (typeof rule.ruleId === 'string' && seenRuleIds.has(rule.ruleId)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_CONFLICT, `duplicate active ruleId "${rule.ruleId}" detected.`);
    }
    if (typeof rule.ruleId === 'string') {
      seenRuleIds.add(rule.ruleId);
    }

    const semanticSignature = getRuleSemanticSignature(rule);
    if (seenSemanticSignatures.has(semanticSignature)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_CONFLICT, `duplicate semantic rule detected for "${rule.ruleId}".`);
    } else {
      seenSemanticSignatures.set(semanticSignature, rule.ruleId);
    }

    const scopeSignature = getRuleScopeSignature(rule.scope || {});
    const groupKey = `${rule.stage || ''}|${scopeSignature}|${String(rule.priority)}`;
    if (!sameStageGroups.has(groupKey)) {
      sameStageGroups.set(groupKey, []);
    }
    sameStageGroups.get(groupKey).push(rule);
  });

  sameStageGroups.forEach((group) => {
    if (group.length > 1) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_CONFLICT, `same-stage conflict detected for stage/scope/priority group with ${group.length} active rule(s).`);
    }
  });

  return finish(result);
}

/**
 * Validate the full compiled contract pack.
 *
 * @param {{ bundle: object, rules: Array<object>, authorityGraph: object, factSchema: object }} input
 * @returns {{ valid: boolean, reasonCode: string|null, errors: string[] }}
 */
function validateContractPack(input) {
  const bundle = isPlainObject(input) ? input.bundle : null;
  const rules = isPlainObject(input) && Array.isArray(input.rules) ? input.rules : [];
  const authorityGraph = isPlainObject(input) ? input.authorityGraph : null;
  const factSchema = isPlainObject(input) ? input.factSchema : null;

  const integrity = validateBundleIntegrity({ bundle, rules, authorityGraph });
  const authority = validateAuthorityReferences({ bundle, rules, authorityGraph });
  const predicate = validatePredicateOperandTypes({ rules, factSchema });
  const conflicts = validateSameStageConflicts({ bundle, rules });

  const missingFact = validateMissingFactSemantics({ rules });

  const result = makeResult();
  [integrity, authority, predicate, conflicts, missingFact].forEach((entry) => {
    if (!entry.valid) {
      fail(result, entry.reasonCode || MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, entry.errors[0] || 'validation failed.');
      entry.errors.slice(1).forEach((message) => {
        result.errors.push(message);
      });
    }
  });

  return finish(result);
}

/**
 * Validate required-fact semantics against existence predicates.
 *
 * @param {{ rules: Array<object> }} input
 * @returns {{ valid: boolean, reasonCode: string|null, errors: string[] }}
 */
function validateMissingFactSemantics(input) {
  const result = makeResult();
  const rules = isPlainObject(input) && Array.isArray(input.rules) ? input.rules : [];

  function walk(rule, node) {
    if (!isPlainObject(node)) {
      return;
    }

    if (Array.isArray(node.exists) || Array.isArray(node.not_exists)) {
      const values = node.exists || node.not_exists;
      values.forEach((entry) => {
        if (!isPlainObject(entry) || typeof entry.fact !== 'string') {
          return;
        }
        if (Array.isArray(rule.requiredFacts) && rule.requiredFacts.includes(entry.fact)) {
          fail(result, MILITARY_CONSTRAINT_REASON_CODES.MISSING_REQUIRED_FACT, `rule ${rule.ruleId} has impossible requiredFacts overlap for "${entry.fact}".`);
        }
      });
      return;
    }

    if (Array.isArray(node.all)) {
      node.all.forEach((entry) => walk(rule, entry));
    }

    if (Array.isArray(node.any)) {
      node.any.forEach((entry) => walk(rule, entry));
    }

    if (Object.prototype.hasOwnProperty.call(node, 'not')) {
      walk(rule, node.not);
    }
  }

  rules.forEach((rule) => {
    if (isPlainObject(rule) && isPlainObject(rule.predicate)) {
      walk(rule, rule.predicate);
    }
  });

  return finish(result);
}

module.exports = {
  canonicalBundlePayload,
  computeBundleHash,
  validateAuthorityReferences,
  validateBundleIntegrity,
  validateContractPack,
  validateMissingFactSemantics,
  validatePredicateOperandTypes,
  validateSameStageConflicts,
};
