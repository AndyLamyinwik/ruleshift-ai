import type { ExperimentRecord } from '../types.ts';
import { formatDifference, formatOutput } from './format.ts';
import type { UniverseId } from './universe.ts';

export interface EvidencePoint {
  sequence: number;
  x: number;
  prediction: number;
  observation: number;
  predictionY: number;
  observationY: number;
}

export interface EvidenceChartData {
  width: number;
  height: number;
  plot: { left: number; right: number; top: number; bottom: number };
  points: EvidencePoint[];
  xTicks: { sequence: number; x: number }[];
  yTicks: { value: number; y: number }[];
  predictionPath: string;
  observationPath: string;
  summary: {
    count: number;
    meanAbsoluteError: number | null;
    latestAbsoluteError: number | null;
  };
}

function magnitude(experiments: readonly ExperimentRecord[]): number {
  let largest = 0;
  for (const experiment of experiments) {
    largest = Math.max(largest, Math.abs(experiment.prediction), Math.abs(experiment.output));
  }
  return largest;
}

function summarize(experiments: readonly ExperimentRecord[], scale: number): EvidenceChartData['summary'] {
  if (experiments.length === 0) {
    return { count: 0, meanAbsoluteError: null, latestAbsoluteError: null };
  }

  // A running mean avoids overflowing a sum of large finite errors.
  let mean = 0;
  let hasOverflowingError = false;
  let normalizedMean = 0;
  for (let index = 0; index < experiments.length; index += 1) {
    const experiment = experiments[index]!;
    const error = Math.abs(experiment.output - experiment.prediction);
    if (Number.isFinite(error)) mean += (error - mean) / (index + 1);
    else hasOverflowingError = true;
    // Normalization also allows a representable average when an individual
    // opposite-sign difference is larger than Number.MAX_VALUE.
    const normalizedError = scale === 0 ? 0
      : Math.abs(experiment.output / scale - experiment.prediction / scale);
    normalizedMean += (normalizedError - normalizedMean) / (index + 1);
  }
  const latest = experiments[experiments.length - 1]!;
  return {
    count: experiments.length,
    meanAbsoluteError: hasOverflowingError ? normalizedMean * scale : mean,
    latestAbsoluteError: Math.abs(latest.output - latest.prediction),
  };
}

export function buildEvidenceChart(
  experiments: readonly ExperimentRecord[],
  universeId: UniverseId,
  availableWidth: number,
): EvidenceChartData {
  const width = Math.max(
    200,
    Number.isFinite(availableWidth) ? Math.floor(availableWidth) : 320,
    94 + Math.max(0, experiments.length - 1) * 28,
  );
  const height = 240;
  const plot = { left: 76, right: width - 18, top: 16, bottom: 204 };
  const largest = magnitude(experiments);
  const scale = universeId === 'probability' || largest === 0 ? 1 : largest;
  let minimum = 0;
  let maximum = universeId === 'probability' || largest === 0 ? 1 : 0;
  if (universeId !== 'probability') {
    for (const experiment of experiments) {
      minimum = Math.min(minimum, experiment.prediction / scale, experiment.output / scale);
      maximum = Math.max(maximum, experiment.prediction / scale, experiment.output / scale);
    }
  }
  const span = maximum - minimum;
  const toY = (normalized: number) =>
    plot.bottom - ((normalized - minimum) / span) * (plot.bottom - plot.top);
  const toX = (index: number) => experiments.length <= 1
    ? (plot.left + plot.right) / 2
    : plot.left + (index / (experiments.length - 1)) * (plot.right - plot.left);

  const points = experiments.map((experiment, index): EvidencePoint => ({
    sequence: experiment.id,
    x: toX(index),
    prediction: experiment.prediction,
    observation: experiment.output,
    predictionY: toY(experiment.prediction / scale),
    observationY: toY(experiment.output / scale),
  }));
  const yTicks: EvidenceChartData['yTicks'] = [];
  for (let index = 0; index <= 4; index += 1) {
    const normalized = minimum + (index / 4) * span;
    const value = normalized * scale;
    // Subnormal values may round several ticks to the same number.
    if (!yTicks.some((tick) => tick.value === value)) {
      yTicks.push({ value: Object.is(value, -0) ? 0 : value, y: toY(value / scale) });
    }
  }

  const maximumTicks = Math.max(2, Math.floor((plot.right - plot.left) / 56) + 1);
  const tickStep = Math.max(1, Math.ceil((points.length - 1) / (maximumTicks - 1)));
  const xTicks = points.flatMap((point, index) =>
    index % tickStep === 0 || index === points.length - 1
      ? [{ sequence: point.sequence, x: point.x }] : []);
  const path = (coordinate: 'predictionY' | 'observationY') => points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point[coordinate]}`)
    .join(' ');

  return {
    width, height, plot, points, xTicks, yTicks,
    predictionPath: path('predictionY'),
    observationPath: path('observationY'),
    summary: summarize(experiments, largest),
  };
}

export function formatAxisValue(universeId: UniverseId, value: number): string {
  if (universeId === 'probability') return formatOutput(universeId, value);
  if (value === 0) return '0';
  const absolute = Math.abs(value);
  if (absolute >= 1e6 || absolute < 1e-4) return value.toExponential(2);
  return new Intl.NumberFormat('zh-CN', {
    maximumSignificantDigits: 4, useGrouping: false,
  }).format(value);
}

export function formatEvidenceValue(universeId: UniverseId, value: number): string {
  return `${formatOutput(universeId, value)}${universeId === 'motion' ? ' m' : ''}`;
}

export function formatEvidenceError(universeId: UniverseId, value: number | null): string {
  if (value === null) return '—';
  if (!Number.isFinite(value)) return '超出数值范围';
  if (universeId === 'probability') return `${formatDifference(universeId, value)} 个百分点`;
  return `${formatAxisValue(universeId, value)}${universeId === 'motion' ? ' m' : ''}`;
}
