import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEvidenceChart } from '../src/lib/evidence.ts';
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
import type { UniverseId } from '../src/lib/universe.ts';
import type { ExperimentInput } from '../src/types.ts';

const domains: readonly UniverseId[] = ['function', 'motion', 'probability'];

function predictAndRun(
  session: ExperimentSession,
  input: ExperimentInput,
  prediction: string,
): ExperimentSession {
  return runExperiment(changePrediction(changeInput(session, input), prediction));
}

function evidenceFor(domain: UniverseId): ExperimentSession {
  let session = createSession(createUniverse(() => 0.5, domain));
  session = predictAndRun(session, domain === 'probability' ? { red: 7, blue: 1 } : 8, '25.5');
  return predictAndRun(session, domain === 'probability' ? { red: 2, blue: 7 } : 2, '0');
}

for (const domain of domains) {
  test(`${domain} evidence projects recorded predictions and observations in experiment order`, () => {
    let session = evidenceFor(domain);
    // Repeating the first input must add a new chronological point, not merge it.
    session = predictAndRun(session, domain === 'probability' ? { red: 7, blue: 1 } : 8, '50');
    const chart = buildEvidenceChart(session.experiments, domain, 320);

    assert.deepEqual(chart.points.map((point) => ({
      sequence: point.sequence,
      prediction: point.prediction,
      observation: point.observation,
    })), session.experiments.map((record) => ({
      sequence: record.id,
      prediction: record.prediction,
      observation: record.output,
    })));
    assert.deepEqual(chart.points.map((point) => point.sequence), [1, 2, 3]);
    assert.equal(chart.points[0]!.observation, chart.points[2]!.observation);
    assert.ok(chart.points[0]!.x < chart.points[1]!.x);
    assert.ok(chart.points[1]!.x < chart.points[2]!.x);
    assert.equal(chart.summary.count, 3);

    const expectedMean = session.experiments.reduce(
      (sum, record) => sum + Math.abs(record.output - record.prediction), 0,
    ) / session.experiments.length;
    assert.ok(Math.abs(chart.summary.meanAbsoluteError! - expectedMean) <= Number.EPSILON * Math.max(1, expectedMean));
    const latest = session.experiments[2]!;
    assert.equal(chart.summary.latestAbsoluteError, Math.abs(latest.output - latest.prediction));
  });
}

test('probability evidence retains unrounded fractions and absolute errors from percentage predictions', () => {
  let session = createSession(createUniverse(() => 0, 'probability'));
  session = predictAndRun(session, { red: 2, blue: 1 }, '33.33');
  session = predictAndRun(session, { red: 7, blue: 7 }, '25.001');
  const chart = buildEvidenceChart(session.experiments, 'probability', 320);
  const first = chart.points[0]!;

  assert.equal(first.prediction, 33.33 / 100);
  assert.equal(first.observation, (2 / 3) ** 2);
  assert.notEqual(first.observation, Number((first.observation * 100).toFixed(2)) / 100);
  assert.equal(chart.points[1]!.prediction, 25.001 / 100);
  assert.equal(chart.points[1]!.observation, 0.25);
  assert.equal(chart.summary.latestAbsoluteError, Math.abs(0.25 - 25.001 / 100));
});

test('charts remain empty until experiments run and exclude pending input and prediction changes', () => {
  for (const domain of domains) {
    const fresh = createSession(createUniverse(() => 0, domain));
    const draft = changePrediction(changeInput(fresh,
      domain === 'probability' ? { red: 7, blue: 7 } : 8), '50');
    const empty = buildEvidenceChart(draft.experiments, domain, 320);

    assert.deepEqual(empty.points, []);
    assert.equal(empty.predictionPath, '');
    assert.equal(empty.observationPath, '');
    assert.deepEqual(empty.summary, { count: 0, meanAbsoluteError: null, latestAbsoluteError: null });

    const observed = runExperiment(draft);
    const before = buildEvidenceChart(observed.experiments, domain, 320);
    const nextDraft = changePrediction(changeInput(observed,
      domain === 'probability' ? { red: 2, blue: 1 } : 1), '99.999');
    assert.deepEqual(buildEvidenceChart(nextDraft.experiments, domain, 320), before);
    assert.equal(before.points.length, 1);
    assert.equal(nextDraft.prediction, '99.999');
  }
});

