'use strict';

const {
  buildFactTypeRegistry,
  classifyRuntimeValue,
  deepEqualStrict,
  isPlainObject,
  isScalarKind,
  resolveFactPath,
} = require('./fact-schema-utils');
const {
  checkPredicateBranchWidth,
  checkPredicateNodeBudget,
  createPredicateBudgetState,
  isPredicateBudgetExceededError,
} = require('./predicate-budgets');

function makeResult() {
  return {
    ok: false,
    usedFacts: [],
    errors: [],
  };
}

function sortUnique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function makeError(code, message, details) {
  return {
    code,
    message,
    details: details || null,
  };
}

function getRegistryEntry(registry, factPath) {
  if (!(registry instanceof Map)) {
    return null;
  }

  return registry.get(factPath) || null;
}

function isFactOperand(operand) {
  return isPlainObject(operand) && typeof operand.fact === 'string';
}

function resolveOperand(operand, facts, registry, expectedKind) {
  if (!isPlainObject(operand)) {
    return {
      status: 'invalid',
      error: makeError('PREDICATE_INVALID', 'operand must be a plain object.'),
    };
  }

  if (Object.prototype.hasOwnProperty.call(operand, 'fact')) {
    if (typeof operand.fact !== 'string' || operand.fact.length === 0) {
      return {
        status: 'invalid',
        error: makeError('PREDICATE_INVALID', 'fact operand must contain a non-empty fact path.'),
      };
    }

    const factPath = operand.fact;
    const resolved = resolveFactPath(facts, factPath);
    const registryEntry = getRegistryEntry(registry, factPath);

    if (!resolved.present) {
      return {
        status: 'missing',
        factPath,
        error: makeError('MISSING_FACT', `missing fact path "${factPath}".`, { factPath }),
      };
    }

    const kindHint = registryEntry ? registryEntry.kind : expectedKind;
    const classified = classifyRuntimeValue(resolved.value, kindHint);

    return {
      status: classified.kind === 'unknown' ? 'invalid' : 'ok',
      factPath,
      kind: classified.kind,
      value: classified.value,
      error: classified.kind === 'unknown'
        ? makeError('PREDICATE_OPERAND_TYPE_INVALID', `fact path "${factPath}" has unsupported runtime value type.`, { factPath })
        : null,
    };
  }

  if (Object.prototype.hasOwnProperty.call(operand, 'value')) {
    const classified = classifyRuntimeValue(operand.value, expectedKind);
    return {
      status: classified.kind === 'unknown' ? 'invalid' : 'ok',
      kind: classified.kind,
      value: classified.value,
      error: classified.kind === 'unknown'
        ? makeError('PREDICATE_OPERAND_TYPE_INVALID', 'literal value has unsupported runtime type.', null)
        : null,
    };
  }

  return {
    status: 'invalid',
    error: makeError('PREDICATE_INVALID', 'operand must contain fact or value.'),
  };
}

function compareEqual(left, right) {
  if (Array.isArray(left.value) || Array.isArray(right.value)) {
    return deepEqualStrict(left.value, right.value);
  }

  return Object.is(left.value, right.value);
}

function compareOrdered(left, right, operatorName) {
  if (left.kind === 'number' && right.kind === 'number') {
    if (operatorName === 'gt') {
      return left.value > right.value;
    }
    if (operatorName === 'gte') {
      return left.value >= right.value;
    }
    if (operatorName === 'lt') {
      return left.value < right.value;
    }
    return left.value <= right.value;
  }

  if (left.kind === 'timestamp' && right.kind === 'timestamp') {
    const leftTime = Date.parse(left.value);
    const rightTime = Date.parse(right.value);

    if (operatorName === 'gt') {
      return leftTime > rightTime;
    }
    if (operatorName === 'gte') {
      return leftTime >= rightTime;
    }
    if (operatorName === 'lt') {
      return leftTime < rightTime;
    }
    return leftTime <= rightTime;
  }

  return null;
}

