'use strict';

function defaultComparator(left, right) {
  const leftValue = String(left);
  const rightValue = String(right);

  if (leftValue < rightValue) {
    return -1;
  }

  if (leftValue > rightValue) {
    return 1;
  }

  return 0;
}

/**
 * @template T
 * @param {readonly T[]} values
 * @param {(left: T, right: T) => number} [comparator]
 * @returns {readonly T[]}
 */
function stableSort(values, comparator = defaultComparator) {
  if (!Array.isArray(values)) {
    throw new TypeError('stableSort requires an array.');
  }

  return Object.freeze(
    [...values]
      .map((value, index) => ({ value, index }))
      .sort((left, right) => {
        const result = comparator(left.value, right.value);
        return result !== 0 ? result : left.index - right.index;
      })
      .map((entry) => entry.value),
  );
}

module.exports = Object.freeze({
  stableSort,
});

