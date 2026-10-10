import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createUniverse, evaluateExperiment, evaluateRule, getUniverseDefinition,
} from '../src/lib/universe.ts';
import type { RuleId } from '../src/lib/universe.ts';
import type { BallCounts, ExperimentInput } from '../src/types.ts';

const cases: { id: RuleId; random: number; expected: (red: number, blue: number) => number }[] = [
  { id: 'with-replacement', random: 0, expected: (r, b) => (r / (r + b)) ** 2 },
  { id: 'without-replacement', random: 0.5, expected: (r, b) => (r / (r + b)) * ((r - 1) / (r + b - 1)) },
  { id: 'single-draw', random: 0.999, expected: (r, b) => r / (r + b) },
];

for (const { id, random, expected } of cases) {
  test(`probability ${id} calculates all 42 valid bags at full precision`, () => {
    const universe = createUniverse(() => random, 'probability');
    assert.equal(universe.id, 'probability');
    assert.equal(universe.ruleId, id);
    for (let red = 2; red <= 7; red += 1) {
      for (let blue = 1; blue <= 7; blue += 1) {
        const input = { red, blue };
        assert.equal(evaluateExperiment(universe, input), expected(red, blue));
        assert.equal(evaluateRule(id, input), expected(red, blue));
        assert.ok(evaluateExperiment(universe, input) > 0);
        assert.ok(evaluateExperiment(universe, input) < 1);
      }
    }
  });
}

test('probability models calculate red and blue boundary combinations correctly', () => {
  const inputs: BallCounts[] = [
    { red: 2, blue: 1 }, { red: 2, blue: 7 }, { red: 7, blue: 1 }, { red: 7, blue: 7 },
  ];
  for (const { id, expected } of cases) {
    for (const { red, blue } of inputs) {
      assert.equal(evaluateRule(id, { red, blue }), expected(red, blue));
    }
  }
  assert.equal(evaluateRule('with-replacement', { red: 2, blue: 2 }), 0.25);
  assert.equal(evaluateRule('without-replacement', { red: 2, blue: 2 }), 1 / 6);
  assert.equal(evaluateRule('single-draw', { red: 2, blue: 2 }), 0.5);
});

test('probability protocols remain mathematically distinct for every valid bag', () => {
  for (let red = 2; red <= 7; red += 1) {
    for (let blue = 1; blue <= 7; blue += 1) {
      const input = { red, blue };
      const without = evaluateRule('without-replacement', input);
      const withReplacement = evaluateRule('with-replacement', input);
      const single = evaluateRule('single-draw', input);
      assert.ok(without < withReplacement && withReplacement < single);
    }
  }
});

test('probability rejects out-of-range, fractional, non-finite, and scalar inputs', () => {
  const universe = createUniverse(() => 0, 'probability');
  const invalid: ExperimentInput[] = [
    1, 8, NaN,
    ...[0, 1, 8, -1, 2.5, NaN, Infinity, -Infinity].map((red) => ({ red, blue: 1 })),
    ...[0, 8, -1, 1.5, NaN, Infinity, -Infinity].map((blue) => ({ red: 2, blue })),
  ];
  for (const input of invalid) {
    assert.throws(() => evaluateExperiment(universe, input), RangeError);
    for (const { id } of cases) assert.throws(() => evaluateRule(id, input), RangeError);
  }
});

test('scalar universes reject probability inputs while retaining their original results', () => {
  const input = { red: 2, blue: 1 };
  for (const id of ['function', 'motion'] as const) {
    const universe = createUniverse(() => 0.5, id);
    assert.throws(() => evaluateExperiment(universe, input), RangeError);
    assert.equal(evaluateExperiment(universe, 2), 8);
  }
  assert.throws(() => evaluateRule('offset', input), RangeError);
  assert.throws(() => evaluateRule('constant-acceleration', input), RangeError);
});

test('probability random selection uses three equal intervals and rejects invalid selections', () => {
  const boundaries: [number, RuleId][] = [
    [0, 'with-replacement'], [1 / 3 - Number.EPSILON, 'with-replacement'],
    [1 / 3, 'without-replacement'], [2 / 3 - Number.EPSILON, 'without-replacement'],
    [2 / 3, 'single-draw'], [1 - Number.EPSILON, 'single-draw'],
  ];
  for (const [random, expected] of boundaries) {
    assert.equal(createUniverse(() => random, 'probability').ruleId, expected);
  }
  for (const random of [-1, 1, 2, NaN, Infinity, -Infinity]) {
    assert.throws(() => createUniverse(() => random, 'probability'), RangeError);
  }
});

test('a probability universe selects once and retains its protocol across different bags and repeats', () => {
  let randomCalls = 0;
  const universe = createUniverse(() => { randomCalls += 1; return 0.5; }, 'probability');
  for (const input of [{ red: 2, blue: 1 }, { red: 7, blue: 7 }, { red: 2, blue: 1 }]) {
    assert.equal(evaluateExperiment(universe, input), cases[1]!.expected(input.red, input.blue));
  }
  assert.equal(randomCalls, 1);
  assert.equal(universe.ruleId, 'without-replacement');
});

test('new probability universes independently select their protocols', () => {
  const first = createUniverse(() => 0, 'probability');
  const second = createUniverse(() => 0.999, 'probability');
  const input = { red: 2, blue: 1 };
  assert.notEqual(first, second);
  assert.equal(first.ruleId, 'with-replacement');
  assert.equal(second.ruleId, 'single-draw');
  assert.equal(evaluateExperiment(first, input), 4 / 9);
  assert.equal(evaluateExperiment(second, input), 2 / 3);
});

test('probability catalog labels sampling protocols accurately and formats numerical evidence', () => {
  const definition = getUniverseDefinition('probability');
  assert.equal(definition.name, '概率探索实验室');
  assert.equal(definition.predictionLabel, '你预测的成功概率（%）');
  assert.equal(definition.output.symbol, 'P');
  assert.equal(definition.output.unit, '%');
  assert.match(definition.description, /理论概率/);
  assert.match(definition.description, /不是随机抽球的结果/);
  assert.deepEqual(definition.rules.map((rule) => rule.id), cases.map(({ id }) => id));
  assert.deepEqual(definition.rules.map((rule) => rule.formula), [
    'P = (r / (r + b))²',
    'P = (r / (r + b)) × ((r - 1) / (r + b - 1))',
    'P = r / (r + b)',
  ]);
  assert.match(definition.rules[0]!.description!, /有放回.*两次.*两次都是红球/);
  assert.match(definition.rules[1]!.description!, /无放回.*两次.*两次都是红球/);
  assert.match(definition.rules[2]!.description!, /只抽一次.*抽到红球/);
  assert.match(definition.rules[2]!.explanation, /只抽一次/);
  assert.match(definition.rules[2]!.explanation, /不是抽到两颗红球的概率/);
  assert.equal(definition.rules[0]!.formatCalculation({ red: 2, blue: 1 }), '(2 / (2 + 1))²');
  assert.equal(definition.rules[1]!.formatCalculation({ red: 2, blue: 1 }), '(2 / (2 + 1)) × ((2 - 1) / (2 + 1 - 1))');
  assert.equal(definition.rules[2]!.formatCalculation({ red: 2, blue: 1 }), '2 / (2 + 1)');
});
