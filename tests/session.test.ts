import assert from 'node:assert/strict';
import test from 'node:test';
import {
  changeInput,
  changePrediction,
  createSession,
  resetSession,
  runExperiment,
  saveReflection,
  selectHypothesis,
  submitHypothesis,
} from '../src/lib/session.ts';
import type { ExperimentSession } from '../src/lib/session.ts';
import { createUniverse } from '../src/lib/universe.ts';

function withTwoInputs(): ExperimentSession {
  const firstExperiment = predictAndRun(createSession(createUniverse(() => 0)));
  return predictAndRun(changeInput(firstExperiment, 2));
}

function predictAndRun(session: ExperimentSession, prediction = '0'): ExperimentSession {
  return runExperiment(changePrediction(session, prediction));
}

test('a new session has no result or feedback until actions are taken', () => {
  const session = createSession(createUniverse(() => 0));
  const changed = changeInput(session, 8);

  assert.equal(session.input, 1);
  assert.equal(session.prediction, '');
  assert.equal(session.number, 1);
  assert.deepEqual(session.experiments, []);
  assert.equal(session.selectedHypothesis, null);
  assert.equal(session.feedback, null);
  assert.equal(changed.input, 8);
  assert.deepEqual(changed.experiments, []);
  assert.equal(changed.feedback, null);
});

test('submission needs both a selected hypothesis and two distinct experimental inputs', () => {
  const fresh = createSession(createUniverse(() => 0));
  const selected = selectHypothesis(fresh, 'proportional');
  const repeated = predictAndRun(predictAndRun(changeInput(selected, 2)));

  assert.strictEqual(submitHypothesis(fresh), fresh);
  assert.strictEqual(submitHypothesis(selected), selected);
  assert.strictEqual(submitHypothesis(repeated), repeated);
  assert.equal(repeated.experiments.length, 2);
  assert.equal(repeated.feedback, null);

  const noSelection = withTwoInputs();
  assert.strictEqual(submitHypothesis(noSelection), noSelection);

  const sufficient = predictAndRun(changeInput(repeated, 1));
  assert.equal(submitHypothesis(sufficient).feedback?.correct, true);
});

test('students can keep running experiments after selecting a hypothesis and gathering enough evidence', () => {
  const selected = selectHypothesis(withTwoInputs(), 'proportional');
  const additional = predictAndRun(changeInput(selected, 8));

  assert.deepEqual(additional.experiments, [
    { id: 1, input: 1, prediction: 0, output: 3, difference: 3, reflection: '' },
    { id: 2, input: 2, prediction: 0, output: 6, difference: 6, reflection: '' },
    { id: 3, input: 8, prediction: 0, output: 24, difference: 24, reflection: '' },
  ]);
  assert.equal(additional.selectedHypothesis, 'proportional');
  assert.equal(additional.feedback, null);
  assert.equal(selected.experiments.length, 2);
});

for (const hypothesis of ['proportional', 'quadratic'] as const) {
  test(`a completed session locks input, experiments, selection, and submission after a ${hypothesis} guess`, () => {
    const selected = selectHypothesis(withTwoInputs(), hypothesis);
    const completed = submitHypothesis(selected);

    assert.equal(completed.feedback?.correct, hypothesis === 'proportional');
    assert.strictEqual(completed.experiments, selected.experiments);
    assert.equal(completed.experiments.length, 2);
    assert.strictEqual(changeInput(completed, 8), completed);
    assert.strictEqual(changePrediction(completed, '24'), completed);
    assert.strictEqual(runExperiment(completed), completed);
    assert.strictEqual(saveReflection(completed, 1, '无法再编辑'), completed);
    assert.strictEqual(selectHypothesis(completed, 'offset'), completed);
    assert.strictEqual(submitHypothesis(completed), completed);
    assert.equal(completed.selectedHypothesis, hypothesis);
  });
}

test('a new universe clears history, selection, feedback, completion, and input while advancing its number', () => {
  const reflected = saveReflection(changePrediction(withTwoInputs(), '-5'), 1, '观察到了三倍关系');
  const completed = submitHypothesis(selectHypothesis(reflected, 'quadratic'));
  const universe = createUniverse(() => 0.5);
  const reset = resetSession(completed, universe);

  assert.strictEqual(reset.universe, universe);
  assert.equal(reset.number, completed.number + 1);
  assert.equal(reset.input, 1);
  assert.equal(reset.prediction, '');
  assert.deepEqual(reset.experiments, []);
  assert.equal(reset.selectedHypothesis, null);
  assert.equal(reset.feedback, null);
  assert.strictEqual(runExperiment(reset), reset);
  assert.equal(predictAndRun(reset).experiments[0]?.output, 5);
  assert.equal(selectHypothesis(reset, 'offset').selectedHypothesis, 'offset');
  assert.equal(completed.experiments.length, 2);
  assert.equal(completed.experiments[0]?.reflection, '观察到了三倍关系');
  assert.equal(completed.feedback?.correct, false);
});

