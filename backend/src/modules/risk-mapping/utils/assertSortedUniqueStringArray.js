'use strict';

function assertSortedUniqueStringArray(values, label = 'array') {
  if (!Array.isArray(values)) {
    throw new TypeError(`${label} must be an array.`);
  }

  let previousValue = null;

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (typeof value !== 'string') {
      throw new TypeError(`${label}[${index}] must be a string.`);
    }

    if (previousValue !== null && previousValue > value) {
      throw new Error(`${label} must be sorted in ascending order.`);
    }

    if (previousValue === value) {
      throw new Error(`${label} must not contain duplicate values.`);
    }

    previousValue = value;
  }

  return true;
}

module.exports = Object.freeze({
  assertSortedUniqueStringArray,
});
