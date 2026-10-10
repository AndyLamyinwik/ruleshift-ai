import assert from 'node:assert/strict';
import test from 'node:test';
import { getDistinctInputCount, verifyHypothesis } from '../src/lib/hypothesis.ts';
import { createUniverse } from '../src/lib/universe.ts';
import type { RuleId } from '../src/lib/universe.ts';
import type { ExperimentRecord } from '../src/types.ts';

const cases: { id: RuleId; random: number; formula: string; outputs: [number, number]; protocol: RegExp }[] = [
  { id: 'with-replacement', random: 0, formula: 'P = (r / (r + b))²', outputs: [(2 / 3) ** 2, 1 / 4], protocol: /放回/ },
  { id: 'without-replacement', random: 0.5, formula: 'P = (r / (r + b)) × ((r - 1) / (r + b - 1))', outputs: [(2 / 3) * (1 / 2), (7 / 14) * (6 / 13)], protocol: /(?:无|不)放回/ },
  { id: 'single-draw', random: 0.999, formula: 'P = r / (r + b)', outputs: [2 / 3, 1 / 2], protocol: /一次/ },
];

function history(outputs: readonly number[]): ExperimentRecord[] {
  return outputs.map((output, index) => ({
    id: index + 1,
    input: index === 0 ? { red: 2, blue: 1 } : { red: 7, blue: 7 },
    prediction: 0.5,
    output,
    difference: output - 0.5,
    reflection: '',
  }));
}

for (const actual of cases) {
  for (const guess of cases) {
    test(`probability verification checks ${guess.id} against ${actual.id} with recorded evidence`, () => {
      const records = history(actual.outputs);
      const feedback = verifyHypothesis(createUniverse(() => actual.random, 'probability'), guess.id, records);

      assert.equal(feedback.correct, actual.id === guess.id);
      assert.equal(feedback.actualFormula, actual.formula);
      assert.match(feedback.explanation, actual.protocol);
      assert.ok(feedback.example.includes('红球 r = 2'));
      assert.ok(feedback.example.includes('蓝球 b = 1'));
      assert.ok(feedback.example.includes(`≈ ${(actual.outputs[0] * 100).toFixed(2)}%`));
      assert.match(feedback.example, /理论概率/);
      assert.doesNotMatch(feedback.example, /[xyt] =/);
      if (actual.id === guess.id) {
        assert.equal(feedback.mismatch, null);
      } else {
        assert.ok(feedback.mismatch?.includes('红球 r = 2'));
        assert.ok(feedback.mismatch?.includes('蓝球 b = 1'));
        assert.ok(feedback.mismatch?.includes(`会得到 P ≈ ${(guess.outputs[0] * 100).toFixed(2)}%`));
        assert.ok(feedback.mismatch?.includes(`理论概率是 P ≈ ${(actual.outputs[0] * 100).toFixed(2)}%`));
      }
      assert.equal(records[0]?.output, actual.outputs[0]);
    });
  }
}

test('distinct probability evidence uses both ball counts, including equal-ratio bags', () => {
  const record: ExperimentRecord = {
    id: 1, input: { red: 2, blue: 2 }, prediction: 0, output: 0.25, difference: 0.25, reflection: '',
  };
  const repeated = [record, { ...record, id: 2, input: { red: 2, blue: 2 } }];
  assert.equal(getDistinctInputCount(repeated), 1);
  assert.throws(() => verifyHypothesis(createUniverse(() => 0, 'probability'), 'with-replacement', repeated), RangeError);

  const differentRed = [...repeated, { ...record, id: 3, input: { red: 3, blue: 2 } }];
  const differentBlue = [...repeated, { ...record, id: 3, input: { red: 2, blue: 3 } }];
  const sameRatio = [...repeated, { ...record, id: 3, input: { red: 4, blue: 4 } }];
  assert.equal(getDistinctInputCount(differentRed), 2);
  assert.equal(getDistinctInputCount(differentBlue), 2);
  assert.equal(getDistinctInputCount(sameRatio), 2);
  assert.equal(verifyHypothesis(createUniverse(() => 0, 'probability'), 'with-replacement', sameRatio).correct, true);
});

test('probability mismatch comparison uses full-precision recorded values, not formatted percentages', () => {
  // A deliberately perturbed observation isolates comparison precision. Both values display as 33.33%.
  const selectedValue = (2 / 3) * (1 / 2);
  const records = history([selectedValue + Number.EPSILON, 1 / 4]);
  assert.equal((records[0]!.output * 100).toFixed(2), (selectedValue * 100).toFixed(2));

  const feedback = verifyHypothesis(createUniverse(() => 0, 'probability'), 'without-replacement', records);
  assert.equal(feedback.correct, false);
  assert.ok(feedback.mismatch?.includes('红球 r = 2'));
  assert.ok(feedback.mismatch?.includes('蓝球 b = 1'));
});

test('probability verification rejects a hypothesis from either existing universe', () => {
  const probability = createUniverse(() => 0, 'probability');
  const records = history(cases[0]!.outputs);
  for (const hypothesis of ['proportional', 'constant-velocity'] as const) {
    assert.throws(() => verifyHypothesis(probability, hypothesis, records), RangeError);
  }
});

test('single-draw feedback identifies one red draw and never calls it two red balls', () => {
  const feedback = verifyHypothesis(createUniverse(() => 0.999, 'probability'), 'single-draw', history([2 / 3, 1 / 2]));
  assert.match(feedback.explanation, /一次/);
  assert.match(feedback.explanation, /红球/);
  assert.match(feedback.explanation, /只抽一次，抽到红球就成功/);
  assert.doesNotMatch(feedback.explanation, /两次都是红球才成功|两颗红球才成功/);
});
