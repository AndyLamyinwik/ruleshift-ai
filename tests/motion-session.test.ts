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

function predictAndRun(session: ExperimentSession, input: number, prediction = '0'): ExperimentSession {
  return runExperiment(changePrediction(changeInput(session, input), prediction));
}

function withMotionEvidence(): ExperimentSession {
  const first = predictAndRun(createSession(createUniverse(() => 0, 'motion')), 1);
  return predictAndRun(first, 2);
}

test('motion sessions start without an observation and reject empty or invalid predictions', () => {
  const fresh = createSession(createUniverse(() => 0, 'motion'));

  assert.equal(fresh.universe.id, 'motion');
  assert.equal(fresh.input, 1);
  assert.equal(fresh.prediction, '');
  assert.deepEqual(fresh.experiments, []);
  assert.equal(fresh.selectedHypothesis, null);
  assert.equal(fresh.feedback, null);

  for (const prediction of ['', ' ', 'invalid', 'NaN', 'Infinity', '-Infinity', '1e309', '0x10']) {
    const draft = changePrediction(fresh, prediction);
    assert.strictEqual(runExperiment(draft), draft);
    assert.deepEqual(draft.experiments, []);
  }
});

test('motion predictions accept zero, negative values, fractions, and scientific notation', () => {
  for (const prediction of ['0', '-4', '-1.25', '.5', '1e2']) {
    const draft = changePrediction(changeInput(createSession(createUniverse(() => 0.5, 'motion')), 3), prediction);
    const observed = runExperiment(draft);

    assert.deepEqual(observed.experiments, [{
      id: 1,
      input: 3,
      prediction: Number(prediction),
      output: 18,
      difference: 18 - Number(prediction),
      reflection: '',
    }]);
    assert.equal(observed.prediction, '');
    assert.equal(observed.input, 3);
    assert.equal(draft.prediction, prediction);
    assert.deepEqual(draft.experiments, []);
    assert.strictEqual(runExperiment(observed), observed);
  }
});

test('motion experiments preserve chronological order and keep repeated times as separate records', () => {
  let session = createSession(createUniverse(() => 0.999, 'motion'));
  session = predictAndRun(session, 8, '100');
  session = predictAndRun(session, 1, '-2');
  session = predictAndRun(session, 8, '160');

  assert.deepEqual(session.experiments, [
    { id: 1, input: 8, prediction: 100, output: 160, difference: 60, reflection: '' },
    { id: 2, input: 1, prediction: -2, output: 6, difference: 8, reflection: '' },
    { id: 3, input: 8, prediction: 160, output: 160, difference: 0, reflection: '' },
  ]);
});

test('motion hypothesis submission requires a choice and two distinct times', () => {
  const fresh = createSession(createUniverse(() => 0, 'motion'));
  const selected = selectHypothesis(fresh, 'constant-velocity');
  const repeated = predictAndRun(predictAndRun(selected, 2), 2);

  assert.strictEqual(submitHypothesis(fresh), fresh);
  assert.strictEqual(submitHypothesis(selected), selected);
  assert.strictEqual(submitHypothesis(repeated), repeated);
  assert.equal(repeated.experiments.length, 2);
  assert.equal(repeated.feedback, null);

  const sufficient = predictAndRun(repeated, 1);
  assert.equal(submitHypothesis(sufficient).feedback?.correct, true);
  const withoutSelection = withMotionEvidence();
  assert.strictEqual(submitHypothesis(withoutSelection), withoutSelection);
});

test('each session only accepts hypotheses from its own universe', () => {
  const motion = withMotionEvidence();
  const mathematical = createSession(createUniverse(() => 0));

  assert.strictEqual(selectHypothesis(motion, 'proportional'), motion);
  assert.strictEqual(selectHypothesis(motion, 'quadratic'), motion);
  assert.strictEqual(selectHypothesis(mathematical, 'constant-velocity'), mathematical);
  assert.strictEqual(selectHypothesis(mathematical, 'initial-velocity'), mathematical);
  assert.equal(selectHypothesis(motion, 'constant-acceleration').selectedHypothesis, 'constant-acceleration');
  assert.equal(selectHypothesis(mathematical, 'offset').selectedHypothesis, 'offset');
});

for (const rule of [
  { random: 0, id: 'constant-velocity', formula: 's = 4t', firstOutput: 4 },
  { random: 0.5, id: 'constant-acceleration', formula: 's = 2t²', firstOutput: 2 },
  { random: 0.999, id: 'initial-velocity', formula: 's = 4t + 2t²', firstOutput: 6 },
] as const) {
  test(`motion session verifies the correct ${rule.id} hypothesis with recorded evidence`, () => {
    const first = predictAndRun(createSession(createUniverse(() => rule.random, 'motion')), 1);
    const evidence = predictAndRun(first, 2);
    const completed = submitHypothesis(selectHypothesis(evidence, rule.id));

    assert.equal(completed.feedback?.correct, true);
    assert.equal(completed.feedback?.actualFormula, rule.formula);
    assert.match(completed.feedback!.example, /t = 1/);
    assert.ok(completed.feedback!.example.includes(`= ${rule.firstOutput}`));
    assert.equal(completed.feedback?.mismatch, null);
    assert.strictEqual(completed.experiments, evidence.experiments);
  });
}