test('chart derivation does not execute hidden rules or mutate session records and reflections', () => {
  for (const domain of domains) {
    let calculations = 0;
    const original = createUniverse(() => 0.5, domain);
    const universe = {
      ...original,
      rule: (input: ExperimentInput) => {
        calculations += 1;
        return original.rule(input);
      },
    };
    let session = predictAndRun(createSession(universe),
      domain === 'probability' ? { red: 2, blue: 1 } : 2, '50');
    session = predictAndRun(session, domain === 'probability' ? { red: 7, blue: 7 } : 8, '25');
    session = saveReflection(session, 1, '从记录中比较预测和结果。');
    const originalRecords = structuredClone(session.experiments);
    const before = buildEvidenceChart(session.experiments, domain, 320);
    assert.equal(calculations, 2);

    const edited = saveReflection(session, 1, '修改反思不会增加实验。');
    const cleared = saveReflection(edited, 2, '');
    assert.deepEqual(buildEvidenceChart(cleared.experiments, domain, 320), before);
    assert.equal(calculations, 2);
    assert.deepEqual(session.experiments, originalRecords);
    assert.equal(session.experiments[0]!.reflection, '从记录中比较预测和结果。');
    assert.equal(edited.experiments[0]!.reflection, '修改反思不会增加实验。');
  }
});

for (const domain of domains) {
  test(`${domain} session completion preserves evidence and all editing locks`, () => {
    const reflected = saveReflection(evidenceFor(domain), 1, '完成后仍能阅读反思和图表。');
    const before = buildEvidenceChart(reflected.experiments, domain, 320);
    const otherHypothesis = createUniverse(() => 0, domain).ruleId;
    for (const hypothesis of [reflected.universe.ruleId, otherHypothesis]) {
      const completed = submitHypothesis(selectHypothesis(reflected, hypothesis));

      assert.equal(completed.feedback?.correct, hypothesis === reflected.universe.ruleId);
      assert.strictEqual(completed.experiments, reflected.experiments);
      assert.deepEqual(buildEvidenceChart(completed.experiments, domain, 320), before);
      assert.strictEqual(changeInput(completed, domain === 'probability' ? { red: 2, blue: 1 } : 1), completed);
      assert.strictEqual(changePrediction(completed, '75'), completed);
      assert.strictEqual(runExperiment(completed), completed);
      assert.strictEqual(saveReflection(completed, 1, '无法编辑'), completed);
      assert.strictEqual(selectHypothesis(completed, otherHypothesis), completed);
      assert.strictEqual(submitHypothesis(completed), completed);
      assert.deepEqual(buildEvidenceChart(completed.experiments, domain, 320), before);
      assert.equal(completed.experiments[0]!.reflection, '完成后仍能阅读反思和图表。');
    }
  });

  test(`a new ${domain} universe resets evidence after progress or completion`, () => {
    const progressed = saveReflection(changePrediction(evidenceFor(domain), '75'), 1, '旧反思');
    const completed = submitHypothesis(selectHypothesis(progressed, progressed.universe.ruleId));
    for (const previous of [progressed, completed]) {
      const reset = resetSession(previous, createUniverse(() => 0, domain));
      const chart = buildEvidenceChart(reset.experiments, reset.universe.id, 320);

      assert.equal(reset.universe.id, domain);
      assert.deepEqual(chart.points, []);
      assert.deepEqual(chart.summary, { count: 0, meanAbsoluteError: null, latestAbsoluteError: null });
      assert.equal(reset.prediction, '');
      assert.equal(reset.selectedHypothesis, null);
      assert.equal(reset.feedback, null);
      assert.equal(reset.number, previous.number + 1);
      assert.equal(previous.experiments.length, 2);
      assert.equal(previous.experiments[0]!.reflection, '旧反思');

      const next = predictAndRun(reset, reset.input, '0');
      const nextChart = buildEvidenceChart(next.experiments, domain, 320);
      assert.deepEqual(nextChart.points.map((point) => point.sequence), [1]);
      assert.equal(nextChart.summary.count, 1);
      assert.equal(next.experiments[0]!.reflection, '');
    }
  });
}

test('switching between every pair of laboratories clears completed and incomplete chart evidence', () => {
  for (const source of domains) {
    const progressed = saveReflection(changePrediction(evidenceFor(source), '75'), 1, '旧实验室的反思');
    const completed = submitHypothesis(selectHypothesis(progressed, progressed.universe.ruleId));
    for (const destination of domains.filter((domain) => domain !== source)) {
      for (const previous of [progressed, completed]) {
        const switched = resetSession(previous, createUniverse(() => 0, destination));
        const chart = buildEvidenceChart(switched.experiments, destination, 320);

        assert.equal(switched.universe.id, destination);
        assert.deepEqual(switched.input, destination === 'probability' ? { red: 2, blue: 1 } : 1);
        assert.deepEqual(chart.points, []);
        assert.equal(chart.summary.count, 0);
        assert.equal(chart.summary.meanAbsoluteError, null);
        assert.equal(chart.summary.latestAbsoluteError, null);
        assert.equal(switched.prediction, '');
        assert.equal(switched.selectedHypothesis, null);
        assert.equal(switched.feedback, null);
        assert.equal(previous.experiments[0]!.reflection, '旧实验室的反思');
        assert.equal(previous.prediction, '75');
      }
    }
  }
});
