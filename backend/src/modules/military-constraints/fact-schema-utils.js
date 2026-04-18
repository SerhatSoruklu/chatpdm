'use strict';

const Ajv2020 = require('ajv/dist/2020').default;
const addFormats = require('ajv-formats');

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

const factSchemaValidatorCache = new WeakMap();

function buildFactSchemaValidator(factSchema) {
  if (!isPlainObject(factSchema)) {
    return null;
  }

  if (factSchemaValidatorCache.has(factSchema)) {
    return factSchemaValidatorCache.get(factSchema);
  }

  const ajv = new Ajv2020({ allErrors: true, allowUnionTypes: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(factSchema);
  factSchemaValidatorCache.set(factSchema, validate);
  return validate;
}

function classifySchemaKind(node) {
  if (!isPlainObject(node)) {
    return null;
  }

  if (node.format === 'date-time') {
    return 'timestamp';
  }

  const type = node.type;

  if (Array.isArray(type)) {
    if (type.includes('integer') || type.includes('number')) {
      return 'number';
    }
    if (type.includes('boolean')) {
      return 'boolean';
    }
    if (type.includes('string')) {
      return node.enum ? 'enum-string' : 'string';
    }
    if (type.includes('array')) {
      return 'array';
    }
    return null;
  }

  if (type === 'integer' || type === 'number') {
    return 'number';
  }

  if (type === 'boolean') {
    return 'boolean';
  }

  if (type === 'string') {
    return node.enum ? 'enum-string' : 'string';
  }

  if (type === 'array') {
    return 'array';
  }

  return null;
}

function collectFactTypes(schema, pathParts, registry) {
  if (!isPlainObject(schema)) {
    return;
  }

  if (schema.type === 'object' && isPlainObject(schema.properties)) {
    Object.keys(schema.properties).forEach((key) => {
      collectFactTypes(schema.properties[key], pathParts.concat(key), registry);
    });
    return;
  }

  const path = pathParts.join('.');
  if (path) {
    const kind = classifySchemaKind(schema);
    if (kind !== null) {
      const entry = {
        kind,
        schema,
      };

      if (schema.type === 'array' && isPlainObject(schema.items)) {
        entry.itemKind = classifySchemaKind(schema.items);
      }

      registry.set(path, entry);
    }
  }
}

/**
 * Build a registry of known fact paths and their leaf kinds from a JSON schema.
 *
 * @param {object} factSchema
 * @returns {Map<string, { kind: string, schema: object, itemKind?: string }>}
 */
function buildFactTypeRegistry(factSchema) {
  const registry = new Map();
  if (isPlainObject(factSchema)) {
    collectFactTypes(factSchema, [], registry);
  }
  return registry;
}

function isIso8601TimestampString(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const iso8601Pattern = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;
  return iso8601Pattern.test(value) && !Number.isNaN(Date.parse(value));
}

/**
 * Resolve a dot-path inside a structured facts object.
 *
 * @param {object} facts
 * @param {string} factPath
 * @returns {{ present: boolean, value: unknown }}
 */
function resolveFactPath(facts, factPath) {
  if (!isPlainObject(facts) || typeof factPath !== 'string' || factPath.length === 0) {
    return { present: false, value: undefined };
  }

  const parts = factPath.split('.');
  let current = facts;

  for (let index = 0; index < parts.length; index += 1) {
    const key = parts[index];
    if (!isPlainObject(current) || !Object.prototype.hasOwnProperty.call(current, key)) {
      return { present: false, value: undefined };
    }
    current = current[key];
  }

  return {
    present: true,
    value: current,
  };
}

/**
 * Classify a runtime value with an optional expected kind hint.
 *
 * @param {unknown} value
 * @param {string|null|undefined} expectedKind
 * @returns {{ kind: string, value: unknown }}
 */
function classifyRuntimeValue(value, expectedKind) {
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
    return Number.isFinite(value)
      ? { kind: 'number', value }
      : { kind: 'unknown', value };
  }

  if (typeof value === 'string') {
    if (expectedKind === 'timestamp') {
      return !isIso8601TimestampString(value)
        ? { kind: 'unknown', value }
        : { kind: 'timestamp', value };
    }

    if (expectedKind === 'string' || expectedKind === 'enum-string') {
      return { kind: expectedKind, value };
    }

    return !isIso8601TimestampString(value)
      ? { kind: 'string', value }
      : { kind: 'timestamp', value };
  }

  return { kind: 'unknown', value };
}

function isScalarKind(kind) {
  return kind === 'boolean'
    || kind === 'string'
    || kind === 'enum-string'
    || kind === 'number'
    || kind === 'timestamp'
    || kind === 'null';
}

function isNumericKind(kind) {
  return kind === 'number';
}

function isTimestampKind(kind) {
  return kind === 'timestamp';
}

function deepEqualStrict(left, right) {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }

    for (let index = 0; index < left.length; index += 1) {
      if (!deepEqualStrict(left[index], right[index])) {
        return false;
      }
    }

    return true;
  }

  return Object.is(left, right);
}

function validateFactPacket(facts, factSchema) {
  const result = {
    valid: false,
    reasonCode: 'FACT_PACKET_INVALID',
    errors: [],
  };

  const validate = buildFactSchemaValidator(factSchema);
  if (typeof validate !== 'function') {
    result.errors.push('factSchema must be a plain object.');
    return result;
  }

  const valid = validate(facts);
  if (valid === true) {
    result.valid = true;
    result.reasonCode = null;
    return result;
  }

  const errors = Array.isArray(validate.errors) ? validate.errors : [];
  result.errors = errors.map((entry) => {
    const instancePath = typeof entry.instancePath === 'string' && entry.instancePath.length > 0 ? entry.instancePath : '/';
    const message = typeof entry.message === 'string' ? entry.message : 'validation failed';
    return `${instancePath} ${message}`.trim();
  });
  return result;
}

module.exports = {
  buildFactSchemaValidator,
  buildFactTypeRegistry,
  classifyRuntimeValue,
  deepEqualStrict,
  isIso8601TimestampString,
  isNumericKind,
  isPlainObject,
  isScalarKind,
  isTimestampKind,
  resolveFactPath,
  validateFactPacket,
};
