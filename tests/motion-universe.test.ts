import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createUniverse,
  evaluateExperiment,
  evaluateRule,
  getUniverseDefinition,
  universeDefinitions,
} from '../src/lib/universe.ts';
import type { RuleId } from '../src/lib/universe.ts';

const cases: { id: RuleId; random: number; expected: number[] }[] = [
  { id: 'constant-velocity', random: 0, expected: [4, 8, 12, 16, 20, 24, 28, 32] },
  { id: 'constant-acceleration', random: 0.5, expected: [2, 8, 18, 32, 50, 72, 98, 128] },
  { id: 'initial-velocity', random: 0.999, expected: [6, 16, 30, 48, 70, 96, 126, 160] },
];

for (const { id, random, expected } of cases) {
  test(`motion ${id} produces all eight correct displacements`, () => {
    const universe = createUniverse(() => random, 'motion');
    assert.equal(universe.id, 'motion');
    assert.equal(universe.ruleId, id);

    for (let time = 1; time <= 8; time += 1) {
      assert.equal(evaluateExperiment(universe, time), expected[time - 1]);
      assert.equal(evaluateRule(id, time), expected[time - 1]);
    }
  });
}

test('motion random selection uses three equal intervals containing only motion rules', () => {
  const selections: { random: number; expected: RuleId }[] = [
    { random: 0, expected: 'constant-velocity' },
    { random: 1 / 3 - Number.EPSILON, expected: 'constant-velocity' },
    { random: 1 / 3, expected: 'constant-acceleration' },
    { random: 2 / 3 - Number.EPSILON, expected: 'constant-acceleration' },
    { random: 2 / 3, expected: 'initial-velocity' },
    { random: 1 - Number.EPSILON, expected: 'initial-velocity' },
  ];

  for (const { random, expected } of selections) {
    assert.equal(createUniverse(() => random, 'motion').ruleId, expected);
  }
});

test('a motion universe samples its rule once and retains it for repeated experiments', () => {
  let randomCalls = 0;
  const universe = createUniverse(() => {
    randomCalls += 1;
    return 0.5;
  }, 'motion');

  assert.equal(evaluateExperiment(universe, 1), 2);
  assert.equal(evaluateExperiment(universe, 8), 128);
  assert.equal(evaluateExperiment(universe, 1), 2);
  assert.equal(randomCalls, 1);
});

test('motion input validation rejects invalid times and invalid random selections', () => {
  const universe = createUniverse(() => 0, 'motion');
  for (const time of [-1, 0, 9, 1.5, NaN, Infinity, -Infinity]) {
    assert.throws(() => evaluateExperiment(universe, time), RangeError);
  }
  for (const random of [-0.1, 1, NaN, Infinity, -Infinity]) {
    assert.throws(() => createUniverse(() => random, 'motion'), RangeError);
  }
});

test('the universe catalog supplies separate Chinese quantities, units, and hypotheses', () => {
  assert.deepEqual(universeDefinitions.map((definition) => definition.id), ['function', 'motion', 'probability']);
  const motion = getUniverseDefinition('motion');
  assert.equal(motion.name, '运动规律实验室');
  assert.deepEqual(motion.input, { symbol: 't', label: '时间 t（秒）', name: '时间', unit: '秒' });
  assert.deepEqual(motion.output, { symbol: 's', label: '位移 s（米）', name: '位移', unit: '米' });
  assert.equal(motion.predictionLabel, '你预测的位移 s');
  assert.deepEqual(motion.rules.map((rule) => rule.formula), ['s = 4t', 's = 2t²', 's = 4t + 2t²']);

  const math = getUniverseDefinition('function');
  assert.equal(createUniverse(() => 0).id, 'function');
  assert.equal(math.input.symbol, 'x');
  assert.equal(math.output.symbol, 'y');
  assert.equal(math.predictionLabel, '你预测的结果 y');
  assert.deepEqual(math.rules.map((rule) => rule.formula), ['y = 3x', 'y = 3x + 2', 'y = 3x²']);
});
