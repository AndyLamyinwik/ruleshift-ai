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
import { getDistinctInputCount } from '../src/lib/hypothesis.ts';
import { createUniverse } from '../src/lib/universe.ts';
import type { UniverseId } from '../src/lib/universe.ts';
import type { ExperimentInput } from '../src/types.ts';

function predictAndRun(session: ExperimentSession, input: ExperimentInput, prediction = '50'): ExperimentSession {
  return runExperiment(changePrediction(changeInput(session, input), prediction));
}

function withProbabilityEvidence(): ExperimentSession {
  const first = predictAndRun(createSession(createUniverse(() => 0, 'probability')), { red: 2, blue: 1 });
  return predictAndRun(first, { red: 7, blue: 7 }, '25');
}

test('a fresh probability session has ball counts but no calculated result or hypothesis', () => {
  const session = createSession(createUniverse(() => 0, 'probability'));
  assert.deepEqual(session.input, { red: 2, blue: 1 });
  assert.equal(session.prediction, '');
  assert.deepEqual(session.experiments, []);
  assert.equal(session.selectedHypothesis, null);
  assert.equal(session.feedback, null);
  assert.strictEqual(runExperiment(session), session);

  const changed = changeInput(session, { red: 7, blue: 7 });
  assert.deepEqual(changed.input, { red: 7, blue: 7 });
  assert.deepEqual(changed.experiments, []);
  assert.equal(changed.feedback, null);
});

test('probability experiments reject empty, invalid, and out-of-range percentage predictions', () => {
  const fresh = createSession(createUniverse(() => 0, 'probability'));
  for (const prediction of ['', ' ', 'nope', 'Infinity', 'NaN', '1e309', '0x10', '-1', '-0.01', '100.01', '101']) {
    const draft = changePrediction(fresh, prediction);
    assert.strictEqual(runExperiment(draft), draft);
    assert.deepEqual(draft.experiments, []);
  }
});

test('probability percentages accept zero, one hundred, and decimals while storing fractions', () => {
  for (const prediction of ['0', '100', '12.3456', '.5', '1e2']) {
    const initial = createSession(createUniverse(() => 0, 'probability'));
    const draft = changePrediction(initial, prediction);
    const observed = runExperiment(draft);
    const fraction = Number(prediction) / 100;
    const output = (2 / 3) ** 2;

    assert.deepEqual(observed.experiments, [{
      id: 1, input: { red: 2, blue: 1 }, prediction: fraction, output,
      difference: output - fraction, reflection: '',
    }]);
    assert.equal(observed.prediction, '');
    assert.deepEqual(observed.input, { red: 2, blue: 1 });
    assert.equal(draft.prediction, prediction);
    assert.deepEqual(draft.experiments, []);
    assert.strictEqual(runExperiment(observed), observed);
  }
});

test('all sampling protocols store unrounded observations and percentage-point differences as fractions', () => {
  for (const rule of [
    { random: 0, output: (2 / 3) ** 2 },
    { random: 0.5, output: (2 / 3) * (1 / 2) },
    { random: 0.999, output: 2 / 3 },
  ]) {
    const session = predictAndRun(createSession(createUniverse(() => rule.random, 'probability')), { red: 2, blue: 1 }, '33.33');
    const record = session.experiments[0]!;
    assert.equal(record.prediction, 33.33 / 100);
    assert.equal(record.output, rule.output);
    assert.equal(record.difference, rule.output - 33.33 / 100);
    assert.notEqual(record.output, Number((rule.output * 100).toFixed(2)) / 100);
  }
});

