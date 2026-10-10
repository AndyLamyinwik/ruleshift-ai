import { evaluateRule, getUniverseDefinition } from './universe.ts';
import type { RuleId, Universe } from './universe.ts';
import type { ExperimentRecord } from '../types.ts';
import { formatInput, formatOutput } from './format.ts';

export const hypothesisOptions: readonly { id: RuleId; formula: string }[] =
  getUniverseDefinition('function').rules.map(({ id, formula }) => ({ id, formula }));

export interface HypothesisFeedback {
  correct: boolean;
  actualFormula: string;
  explanation: string;
  example: string;
  mismatch: string | null;
}

export function getDistinctInputCount(experiments: readonly ExperimentRecord[]): number {
  return new Set(experiments.map(({ input }) => typeof input === 'number'
    ? `number:${input}`
    : `balls:${input.red},${input.blue}`)).size;
}

export function verifyHypothesis(
  universe: Universe,
  hypothesis: RuleId,
  experiments: readonly ExperimentRecord[],
): HypothesisFeedback {
  if (getDistinctInputCount(experiments) < 2) {
    throw new RangeError('Verification requires experiments with at least two distinct inputs.');
  }

  const definition = getUniverseDefinition(universe.id);
  const selectedRule = definition.rules.find((rule) => rule.id === hypothesis);
  if (!selectedRule) {
    throw new RangeError('The hypothesis must belong to the current universe.');
  }

  const actualRule = definition.rules.find((rule) => rule.id === universe.ruleId)!;
  const correct = hypothesis === universe.ruleId;
  const differingExperiment = correct ? undefined : experiments.find(
    (experiment) => evaluateRule(hypothesis, experiment.input) !== experiment.output,
  );
  const example = differingExperiment ?? experiments[0]!;
  if (universe.id === 'probability') {
    return {
      correct,
      actualFormula: actualRule.formula,
      explanation: actualRule.explanation,
      example: `当 ${formatInput(universe.id, example.input)} 时，P = ${actualRule.formatCalculation(example.input)} ≈ ${formatOutput(universe.id, example.output)}，与你记录的理论概率一致。`,
      mismatch: differingExperiment
        ? `当 ${formatInput(universe.id, differingExperiment.input)} 时，你选择的 ${selectedRule.formula} 会得到 P ≈ ${formatOutput(universe.id, evaluateRule(hypothesis, differingExperiment.input))}，但实验记录的理论概率是 P ≈ ${formatOutput(universe.id, differingExperiment.output)}，因此这条规律与观察不符。`
        : null,
    };
  }
  const inputUnit = definition.input.unit ? ` ${definition.input.unit}` : '';
  const outputUnit = definition.output.unit ? ` ${definition.output.unit}` : '';
  const inputSymbol = definition.input.symbol;
  const outputSymbol = definition.output.symbol;

  return {
    correct,
    actualFormula: actualRule.formula,
    explanation: actualRule.explanation,
    example: `当 ${inputSymbol} = ${example.input}${inputUnit} 时，${outputSymbol} = ${actualRule.formatCalculation(example.input)} = ${example.output}${outputUnit}，与你记录的实验结果一致。`,
    mismatch: differingExperiment
      ? `当 ${inputSymbol} = ${differingExperiment.input}${inputUnit} 时，你选择的 ${selectedRule.formula} 会得到 ${outputSymbol} = ${evaluateRule(hypothesis, differingExperiment.input)}${outputUnit}，但实验记录是 ${outputSymbol} = ${differingExperiment.output}${outputUnit}，因此这条规律与观察不符。`
      : null,
  };
}
