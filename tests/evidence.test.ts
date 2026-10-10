import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildEvidenceChart,
  formatAxisValue,
  formatEvidenceError,
  formatEvidenceValue,
} from '../src/lib/evidence.ts';
import type { EvidenceChartData } from '../src/lib/evidence.ts';
import type { ExperimentInput, ExperimentRecord } from '../src/types.ts';
import type { UniverseId } from '../src/lib/universe.ts';

function record(
  id: number,
  prediction: number,
  output: number,
  input: ExperimentInput = 1,
): ExperimentRecord {
  return { id, input, prediction, output, difference: output - prediction, reflection: '' };
}

function finiteGeometry(chart: EvidenceChartData): void {
  for (const value of [chart.width, chart.height, ...Object.values(chart.plot)]) {
    assert.equal(Number.isFinite(value), true);
  }
  for (const point of chart.points) {
    for (const value of [point.x, point.predictionY, point.observationY]) {
      assert.equal(Number.isFinite(value), true);
    }
    assert.ok(point.x >= chart.plot.left && point.x <= chart.plot.right);
    assert.ok(point.predictionY >= chart.plot.top && point.predictionY <= chart.plot.bottom);
    assert.ok(point.observationY >= chart.plot.top && point.observationY <= chart.plot.bottom);
  }
  for (const tick of chart.yTicks) {
    assert.equal(Number.isFinite(tick.value), true);
    assert.equal(Number.isFinite(tick.y), true);
  }
  assert.doesNotMatch(chart.predictionPath, /NaN|Infinity/);
  assert.doesNotMatch(chart.observationPath, /NaN|Infinity/);
}

test('an empty history has no plotted data, paths, or made-up error', () => {
  for (const id of ['function', 'motion', 'probability'] as const) {
    const chart = buildEvidenceChart([], id, 320);
    assert.deepEqual(chart.points, []);
    assert.deepEqual(chart.xTicks, []);
    assert.equal(chart.predictionPath, '');
    assert.equal(chart.observationPath, '');
    assert.deepEqual(chart.summary, {
      count: 0, meanAbsoluteError: null, latestAbsoluteError: null,
    });
    finiteGeometry(chart);
  }
});

test('chart data retains recorded predictions and observations at their full precision', () => {
  const prediction = 33.33 / 100;
  const observation = (2 / 3) ** 2;
  const chart = buildEvidenceChart([record(1, prediction, observation, { red: 2, blue: 1 })], 'probability', 400);
  assert.equal(chart.points[0]?.prediction, prediction);
  assert.equal(chart.points[0]?.observation, observation);
  assert.notEqual(chart.points[0]?.observation, 0.4444);
  assert.equal(chart.summary.latestAbsoluteError, observation - prediction);
  assert.equal(chart.summary.meanAbsoluteError, observation - prediction);
  assert.deepEqual(chart.yTicks.map((tick) => tick.value), [0, 0.25, 0.5, 0.75, 1]);
  finiteGeometry(chart);
});

test('the horizontal axis follows history order rather than input value or sequence sorting', () => {
  const experiments = [record(7, 10, 24, 8), record(3, 0, 3, 1), record(9, 5, 6, 2)];
  const chart = buildEvidenceChart(experiments, 'function', 500);
  assert.deepEqual(chart.points.map((point) => point.sequence), [7, 3, 9]);
  assert.deepEqual(chart.points.map((point) => point.observation), [24, 3, 6]);
  assert.ok(chart.points[0]!.x < chart.points[1]!.x);
  assert.ok(chart.points[1]!.x < chart.points[2]!.x);
  assert.deepEqual(chart.xTicks.map((tick) => tick.sequence), [7, 3, 9]);
});

test('repeated scalar inputs remain individual data points in both original laboratories', () => {
  for (const id of ['function', 'motion'] as const) {
    const chart = buildEvidenceChart([record(1, 2, 6, 2), record(2, 5, 6, 2), record(3, 6, 6, 2)], id, 400);
    assert.equal(chart.points.length, 3);
    assert.deepEqual(chart.points.map((point) => point.prediction), [2, 5, 6]);
    assert.deepEqual(chart.points.map((point) => point.observation), [6, 6, 6]);
    assert.equal(new Set(chart.points.map((point) => point.x)).size, 3);
  }
});

