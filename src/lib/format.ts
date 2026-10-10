import type { ExperimentInput } from '../types.ts';
import { getUniverseDefinition } from './universe.ts';
import type { UniverseId } from './universe.ts';

export function formatInput(universeId: UniverseId, input: ExperimentInput): string {
  if (universeId === 'probability') {
    if (typeof input === 'number') throw new RangeError('Probability input requires red and blue ball counts.');
    return `红球 r = ${input.red} · 蓝球 b = ${input.blue}`;
  }
  if (typeof input !== 'number') throw new RangeError('This universe requires a single numeric input.');
  return `${getUniverseDefinition(universeId).input.label} = ${input}`;
}

export function formatOutput(universeId: UniverseId, value: number): string {
  return universeId === 'probability' ? `${(value * 100).toFixed(2)}%` : String(value);
}

export function formatDifference(universeId: UniverseId, value: number): string {
  if (universeId !== 'probability') return String(value);
  const formatted = (value * 100).toFixed(2);
  return formatted === '-0.00' ? '0.00' : formatted;
}
