import assert from 'node:assert/strict';
import test from 'node:test';
import { createUniverse, evaluateExperiment } from '../src/lib/universe.ts';

const cases = [
  { name: 'proportional rule', random: 0, expected: [3, 6, 9, 12, 15, 18, 21, 24] },
  { name: 'offset rule', random: 0.5, expected: [5, 8, 11, 14, 17, 20, 23, 26] },
  { name: 'quadratic rule', random: 0.999, expected: [3, 12, 27, 48, 75, 108, 147, 192] },
];

for (const { name, random, expected } of cases) {
  test(`${name} produces all eight correct results`, () => {
    const universe = createUniverse(() => random);

    for (let input = 1; input <= 8; input += 1) {
      assert.equal(evaluateExperiment(universe, input), expected[input - 1]);
    }
  });
}

test('random selection covers the three equal intervals', () => {
  const selections = [
    { random: 0, expected: 6 },
    { random: 1 / 3 - Number.EPSILON, expected: 6 },
    { random: 1 / 3, expected: 8 },
    { random: 2 / 3 - Number.EPSILON, expected: 8 },
    { random: 2 / 3, expected: 12 },
    { random: 1 - Number.EPSILON, expected: 12 },
  ];

  for (const { random, expected } of selections) {
    assert.equal(evaluateExperiment(createUniverse(() => random), 2), expected);
  }
});

test('a universe retains its selected rule across experiments', () => {
  let randomCalls = 0;
  const universe = createUniverse(() => {
    randomCalls += 1;
    return 0.5;
  });

  assert.equal(randomCalls, 1);
  assert.equal(evaluateExperiment(universe, 2), 8);
  assert.equal(evaluateExperiment(universe, 8), 26);
  assert.equal(evaluateExperiment(universe, 2), 8);
  assert.equal(randomCalls, 1);
});

test('new universes independently select their rules', () => {
  const first = createUniverse(() => 0);
  const second = createUniverse(() => 0.999);

  assert.notEqual(first, second);
  assert.equal(evaluateExperiment(first, 2), 6);
  assert.equal(evaluateExperiment(second, 2), 12);
  assert.equal(evaluateExperiment(first, 2), 6);
});

test('input rejects out-of-range, fractional, and non-finite values', () => {
  const universe = createUniverse(() => 0);

  for (const input of [-1, 0, 9, 100, 1.5, 7.9, NaN, Infinity, -Infinity]) {
    assert.throws(() => evaluateExperiment(universe, input), RangeError);
  }
});

test('invalid random values reject unavailable rules', () => {
  for (const random of [-0.1, 1, 2, NaN, Infinity, -Infinity]) {
    assert.throws(() => createUniverse(() => random), RangeError);
  }
});
