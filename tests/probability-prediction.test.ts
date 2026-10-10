import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePrediction } from '../src/lib/prediction.ts';
import { formatDifference, formatInput, formatOutput } from '../src/lib/format.ts';

test('percentage predictions accept inclusive zero and 100, decimals, and finite numeric notation', () => {
  const cases: [string, number][] = [
    ['0', 0], ['100', 1], ['25', 0.25], ['33.33333333333333', 33.33333333333333 / 100],
    ['.5', 0.005], ['99.99', 0.9998999999999999], ['+10', 0.1], [' 42.5 ', 0.425], ['1e2', 1],
  ];
  for (const [input, expected] of cases) {
    assert.equal(parsePrediction(input, 'probability'), expected);
  }
});

test('percentage predictions reject values outside zero to 100 and malformed or non-finite input', () => {
  for (const input of [
    '-1', '-0.001', '100.001', '101', '1e3', '', ' ', 'NaN', 'Infinity', '-Infinity',
    '1e309', '0x10', '0b11', '50%', '1,5', '1 2', '--1', '1e', '.', '+',
  ]) assert.equal(parsePrediction(input, 'probability'), null, input);
});

test('probability formatting uses two decimal percentage places without rounding stored fractions', () => {
  const probability = 1 / 3;
  const prediction = parsePrediction('33.33333333333333', 'probability')!;
  assert.equal(formatOutput('probability', probability), '33.33%');
  assert.equal(formatOutput('probability', 0), '0.00%');
  assert.equal(formatOutput('probability', 1), '100.00%');
  assert.equal(formatOutput('probability', prediction), '33.33%');
  assert.equal(probability, 1 / 3);
  assert.equal(prediction, 33.33333333333333 / 100);
  assert.notEqual(probability, 0.3333);
});

test('prediction differences display actual minus prediction in percentage points', () => {
  assert.equal(formatDifference('probability', 1 / 3 - 0.5), '-16.67');
  assert.equal(formatDifference('probability', 0.5 - 1 / 3), '16.67');
  assert.equal(formatDifference('probability', 0), '0.00');
});

test('a tiny negative difference displays zero while its full-precision sign is preserved', () => {
  const difference = 2 / 3 - parsePrediction('66.67', 'probability')!;
  assert.ok(difference < 0);
  assert.equal(formatDifference('probability', difference), '0.00');
  assert.equal(difference, 2 / 3 - 66.67 / 100);
});

test('domain formatting uses ball counts for probability and preserves scalar quantity labels', () => {
  assert.equal(formatInput('probability', { red: 2, blue: 7 }), '红球 r = 2 · 蓝球 b = 7');
  assert.equal(formatInput('function', 2), '输入 x = 2');
  assert.equal(formatInput('motion', 2), '时间 t（秒） = 2');
  assert.equal(formatOutput('function', 8), '8');
  assert.equal(formatOutput('motion', 8), '8');
  assert.equal(formatDifference('function', -2.5), '-2.5');
  assert.equal(formatDifference('motion', -2.5), '-2.5');
  assert.throws(() => formatInput('probability', 2), RangeError);
  assert.throws(() => formatInput('function', { red: 2, blue: 1 }), RangeError);
});

test('existing scalar predictions retain finite zero, negative, decimal, and unbounded positive values', () => {
  for (const universe of ['function', 'motion'] as const) {
    assert.equal(parsePrediction('0', universe), 0);
    assert.equal(parsePrediction('-12.5', universe), -12.5);
    assert.equal(parsePrediction('125.75', universe), 125.75);
    assert.equal(parsePrediction('Infinity', universe), null);
  }
});
