import assert from 'node:assert/strict';
import test from 'node:test';
import { getDistinctInputCount, verifyHypothesis } from '../src/lib/hypothesis.ts';
import { createUniverse } from '../src/lib/universe.ts';
import type { RuleId } from '../src/lib/universe.ts';
import type { ExperimentRecord } from '../src/types.ts';

const cases: { id: RuleId; random: number; formula: string; outputs: [number, number] }[] = [
  { id: 'constant-velocity', random: 0, formula: 's = 4t', outputs: [4, 8] },
  { id: 'constant-acceleration', random: 0.5, formula: 's = 2t²', outputs: [2, 8] },
  { id: 'initial-velocity', random: 0.999, formula: 's = 4t + 2t²', outputs: [6, 16] },
];

function history(outputs: readonly number[], inputs = [1, 2]): ExperimentRecord[] {
  return outputs.map((output, index) => ({
    id: index + 1,
    input: inputs[index]!,
    prediction: 0,
    output,
    difference: output,
    reflection: '',
  }));
}

for (const actual of cases) {
  test(`verifies motion ${actual.id} with physical explanation and recorded units`, () => {
    const feedback = verifyHypothesis(
      createUniverse(() => actual.random, 'motion'), actual.id, history(actual.outputs),
    );

    assert.equal(feedback.correct, true);
    assert.equal(feedback.actualFormula, actual.formula);
    assert.match(feedback.explanation, /初始位移为 0 米/);
    assert.match(feedback.explanation, /速度/);
    assert.ok(feedback.example.includes('t = 1 秒'));
    assert.ok(feedback.example.includes(`= ${actual.outputs[0]} 米，`));
    assert.equal(feedback.mismatch, null);
    assert.doesNotMatch(feedback.example, /[xy] =/);
  });

  for (const guess of cases.filter((candidate) => candidate.id !== actual.id)) {
    test(`rejects motion ${guess.id} for actual ${actual.id} using recorded distinguishing evidence`, () => {
      const feedback = verifyHypothesis(
        createUniverse(() => actual.random, 'motion'), guess.id, history(actual.outputs),
      );
      const differingIndex = actual.outputs.findIndex((output, index) => output !== guess.outputs[index]);

      assert.equal(feedback.correct, false);
      assert.equal(feedback.actualFormula, actual.formula);
      assert.ok(feedback.mismatch?.includes(`t = ${differingIndex + 1} 秒`));
      assert.ok(feedback.mismatch?.includes(guess.formula));
      assert.ok(feedback.mismatch?.includes(`会得到 s = ${guess.outputs[differingIndex]} 米`));
      assert.ok(feedback.mismatch?.includes(`实验记录是 s = ${actual.outputs[differingIndex]} 米`));
      assert.ok(feedback.example.includes(`t = ${differingIndex + 1} 秒`));
      assert.ok(feedback.example.includes(`= ${actual.outputs[differingIndex]} 米，`));
      assert.doesNotMatch(feedback.mismatch!, /[xy] =/);
    });
  }
}

test('motion verification requires two distinct times despite repeated experiments', () => {
  const universe = createUniverse(() => 0, 'motion');
  const repeated = history([8, 8, 8], [2, 2, 2]);
  assert.equal(getDistinctInputCount(repeated), 1);
  assert.throws(() => verifyHypothesis(universe, 'constant-velocity', []), RangeError);
  assert.throws(() => verifyHypothesis(universe, 'constant-velocity', repeated), RangeError);

  const distinct = [...repeated, { ...repeated[0]!, id: 4, input: 3, output: 12, difference: 12 }];
  assert.equal(verifyHypothesis(universe, 'constant-velocity', distinct).correct, true);
});

test('motion feedback skips an agreeing observation and explains the distinguishing observation', () => {
  const feedback = verifyHypothesis(
    createUniverse(() => 0, 'motion'), 'constant-acceleration', history([8, 12], [2, 3]),
  );

  assert.equal(feedback.correct, false);
  assert.ok(feedback.example.includes('t = 3 秒'));
  assert.ok(feedback.example.includes('4 × 3 = 12 米'));
  assert.ok(feedback.mismatch?.includes('会得到 s = 18 米'));
  assert.ok(feedback.mismatch?.includes('实验记录是 s = 12 米'));
});

test('hypothesis verification rejects a rule belonging to a different universe', () => {
  assert.throws(
    () => verifyHypothesis(createUniverse(() => 0, 'motion'), 'proportional', history([4, 8])),
    RangeError,
  );
  assert.throws(
    () => verifyHypothesis(createUniverse(() => 0), 'constant-velocity', history([3, 6])),
    RangeError,
  );
});

test('motion acceleration explanations distinguish stationary and nonzero initial velocity', () => {
  const stationary = verifyHypothesis(
    createUniverse(() => 0.5, 'motion'), 'constant-acceleration', history([2, 8]),
  );
  const moving = verifyHypothesis(
    createUniverse(() => 0.999, 'motion'), 'initial-velocity', history([6, 16]),
  );
  assert.match(stationary.explanation, /初速度为 0 米\/秒，加速度恒为 4 米\/秒²/);
  assert.match(moving.explanation, /初速度为 4 米\/秒，加速度恒为 4 米\/秒²/);
  assert.ok(stationary.example.includes('2 × 1² = 2 米'));
  assert.ok(moving.example.includes('4 × 1 + 2 × 1² = 6 米'));
});
