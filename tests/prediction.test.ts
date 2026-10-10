import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePrediction } from '../src/lib/prediction.ts';

test('predictions accept finite decimal numbers including zero, negatives, fractions, and exponents', () => {
  const valid: [string, number][] = [
    ['0', 0], ['-4', -4], ['+3', 3], ['2.5', 2.5], ['-.5', -0.5],
    ['1.', 1], ['1e2', 100], ['-1.5E-2', -0.015], ['  12  ', 12],
    ['1.7976931348623157e308', Number.MAX_VALUE],
  ];

  for (const [input, expected] of valid) assert.equal(parsePrediction(input), expected);
  assert.equal(parsePrediction('-0'), -0);
});

test('empty, malformed, and non-finite predictions are invalid', () => {
  for (const input of [
    '', ' ', '\n\t', 'NaN', 'Infinity', '-Infinity', '1e309', '-1e309',
    '0x10', '0b11', '0o7', 'three', '1,5', '1 2', '--1', '1e', '.', '+',
  ]) {
    assert.equal(parsePrediction(input), null, `Expected ${JSON.stringify(input)} to be invalid`);
  }
});