test('identical ball-count pairs remain separate chronological probability points', () => {
  const input = { red: 2, blue: 1 };
  const chart = buildEvidenceChart([record(1, 0.4, 2 / 3, input), record(2, 0.5, 2 / 3, input)], 'probability', 320);
  assert.equal(chart.points.length, 2);
  assert.ok(chart.points[0]!.x < chart.points[1]!.x);
  assert.equal(chart.points[0]!.observationY, chart.points[1]!.observationY);
  assert.notEqual(chart.points[0]!.predictionY, chart.points[1]!.predictionY);
});

test('single experiments produce centered markers and finite paths without a fabricated second point', () => {
  for (const id of ['function', 'motion', 'probability'] as const) {
    const chart = buildEvidenceChart([record(1, 0.2, 0.3)], id, 320);
    assert.equal(chart.points.length, 1);
    assert.equal(chart.points[0]?.x, (chart.plot.left + chart.plot.right) / 2);
    assert.deepEqual(chart.xTicks, [{ sequence: 1, x: chart.points[0]!.x }]);
    assert.match(chart.predictionPath, /^M/);
    assert.doesNotMatch(chart.predictionPath, /L/);
    finiteGeometry(chart);
  }
});

test('negative values, zero, and decimal observations map monotonically to a finite scale', () => {
  const chart = buildEvidenceChart([
    record(1, -5.5, -2.25), record(2, 0, 0), record(3, 2.5, 5.25),
  ], 'function', 320);
  assert.ok(chart.points[0]!.predictionY > chart.points[0]!.observationY);
  assert.ok(chart.points[0]!.observationY > chart.points[1]!.observationY);
  assert.ok(chart.points[1]!.observationY > chart.points[2]!.predictionY);
  assert.ok(chart.points[2]!.predictionY > chart.points[2]!.observationY);
  assert.ok(chart.yTicks.some((tick) => tick.value < 0));
  assert.ok(chart.yTicks.some((tick) => tick.value > 0));
  finiteGeometry(chart);
});

test('identical positive, negative, and zero values never create a zero-span scale', () => {
  for (const value of [0, 2.5, -2.5]) {
    const chart = buildEvidenceChart([record(1, value, value), record(2, value, value)], 'motion', 320);
    assert.equal(chart.points[0]?.predictionY, chart.points[0]?.observationY);
    assert.equal(chart.points[0]?.predictionY, chart.points[1]?.predictionY);
    assert.deepEqual(chart.summary, { count: 2, meanAbsoluteError: 0, latestAbsoluteError: 0 });
    finiteGeometry(chart);
  }
});

test('opposite-sign extreme finite values do not overflow the chart scale or tick values', () => {
  for (const maximum of [1e308, Number.MAX_VALUE]) {
    const chart = buildEvidenceChart([
      record(1, -maximum, maximum), record(2, maximum, -maximum), record(3, 0, 0),
    ], 'function', 320);
    assert.equal(chart.points[0]?.predictionY, chart.plot.bottom);
    assert.equal(chart.points[0]?.observationY, chart.plot.top);
    assert.ok(chart.plot.left >= 76, 'reserve space for signed scientific tick labels');
    finiteGeometry(chart);
  }
});

test('very small normal and subnormal values retain finite distinguishable coordinates', () => {
  for (const value of [1e-308, Number.MIN_VALUE]) {
    const chart = buildEvidenceChart([record(1, -value, value), record(2, 0, 0)], 'motion', 320);
    assert.notEqual(chart.points[0]?.predictionY, chart.points[0]?.observationY);
    assert.equal(new Set(chart.yTicks.map((tick) => tick.value)).size, chart.yTicks.length);
    finiteGeometry(chart);
  }
});

test('the error summary uses absolute recorded differences and the latest chronological experiment', () => {
  const experiments = [record(1, 10, 4), record(2, -3, 2), record(3, 7, 7)];
  experiments[0]!.difference = 999;
  const chart = buildEvidenceChart(experiments, 'function', 320);
  assert.equal(chart.summary.count, 3);
  assert.ok(Math.abs(chart.summary.meanAbsoluteError! - 11 / 3) < Number.EPSILON * 4);
  assert.equal(chart.summary.latestAbsoluteError, 0);
});

test('probability errors retain fraction precision internally and display percentage points', () => {
  const chart = buildEvidenceChart([record(1, 0.5, 0.25), record(2, 0.4, 0.5)], 'probability', 320);
  assert.ok(Math.abs(chart.summary.meanAbsoluteError! - 0.175) < Number.EPSILON);
  assert.equal(chart.summary.latestAbsoluteError, Math.abs(0.5 - 0.4));
  assert.equal(formatEvidenceError('probability', chart.summary.meanAbsoluteError), '17.50 个百分点');
  assert.equal(formatEvidenceError('probability', chart.summary.latestAbsoluteError), '10.00 个百分点');
});

