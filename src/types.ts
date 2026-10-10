export interface BallCounts {
  readonly red: number;
  readonly blue: number;
}

export type ExperimentInput = number | BallCounts;

export interface ExperimentRecord {
  id: number;
  input: ExperimentInput;
  prediction: number;
  output: number;
  difference: number;
  reflection: string;
}