test('reset also clears an incomplete session and a new universe that selects the same rule', () => {
  const experiment = predictAndRun(createSession(createUniverse(() => 0), 4));
  const incomplete = selectHypothesis(saveReflection(changePrediction(experiment, '8'), 1, '继续观察'), 'offset');
  const reset = resetSession(incomplete, createUniverse(() => 0));

  assert.notStrictEqual(reset.universe, incomplete.universe);
  assert.equal(reset.universe.ruleId, incomplete.universe.ruleId);
  assert.equal(reset.number, 5);
  assert.deepEqual(reset.experiments, []);
  assert.equal(reset.prediction, '');
  assert.equal(reset.selectedHypothesis, null);
  assert.equal(reset.feedback, null);
  assert.equal(predictAndRun(reset).experiments[0]?.output, 3);
});

test('an empty or invalid prediction cannot run an experiment or create an observation', () => {
  const fresh = createSession(createUniverse(() => 0));

  for (const prediction of ['', ' ', 'nope', 'NaN', 'Infinity', '1e309', '0x10']) {
    const session = changePrediction(fresh, prediction);
    assert.strictEqual(runExperiment(session), session);
    assert.deepEqual(session.experiments, []);
  }
});

test('experiments store the entered prediction and calculated observation, then clear only the draft', () => {
  for (const rule of [{ random: 0, output: 6 }, { random: 0.5, output: 8 }, { random: 0.999, output: 12 }]) {
    for (const prediction of ['0', '-4', '1.5', '1e2']) {
      const session = changePrediction(changeInput(createSession(createUniverse(() => rule.random)), 2), prediction);
      const result = runExperiment(session);

      assert.deepEqual(result.experiments, [{
        id: 1, input: 2, prediction: Number(prediction), output: rule.output,
        difference: rule.output - Number(prediction), reflection: '',
      }]);
      assert.equal(result.prediction, '');
      assert.equal(result.input, 2);
      assert.deepEqual(session.experiments, []);
      assert.equal(session.prediction, prediction);
      assert.strictEqual(runExperiment(result), result);
    }
  }
});

test('experiments remain chronological and repeated inputs create separate records', () => {
  let session = createSession(createUniverse(() => 0));
  session = predictAndRun(changeInput(session, 8), '20');
  session = predictAndRun(changeInput(session, 1), '-2');
  session = predictAndRun(changeInput(session, 8), '24');

  assert.deepEqual(session.experiments, [
    { id: 1, input: 8, prediction: 20, output: 24, difference: 4, reflection: '' },
    { id: 2, input: 1, prediction: -2, output: 3, difference: 5, reflection: '' },
    { id: 3, input: 8, prediction: 24, output: 24, difference: 0, reflection: '' },
  ]);
});

test('reflections can be saved, edited, and cleared on individual records', () => {
  const original = withTwoInputs();
  const saved = saveReflection(original, 1, '输入变大，输出也变大。');
  const edited = saveReflection(saved, 1, '输出似乎是输入的三倍。');
  const secondSaved = saveReflection(edited, 2, '需要比较不同的输入。');
  const cleared = saveReflection(secondSaved, 1, '');

  assert.equal(original.experiments[0]?.reflection, '');
  assert.equal(saved.experiments[0]?.reflection, '输入变大，输出也变大。');
  assert.equal(edited.experiments[0]?.reflection, '输出似乎是输入的三倍。');
  assert.strictEqual(saved.experiments[1], original.experiments[1]);
  assert.equal(secondSaved.experiments[0]?.reflection, edited.experiments[0]?.reflection);
  assert.equal(cleared.experiments[0]?.reflection, '');
  assert.equal(cleared.experiments[1]?.reflection, '需要比较不同的输入。');
  assert.equal(cleared.experiments.length, 2);
  assert.strictEqual(saveReflection(original, 999, '找不到的实验'), original);
});

test('reflections have a limit of 200 characters without splitting Unicode characters', () => {
  const session = withTwoInputs();
  const exact = '学'.repeat(200);
  const excess = `${'🔬'.repeat(199)}最后`;

  assert.equal(saveReflection(session, 1, exact).experiments[0]?.reflection, exact);
  const saved = saveReflection(session, 1, excess).experiments[0]!.reflection;
  assert.equal(Array.from(saved).length, 200);
  assert.equal(saved, `${'🔬'.repeat(199)}最`);
});

test('completing a session preserves reflections and blocks all experiment edits', () => {
  const reflected = saveReflection(saveReflection(withTwoInputs(), 1, '第一次观察'), 2, '第二次观察');
  const completed = submitHypothesis(selectHypothesis(reflected, 'proportional'));

  assert.equal(completed.feedback?.correct, true);
  assert.strictEqual(completed.experiments, reflected.experiments);
  assert.equal(completed.experiments[0]?.reflection, '第一次观察');
  assert.equal(completed.experiments[1]?.reflection, '第二次观察');
  assert.strictEqual(changeInput(completed, 3), completed);
  assert.strictEqual(changePrediction(completed, '9'), completed);
  assert.strictEqual(runExperiment(completed), completed);
  assert.strictEqual(saveReflection(completed, 1, '修改'), completed);
  assert.strictEqual(saveReflection(completed, 2, ''), completed);
});