test('a mean of many large finite errors avoids an overflowing sum', () => {
  const experiments = Array.from({ length: 50 }, (_, index) => record(index + 1, -1e308, 0));
  const chart = buildEvidenceChart(experiments, 'function', 320);
  assert.equal(chart.summary.meanAbsoluteError, 1e308);
  assert.equal(chart.summary.latestAbsoluteError, 1e308);
});

test('a representable mean can be calculated even when one individual absolute error overflows', () => {
  const chart = buildEvidenceChart([
    record(1, -Number.MAX_VALUE, Number.MAX_VALUE), record(2, 0, 0),
    record(3, 0, 0), record(4, 0, 0),
  ], 'function', 320);
  assert.ok(Number.isFinite(chart.summary.meanAbsoluteError));
  assert.ok(Math.abs(chart.summary.meanAbsoluteError! / Number.MAX_VALUE - 0.5) < Number.EPSILON);
  assert.equal(chart.summary.latestAbsoluteError, 0);
});

test('genuinely unrepresentable errors are reported honestly rather than clamped', () => {
  const chart = buildEvidenceChart([record(1, -Number.MAX_VALUE, Number.MAX_VALUE)], 'function', 320);
  assert.equal(chart.summary.meanAbsoluteError, Infinity);
  assert.equal(chart.summary.latestAbsoluteError, Infinity);
  assert.equal(formatEvidenceError('function', chart.summary.meanAbsoluteError), '超出数值范围');
  finiteGeometry(chart);
});

test('narrow widths stay usable and long histories retain every point with thinned ticks', () => {
  for (const width of [0, 150, 200, 320, NaN, Infinity]) {
    const chart = buildEvidenceChart([record(1, 0, 1)], 'function', width);
    assert.ok(chart.width >= 200);
    finiteGeometry(chart);
  }
  const experiments = Array.from({ length: 100 }, (_, index) => record(index + 1, index, index + 1));
  const chart = buildEvidenceChart(experiments, 'function', 320);
  assert.ok(chart.width > 320);
  assert.equal(chart.points.length, 100);
  assert.ok(chart.xTicks.length < chart.points.length);
  assert.equal(chart.xTicks[0]?.sequence, 1);
  assert.equal(chart.xTicks.at(-1)?.sequence, 100);
  assert.equal(chart.predictionPath.split('L').length, 100);
  assert.ok(chart.points[1]!.x - chart.points[0]!.x >= 28);
  finiteGeometry(chart);
});

test('chart generation never modifies input records, reflections, or the history array', () => {
  const experiment = Object.freeze({ ...record(1, 0.4, 0.5, Object.freeze({ red: 2, blue: 2 })), reflection: '保持原样' });
  const experiments = Object.freeze([experiment]);
  const snapshot = structuredClone(experiments);
  buildEvidenceChart(experiments, 'probability', 320);
  assert.deepEqual(experiments, snapshot);
  assert.equal(experiments[0]?.reflection, '保持原样');
});

test('axis labels use readable ordinary values or scientific notation for extreme magnitudes', () => {
  assert.equal(formatAxisValue('function', 0), '0');
  assert.equal(formatAxisValue('motion', -2.5), '-2.5');
  assert.equal(formatAxisValue('function', 0.125), '0.125');
  assert.equal(formatAxisValue('function', 1e308), '1.00e+308');
  assert.equal(formatAxisValue('motion', -1e-308), '-1.00e-308');
  assert.equal(formatAxisValue('probability', 1 / 3), '33.33%');
  assert.equal(formatAxisValue('probability', 1), '100.00%');
});

test('evidence labels preserve existing value formatting and apply the correct universe units', () => {
  assert.equal(formatEvidenceValue('function', 12.3456789), '12.3456789');
  assert.equal(formatEvidenceValue('motion', -2.5), '-2.5 m');
  assert.equal(formatEvidenceValue('probability', 2 / 3), '66.67%');
  assert.equal(formatEvidenceError('function', 2.5), '2.5');
  assert.equal(formatEvidenceError('motion', 2.5), '2.5 m');
  assert.equal(formatEvidenceError('probability', 0.025), '2.50 个百分点');
  assert.equal(formatEvidenceError('probability', 0), '0.00 个百分点');
  for (const id of ['function', 'motion', 'probability'] as UniverseId[]) {
    assert.equal(formatEvidenceError(id, null), '—');
    assert.equal(formatEvidenceError(id, Infinity), '超出数值范围');
  }
});
