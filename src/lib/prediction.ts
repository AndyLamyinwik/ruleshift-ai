import type { UniverseId } from './universe.ts';

export function parsePrediction(value: string, universeId: UniverseId = 'function'): number | null {
  const trimmed = value.trim();
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) return null;

  const prediction = Number(trimmed);
  if (!Number.isFinite(prediction)) return null;
  if (universeId === 'probability') {
    return prediction >= 0 && prediction <= 100 ? prediction / 100 : null;
  }
  return prediction;
}