function evaluateNode(node, facts, registry, budgetState, depth) {
  const result = {
    state: 'UNKNOWN',
    usedFacts: [],
    errors: [],
  };

  if (!isPlainObject(node)) {
    result.errors.push(makeError('PREDICATE_INVALID', 'predicate node must be a plain object.'));
    return result;
  }

  const operatorNames = Object.keys(node);
  if (operatorNames.length !== 1) {
    result.errors.push(makeError('PREDICATE_INVALID', 'predicate node must contain exactly one operator.'));
    return result;
  }

  const operatorName = operatorNames[0];
  const operatorValue = node[operatorName];
  const budgetError = checkPredicateNodeBudget(budgetState, depth, operatorName);
  if (budgetError) {
    result.errors.push(budgetError);
    return result;
  }

  if (operatorName === 'all' || operatorName === 'any') {
    if (!Array.isArray(operatorValue) || operatorValue.length === 0) {
      result.errors.push(makeError('PREDICATE_INVALID', `${operatorName} requires a non-empty array.`));
      return result;
    }

    const branchBudgetError = checkPredicateBranchWidth(operatorName, operatorValue.length);
    if (branchBudgetError) {
      result.errors.push(branchBudgetError);
      return result;
    }

    const usedFacts = [];
    const errors = [];

    if (operatorName === 'all') {
      let sawUnknown = false;

      for (let index = 0; index < operatorValue.length; index += 1) {
        const child = evaluateNode(operatorValue[index], facts, registry, budgetState, depth + 1);
        usedFacts.push(...child.usedFacts);
        const childBudgetError = child.errors.find(isPredicateBudgetExceededError);
        if (childBudgetError) {
          return {
            state: 'UNKNOWN',
            usedFacts: sortUnique(usedFacts),
            errors: [childBudgetError],
          };
        }

        if (child.state === 'FALSE') {
          return {
            state: 'FALSE',
            usedFacts: sortUnique(usedFacts),
            errors: [],
          };
        }

        if (child.state === 'UNKNOWN') {
          sawUnknown = true;
          errors.push(...child.errors);
        }
      }

      return {
        state: sawUnknown ? 'UNKNOWN' : 'TRUE',
        usedFacts: sortUnique(usedFacts),
        errors: sawUnknown ? errors : [],
      };
    }

    let sawUnknown = false;

    for (let index = 0; index < operatorValue.length; index += 1) {
      const child = evaluateNode(operatorValue[index], facts, registry, budgetState, depth + 1);
      usedFacts.push(...child.usedFacts);
      const childBudgetError = child.errors.find(isPredicateBudgetExceededError);
      if (childBudgetError) {
        return {
          state: 'UNKNOWN',
          usedFacts: sortUnique(usedFacts),
          errors: [childBudgetError],
        };
      }

      if (child.state === 'TRUE') {
        return {
          state: 'TRUE',
          usedFacts: sortUnique(usedFacts),
          errors: [],
        };
      }

      if (child.state === 'UNKNOWN') {
        sawUnknown = true;
        errors.push(...child.errors);
      }
    }

    return {
      state: sawUnknown ? 'UNKNOWN' : 'FALSE',
      usedFacts: sortUnique(usedFacts),
      errors: sawUnknown ? errors : [],
    };
  }

  if (operatorName === 'not') {
    const child = evaluateNode(operatorValue, facts, registry, budgetState, depth + 1);
    const budgetError = child.errors.find(isPredicateBudgetExceededError);
    if (budgetError) {
      return {
        state: 'UNKNOWN',
        usedFacts: sortUnique(child.usedFacts),
        errors: [budgetError],
      };
    }
    if (child.state === 'UNKNOWN') {
      return {
        state: 'UNKNOWN',
        usedFacts: sortUnique(child.usedFacts),
        errors: child.errors,
      };
    }

    return {
      state: child.state === 'TRUE' ? 'FALSE' : 'TRUE',
      usedFacts: sortUnique(child.usedFacts),
      errors: [],
    };
  }

  if (!Array.isArray(operatorValue)) {
    return {
      state: 'UNKNOWN',
      usedFacts: [],
      errors: [makeError('PREDICATE_INVALID', `${operatorName} requires an operand array.`)],
    };
  }

  if (operatorName === 'exists' || operatorName === 'not_exists') {
    if (operatorValue.length !== 1) {
      return {
        state: 'UNKNOWN',
        usedFacts: [],
        errors: [makeError('PREDICATE_INVALID', `${operatorName} requires exactly one operand.`)],
      };
    }

    const operand = resolveOperand(operatorValue[0], facts, registry);
    if (operand.status === 'invalid') {
      return {
        state: 'UNKNOWN',
        usedFacts: operand.factPath ? [operand.factPath] : [],
        errors: [operand.error],
      };
    }

    if (operand.factPath) {
      if (operatorName === 'exists') {
        return {
          state: operand.status === 'ok' ? 'TRUE' : 'FALSE',
          usedFacts: [operand.factPath],
          errors: [],
        };
      }

      return {
        state: operand.status === 'ok' ? 'FALSE' : 'TRUE',
        usedFacts: [operand.factPath],
        errors: [],
      };
    }

    return {
      state: 'UNKNOWN',
      usedFacts: [],
      errors: [makeError('PREDICATE_INVALID', `${operatorName} requires a fact operand.`)],
    };
  }

  if (operatorValue.length !== 2) {
    return {
      state: 'UNKNOWN',
      usedFacts: [],
      errors: [makeError('PREDICATE_INVALID', `${operatorName} requires exactly two operands.`)],
    };
  }

  const leftRaw = operatorValue[0];
  const rightRaw = operatorValue[1];

  const leftRegistryKind = isFactOperand(leftRaw)
    ? (getRegistryEntry(registry, leftRaw.fact) || {}).kind || null
    : null;
  const rightRegistryKind = isFactOperand(rightRaw)
    ? (getRegistryEntry(registry, rightRaw.fact) || {}).kind || null
    : null;

  const left = resolveOperand(leftRaw, facts, registry, rightRegistryKind);
  const right = resolveOperand(rightRaw, facts, registry, leftRegistryKind);

  const usedFacts = [];
  if (left.factPath) {
    usedFacts.push(left.factPath);
  }
  if (right.factPath) {
    usedFacts.push(right.factPath);
  }

  if (left.status === 'missing' || right.status === 'missing') {
    const errors = [];
    if (left.status === 'missing' && left.error) {
      errors.push(left.error);
    }
    if (right.status === 'missing' && right.error) {
      errors.push(right.error);
    }
    return {
      state: 'UNKNOWN',
      usedFacts: sortUnique(usedFacts),
      errors,
    };
  }

  if (left.status !== 'ok' || right.status !== 'ok') {
    return {
      state: 'UNKNOWN',
      usedFacts: sortUnique(usedFacts),
      errors: [left.error || right.error].filter(Boolean),
    };
  }

  if (operatorName === 'gt' || operatorName === 'gte' || operatorName === 'lt' || operatorName === 'lte') {
    if (!((left.kind === 'number' && right.kind === 'number') || (left.kind === 'timestamp' && right.kind === 'timestamp'))) {
      return {
        state: 'UNKNOWN',
        usedFacts: sortUnique(usedFacts),
        errors: [makeError('PREDICATE_OPERAND_TYPE_INVALID', `${operatorName} requires numeric or timestamp-compatible operands.`)],
      };
    }

    const comparison = compareOrdered(left, right, operatorName);
    if (comparison === null) {
      return {
        state: 'UNKNOWN',
        usedFacts: sortUnique(usedFacts),
        errors: [makeError('PREDICATE_OPERAND_TYPE_INVALID', `${operatorName} operands must share the same comparison family.`)],
      };
    }

    return {
      state: comparison ? 'TRUE' : 'FALSE',
      usedFacts: sortUnique(usedFacts),
      errors: [],
    };
  }

  if (operatorName === 'in' || operatorName === 'not_in') {
    const leftIsScalar = isScalarKind(left.kind);
    const rightIsArray = right.kind === 'array';

    if (!leftIsScalar || !rightIsArray) {
      return {
        state: 'UNKNOWN',
        usedFacts: sortUnique(usedFacts),
        errors: [makeError('PREDICATE_OPERAND_TYPE_INVALID', `${operatorName} requires a scalar left operand and an array right operand.`)],
      };
    }

    const rightValues = Array.isArray(right.value) ? right.value : [];
    const match = rightValues.some((candidate) => deepEqualStrict(candidate, left.value));

    return {
      state: operatorName === 'in' ? (match ? 'TRUE' : 'FALSE') : (!match ? 'TRUE' : 'FALSE'),
      usedFacts: sortUnique(usedFacts),
      errors: [],
    };
  }

  if (operatorName === 'eq' || operatorName === 'neq') {
    const allowedKinds = ['boolean', 'string', 'enum-string', 'number', 'timestamp', 'null', 'array'];
    const kindsAreKnown = allowedKinds.includes(left.kind) && allowedKinds.includes(right.kind);

    if (!kindsAreKnown || (left.kind !== right.kind && !(left.kind === 'string' && right.kind === 'enum-string') && !(left.kind === 'enum-string' && right.kind === 'string'))) {
      return {
        state: 'UNKNOWN',
        usedFacts: sortUnique(usedFacts),
        errors: [makeError('PREDICATE_OPERAND_TYPE_INVALID', `${operatorName} operands resolve to incompatible type families.`)],
      };
    }

    const equal = compareEqual(left, right);
    return {
      state: operatorName === 'eq' ? (equal ? 'TRUE' : 'FALSE') : (!equal ? 'TRUE' : 'FALSE'),
      usedFacts: sortUnique(usedFacts),
      errors: [],
    };
  }

  return {
    state: 'UNKNOWN',
    usedFacts: sortUnique(usedFacts),
    errors: [makeError('PREDICATE_INVALID', `unsupported predicate operator "${operatorName}".`)],
  };
}

/**
 * Evaluate a closed predicate AST against structured facts.
 *
 * @param {{ predicate: object, facts: object, factSchema?: object }} input
 * @returns {{ ok: boolean, usedFacts: string[], errors: Array<object> }}
 */
function evaluatePredicate(input) {
  const predicate = isPlainObject(input) ? input.predicate : null;
  const facts = isPlainObject(input) ? input.facts : null;
  const factSchema = isPlainObject(input) ? input.factSchema : null;
  const registry = buildFactTypeRegistry(factSchema);
  const budgetState = createPredicateBudgetState();

  const output = makeResult();

  const evaluation = evaluateNode(predicate, facts, registry, budgetState, 0);
  output.ok = evaluation.state === 'TRUE' && evaluation.errors.length === 0;
  output.usedFacts = sortUnique(evaluation.usedFacts);
  output.errors = evaluation.errors;

  return output;
}

module.exports = {
  evaluatePredicate,
};