test('an incorrect motion hypothesis uses a distinguishing recorded time in its feedback', () => {
  // At t = 2 these two rules both give 8, so t = 1 must supply the mismatch.
  const first = predictAndRun(createSession(createUniverse(() => 0, 'motion')), 2);
  const evidence = predictAndRun(first, 1);
  const completed = submitHypothesis(selectHypothesis(evidence, 'constant-acceleration'));

  assert.equal(completed.feedback?.correct, false);
  assert.equal(completed.feedback?.actualFormula, 's = 4t');
  assert.match(completed.feedback!.example, /t = 1/);
  assert.match(completed.feedback!.mismatch!, /t = 1/);
  assert.ok(completed.feedback!.mismatch!.includes('s = 2'));
  assert.ok(completed.feedback!.mismatch!.includes('s = 4'));
});

test('motion reflections can be saved, edited, cleared, and limited to 200 Unicode characters', () => {
  const original = withMotionEvidence();
  const saved = saveReflection(original, 1, '每秒的位移相同。');
  const edited = saveReflection(saved, 1, '位移与时间成正比。');
  const second = saveReflection(edited, 2, '还需要比较其他时间。');
  const cleared = saveReflection(second, 1, '');

  assert.equal(original.experiments[0]?.reflection, '');
  assert.equal(saved.experiments[0]?.reflection, '每秒的位移相同。');
  assert.equal(edited.experiments[0]?.reflection, '位移与时间成正比。');
  assert.strictEqual(saved.experiments[1], original.experiments[1]);
  assert.equal(cleared.experiments[0]?.reflection, '');
  assert.equal(cleared.experiments[1]?.reflection, '还需要比较其他时间。');
  assert.equal(cleared.experiments.length, 2);
  assert.strictEqual(saveReflection(original, 999, '未知实验'), original);

  const limited = saveReflection(original, 1, `${'🔬'.repeat(199)}继续`).experiments[0]!.reflection;
  assert.equal(limited, `${'🔬'.repeat(199)}继`);
  assert.equal(Array.from(limited).length, 200);
});

for (const hypothesis of ['constant-velocity', 'constant-acceleration'] as const) {
  test(`completing a motion session with ${hypothesis} locks experiments and reflections`, () => {
    const reflected = saveReflection(saveReflection(withMotionEvidence(), 1, '第一次观察'), 2, '第二次观察');
    const completed = submitHypothesis(selectHypothesis(reflected, hypothesis));

    assert.equal(completed.feedback?.correct, hypothesis === 'constant-velocity');
    assert.strictEqual(completed.experiments, reflected.experiments);
    assert.equal(completed.experiments[0]?.reflection, '第一次观察');
    assert.equal(completed.experiments[1]?.reflection, '第二次观察');
    assert.strictEqual(changeInput(completed, 8), completed);
    assert.strictEqual(changePrediction(completed, '32'), completed);
    assert.strictEqual(runExperiment(completed), completed);
    assert.strictEqual(saveReflection(completed, 1, '编辑'), completed);
    assert.strictEqual(saveReflection(completed, 2, ''), completed);
    assert.strictEqual(selectHypothesis(completed, 'initial-velocity'), completed);
    assert.strictEqual(submitHypothesis(completed), completed);
  });
}

test('a new motion universe clears all learning state and keeps the selected domain', () => {
  const evidence = saveReflection(changePrediction(changeInput(withMotionEvidence(), 8), '-5'), 1, '观察记录');
  const completed = submitHypothesis(selectHypothesis(evidence, 'constant-velocity'));
  const universe = createUniverse(() => 0.5, 'motion');
  const fresh = resetSession(completed, universe);

  assert.strictEqual(fresh.universe, universe);
  assert.equal(fresh.universe.id, 'motion');
  assert.equal(fresh.universe.ruleId, 'constant-acceleration');
  assert.equal(fresh.number, completed.number + 1);
  assert.equal(fresh.input, 1);
  assert.equal(fresh.prediction, '');
  assert.deepEqual(fresh.experiments, []);
  assert.equal(fresh.selectedHypothesis, null);
  assert.equal(fresh.feedback, null);
  assert.strictEqual(runExperiment(fresh), fresh);
  assert.equal(predictAndRun(fresh, 1).experiments[0]?.output, 2);
  assert.equal(selectHypothesis(fresh, 'constant-acceleration').selectedHypothesis, 'constant-acceleration');
  assert.equal(completed.experiments[0]?.reflection, '观察记录');
});

for (const destination of ['function', 'motion'] as const) {
  test(`switching to ${destination} starts a fresh session after progress or completion`, () => {
    const source = destination === 'motion' ? createUniverse(() => 0) : createUniverse(() => 0, 'motion');
    const sourceHypothesis = source.ruleId;
    const first = predictAndRun(createSession(source, 7), 8, '-1');
    const observed = predictAndRun(first, 2, '8');
    const progressed = selectHypothesis(saveReflection(changePrediction(observed, '99'), 1, '保留在旧会话'), sourceHypothesis);
    const completed = submitHypothesis(progressed);

    for (const previous of [progressed, completed]) {
      const universe = createUniverse(() => 0.999, destination);
      const switched = resetSession(previous, universe);

      assert.equal(switched.universe.id, destination);
      assert.strictEqual(switched.universe, universe);
      assert.equal(switched.number, 8);
      assert.equal(switched.input, 1);
      assert.equal(switched.prediction, '');
      assert.deepEqual(switched.experiments, []);
      assert.equal(switched.selectedHypothesis, null);
      assert.equal(switched.feedback, null);
      assert.equal(previous.experiments[0]?.reflection, '保留在旧会话');
      assert.equal(previous.prediction, '99');
      assert.equal(predictAndRun(switched, 1).experiments[0]?.output, destination === 'motion' ? 6 : 3);
    }
  });
}