test('probability records stay chronological and repeated pairs remain separate observations', () => {
  let session = createSession(createUniverse(() => 0.999, 'probability'));
  session = predictAndRun(session, { red: 7, blue: 1 }, '80');
  session = predictAndRun(session, { red: 2, blue: 7 }, '20');
  session = predictAndRun(session, { red: 7, blue: 1 }, '87.5');

  assert.deepEqual(session.experiments, [
    { id: 1, input: { red: 7, blue: 1 }, prediction: 0.8, output: 7 / 8, difference: 7 / 8 - 0.8, reflection: '' },
    { id: 2, input: { red: 2, blue: 7 }, prediction: 0.2, output: 2 / 9, difference: 2 / 9 - 0.2, reflection: '' },
    { id: 3, input: { red: 7, blue: 1 }, prediction: 0.875, output: 7 / 8, difference: 0, reflection: '' },
  ]);
  assert.equal(getDistinctInputCount(session.experiments), 2);
});

test('probability submission needs a hypothesis and two distinct pairs, not repeated trials or different predictions', () => {
  const fresh = createSession(createUniverse(() => 0, 'probability'));
  const selected = selectHypothesis(fresh, 'with-replacement');
  const first = predictAndRun(selected, { red: 2, blue: 2 }, '20');
  const repeated = predictAndRun(first, { red: 2, blue: 2 }, '25');
  assert.strictEqual(submitHypothesis(fresh), fresh);
  assert.strictEqual(submitHypothesis(selected), selected);
  assert.strictEqual(submitHypothesis(repeated), repeated);
  assert.equal(repeated.experiments.length, 2);

  // The success probability remains the same, but the ball-count pair is distinct.
  const sufficient = predictAndRun(repeated, { red: 4, blue: 4 }, '25');
  assert.equal(submitHypothesis(sufficient).feedback?.correct, true);
  const noSelection = withProbabilityEvidence();
  assert.strictEqual(submitHypothesis(noSelection), noSelection);
});

test('probability reflections are editable per record, permit emptiness, and keep the 200-character limit', () => {
  const original = withProbabilityEvidence();
  const saved = saveReflection(original, 1, '红球比例会影响成功率。');
  const edited = saveReflection(saved, 1, '需要比较抽样方式。');
  const second = saveReflection(edited, 2, '这次预测吻合。');
  const cleared = saveReflection(second, 1, '');

  assert.equal(original.experiments[0]?.reflection, '');
  assert.equal(saved.experiments[0]?.reflection, '红球比例会影响成功率。');
  assert.equal(edited.experiments[0]?.reflection, '需要比较抽样方式。');
  assert.strictEqual(saved.experiments[1], original.experiments[1]);
  assert.equal(cleared.experiments[0]?.reflection, '');
  assert.equal(cleared.experiments[1]?.reflection, '这次预测吻合。');
  assert.equal(cleared.experiments[0]?.prediction, 0.5);
  assert.equal(cleared.experiments[0]?.output, (2 / 3) ** 2);
  assert.strictEqual(saveReflection(original, 99, '不存在'), original);
  assert.equal(saveReflection(original, 1, '🔬'.repeat(201)).experiments[0]?.reflection, '🔬'.repeat(200));
});

for (const hypothesis of ['with-replacement', 'without-replacement'] as const) {
  test(`probability completion after ${hypothesis} locks inputs, predictions, reflections, experiments, and guesses`, () => {
    const reflected = saveReflection(withProbabilityEvidence(), 1, '保持记录可见。');
    const completed = submitHypothesis(selectHypothesis(reflected, hypothesis));
    assert.equal(completed.feedback?.correct, hypothesis === 'with-replacement');
    assert.strictEqual(completed.experiments, reflected.experiments);
    assert.equal(completed.experiments[0]?.reflection, '保持记录可见。');
    assert.strictEqual(changeInput(completed, { red: 7, blue: 1 }), completed);
    assert.strictEqual(changePrediction(completed, '100'), completed);
    assert.strictEqual(runExperiment(completed), completed);
    assert.strictEqual(saveReflection(completed, 1, '编辑'), completed);
    assert.strictEqual(saveReflection(completed, 2, ''), completed);
    assert.strictEqual(selectHypothesis(completed, 'single-draw'), completed);
    assert.strictEqual(submitHypothesis(completed), completed);
  });
}

