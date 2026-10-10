import { evaluateExperiment, getUniverseDefinition } from './universe.ts';
import type { RuleId, Universe } from './universe.ts';
import { getDistinctInputCount, verifyHypothesis } from './hypothesis.ts';
import type { HypothesisFeedback } from './hypothesis.ts';
import type { ExperimentInput, ExperimentRecord } from '../types.ts';
import { parsePrediction } from './prediction.ts';

export interface ExperimentSession {
  universe: Universe;
  input: ExperimentInput;
  prediction: string;
  experiments: ExperimentRecord[];
  number: number;
  selectedHypothesis: RuleId | null;
  feedback: HypothesisFeedback | null;
}

export function createSession(universe: Universe, number = 1): ExperimentSession {
  return {
    universe,
    input: universe.id === 'probability' ? { red: 2, blue: 1 } : 1,
    prediction: '',
    experiments: [],
    number,
    selectedHypothesis: null,
    feedback: null,
  };
}

export function changeInput(session: ExperimentSession, input: ExperimentInput): ExperimentSession {
  return session.feedback !== null ? session : { ...session, input };
}

export function changePrediction(session: ExperimentSession, prediction: string): ExperimentSession {
  return session.feedback !== null ? session : { ...session, prediction };
}

export function runExperiment(session: ExperimentSession): ExperimentSession {
  if (session.feedback !== null) return session;
  const prediction = parsePrediction(session.prediction, session.universe.id);
  if (prediction === null) return session;
  const output = evaluateExperiment(session.universe, session.input);

  return {
    ...session,
    prediction: '',
    experiments: [...session.experiments, {
      id: session.experiments.length + 1,
      input: session.input,
      prediction,
      output,
      difference: output - prediction,
      reflection: '',
    }],
  };
}

export function saveReflection(session: ExperimentSession, id: number, reflection: string): ExperimentSession {
  if (session.feedback !== null || !session.experiments.some((experiment) => experiment.id === id)) return session;

  const savedReflection = Array.from(reflection).slice(0, 200).join('');
  return {
    ...session,
    experiments: session.experiments.map((experiment) => experiment.id === id
      ? { ...experiment, reflection: savedReflection }
      : experiment),
  };
}

export function selectHypothesis(session: ExperimentSession, id: RuleId): ExperimentSession {
  if (session.feedback !== null
    || !getUniverseDefinition(session.universe.id).rules.some((rule) => rule.id === id)) return session;

  return { ...session, selectedHypothesis: id };
}

export function submitHypothesis(session: ExperimentSession): ExperimentSession {
  if (session.feedback !== null || session.selectedHypothesis === null
    || getDistinctInputCount(session.experiments) < 2) return session;

  return {
    ...session,
    feedback: verifyHypothesis(session.universe, session.selectedHypothesis, session.experiments),
  };
}

export function resetSession(session: ExperimentSession, universe: Universe): ExperimentSession {
  return createSession(universe, session.number + 1);
}
