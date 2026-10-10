import assert from 'node:assert/strict';
import test from 'node:test';
import { getDistinctInputCount, verifyHypothesis } from '../src/lib/hypothesis.ts';
import { createUniverse } from '../src/lib/universe.ts';
import type { RuleId } from '../src/lib/universe.ts';
import type { ExperimentRecord } from '../src/types.ts';

const cases: { id: RuleId; random: number; formula: string; outputs: [number, number] }[] = [
  { id: 'proportional', random: 0, formula: 'y = 3x', outputs: [3, 6] },
  { id: 'offset', random: 0.5, formula: 'y = 3x + 2', outputs: [5, 8] },
  { id: 'quadratic', random: 0.999, formula: 'y = 3x²', outputs: [3, 12] },
];

function history(outputs: [number, number]): ExperimentRecord[] {
  return outputs.map((output, index) => ({ id: index + 1, input: index + 1, prediction: 0, output, difference: output, reflection: '' }));
}

for (const actual of cases) {
  test(`verifies the correct ${actual.id} hypothesis with a recorded numerical example`, () => {
    const feedback = verifyHypothesis(createUniverse(() => actual.random), actual.id, history(actual.outputs));

    assert.equal(feedback.correct, true);
    assert.equal(feedback.actualFormula, actual.formula);
    assert.match(feedback.explanation, /输入/);
    assert.ok(feedback.example.includes('x = 1'));
    assert.ok(feedback.example.includes(`= ${actual.outputs[0]}，`));
    assert.equal(feedback.mismatch, null);
  });

  for (const guess of cases.filter((candidate) => candidate.id !== actual.id)) {
    test(`rejects ${guess.id} when the actual rule is ${actual.id} using differing evidence`, () => {
      const feedback = verifyHypothesis(createUniverse(() => actual.random), guess.id, history(actual.outputs));
      const differingIndex = actual.outputs.findIndex((output, index) => output !== guess.outputs[index]);

      assert.equal(feedback.correct, false);
      assert.equal(feedback.actualFormula, actual.formula);
      assert.ok(feedback.mismatch?.includes(`x = ${differingIndex + 1}`));
      assert.ok(feedback.mismatch?.includes(guess.formula));
      assert.ok(feedback.mismatch?.includes(`会得到 y = ${guess.outputs[differingIndex]}`));
      assert.ok(feedback.mismatch?.includes(`实验记录是 y = ${actual.outputs[differingIndex]}`));
      assert.ok(feedback.example.includes(`x = ${differingIndex + 1}`));
      assert.ok(feedback.example.includes(`= ${actual.outputs[differingIndex]}，`));
    });
  }
}

test('verification needs two distinct inputs, even if an input was tested many times', () => {
  const universe = createUniverse(() => 0);
  const duplicateHistory = [
    { id: 1, input: 2, prediction: 0, output: 6, difference: 6, reflection: '' },
    { id: 2, input: 2, prediction: 0, output: 6, difference: 6, reflection: '' },
    { id: 3, input: 2, prediction: 0, output: 6, difference: 6, reflection: '' },
  ];

  assert.equal(getDistinctInputCount([]), 0);
  assert.equal(getDistinctInputCount(duplicateHistory), 1);
  assert.throws(() => verifyHypothesis(universe, 'proportional', []), RangeError);
  assert.throws(() => verifyHypothesis(universe, 'proportional', duplicateHistory), RangeError);

  const sufficientHistory = [...duplicateHistory, { id: 4, input: 8, prediction: 0, output: 24, difference: 24, reflection: '' }];
  assert.equal(getDistinctInputCount(sufficientHistory), 2);
  assert.equal(verifyHypothesis(universe, 'proportional', sufficientHistory).correct, true);
});

test('the quadratic explanation shows squaring in its numerical calculation', () => {
  const feedback = verifyHypothesis(createUniverse(() => 0.999), 'proportional', history([3, 12]));

  assert.match(feedback.explanation, /平方/);
  assert.ok(feedback.example.includes('3 × 2² = 12'));
  assert.ok(feedback.mismatch?.includes('x = 2'));
});