test('a new probability universe clears all progress while keeping the domain and resetting ball counts', () => {
  const progressed = selectHypothesis(saveReflection(changePrediction(withProbabilityEvidence(), '99'), 1, '旧反思'), 'with-replacement');
  for (const previous of [progressed, submitHypothesis(progressed)]) {
    const universe = createUniverse(() => 0.5, 'probability');
    const reset = resetSession(previous, universe);
    assert.strictEqual(reset.universe, universe);
    assert.equal(reset.universe.id, 'probability');
    assert.equal(reset.universe.ruleId, 'without-replacement');
    assert.equal(reset.number, previous.number + 1);
    assert.deepEqual(reset.input, { red: 2, blue: 1 });
    assert.equal(reset.prediction, '');
    assert.deepEqual(reset.experiments, []);
    assert.equal(reset.selectedHypothesis, null);
    assert.equal(reset.feedback, null);
    assert.strictEqual(runExperiment(reset), reset);
    assert.equal(predictAndRun(reset, reset.input).experiments[0]?.output, (2 / 3) * (1 / 2));
    assert.equal(previous.experiments[0]?.reflection, '旧反思');
  }
});

for (const source of ['function', 'motion', 'probability'] as const) {
  for (const destination of ['function', 'motion', 'probability'] as const) {
    if (source === destination) continue;
    test(`switching from ${source} to ${destination} resets both incomplete and completed sessions`, () => {
      const firstInput: ExperimentInput = source === 'probability' ? { red: 7, blue: 1 } : 8;
      const nextInput: ExperimentInput = source === 'probability' ? { red: 2, blue: 7 } : 2;
      let progressed = predictAndRun(createSession(createUniverse(() => 0, source), 5), firstInput);
      progressed = predictAndRun(progressed, nextInput);
      progressed = selectHypothesis(saveReflection(changePrediction(progressed, '75'), 1, '旧宇宙的线索'), progressed.universe.ruleId);

      for (const previous of [progressed, submitHypothesis(progressed)]) {
        const universe = createUniverse(() => 0.999, destination);
        const reset = resetSession(previous, universe);
        assert.strictEqual(reset.universe, universe);
        assert.equal(reset.number, 6);
        assert.deepEqual(reset.input, destination === 'probability' ? { red: 2, blue: 1 } : 1);
        assert.equal(reset.prediction, '');
        assert.deepEqual(reset.experiments, []);
        assert.equal(reset.selectedHypothesis, null);
        assert.equal(reset.feedback, null);
        assert.strictEqual(runExperiment(reset), reset);
        assert.equal(predictAndRun(reset, reset.input).experiments[0]?.output,
          destination === 'probability' ? 2 / 3 : destination === 'motion' ? 6 : 3);
        assert.equal(previous.experiments[0]?.reflection, '旧宇宙的线索');
        assert.equal(previous.prediction, '75');
      }
    });
  }
}

test('all three domains reject guesses that belong to another laboratory', () => {
  const cases: { id: UniverseId; own: 'proportional' | 'constant-velocity' | 'with-replacement' }[] = [
    { id: 'function', own: 'proportional' },
    { id: 'motion', own: 'constant-velocity' },
    { id: 'probability', own: 'with-replacement' },
  ];
  for (const actual of cases) {
    const session = createSession(createUniverse(() => 0, actual.id));
    assert.equal(selectHypothesis(session, actual.own).selectedHypothesis, actual.own);
    for (const wrong of cases.filter((candidate) => candidate.id !== actual.id)) {
      assert.strictEqual(selectHypothesis(session, wrong.own), session);
    }
  }
});

test('the original single-input domains keep unrestricted finite predictions and scalar observations', () => {
  for (const domain of ['function', 'motion'] as const) {
    const session = createSession(createUniverse(() => 0, domain));
    assert.equal(session.input, 1);
    for (const prediction of ['-10.5', '0', '101.25']) {
      const observed = predictAndRun(session, 3, prediction);
      assert.equal(observed.experiments[0]?.input, 3);
      assert.equal(observed.experiments[0]?.prediction, Number(prediction));
      assert.equal(observed.experiments[0]?.output, domain === 'function' ? 9 : 12);
    }
  }
});
