import type { BallCounts, ExperimentInput } from '../types.ts';

type Rule = (input: ExperimentInput) => number;

export type UniverseId = 'function' | 'motion' | 'probability';
export type RuleId =
  | 'proportional'
  | 'offset'
  | 'quadratic'
  | 'constant-velocity'
  | 'constant-acceleration'
  | 'initial-velocity'
  | 'with-replacement'
  | 'without-replacement'
  | 'single-draw';

export interface RuleDefinition {
  readonly id: RuleId;
  readonly formula: string;
  readonly description?: string;
  readonly explanation: string;
  readonly calculate: Rule;
  readonly formatCalculation: (input: ExperimentInput) => string;
}

interface QuantityDefinition {
  readonly symbol: string;
  readonly label: string;
  readonly name: string;
  readonly unit: string;
}

export interface UniverseDefinition {
  readonly id: UniverseId;
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly explorationLabel: string;
  readonly input: QuantityDefinition;
  readonly output: QuantityDefinition;
  readonly predictionLabel: string;
  readonly rules: readonly RuleDefinition[];
}

export interface Universe {
  readonly id: UniverseId;
  readonly rule: Rule;
  readonly ruleId: RuleId;
}

export const universeDefinitions: readonly UniverseDefinition[] = [
  {
    id: 'function',
    name: '未知函数实验室',
    title: '未知函数',
    description: '每个输入，都是通往规律的线索。',
    explorationLabel: '数学探索',
    input: { symbol: 'x', label: '输入 x', name: '输入', unit: '' },
    output: { symbol: 'y', label: '输出 y', name: '输出', unit: '' },
    predictionLabel: '你预测的结果 y',
    rules: [
      {
        id: 'proportional',
        formula: 'y = 3x',
        explanation: '这个宇宙把输入乘以 3：输出总是输入的 3 倍。',
        calculate: (input) => 3 * scalarInput(input),
        formatCalculation: (input) => `3 × ${scalarInput(input)}`,
      },
      {
        id: 'offset',
        formula: 'y = 3x + 2',
        explanation: '这个宇宙先把输入乘以 3，再加上 2：输出比输入的 3 倍多 2。',
        calculate: (input) => 3 * scalarInput(input) + 2,
        formatCalculation: (input) => `3 × ${scalarInput(input)} + 2`,
      },
      {
        id: 'quadratic',
        formula: 'y = 3x²',
        explanation: '这个宇宙先把输入平方，再乘以 3：输出随输入的平方变化。',
        calculate: (input) => 3 * scalarInput(input) ** 2,
        formatCalculation: (input) => `3 × ${scalarInput(input)}²`,
      },
    ],
  },
  {
    id: 'motion',
    name: '运动规律实验室',
    title: '运动规律',
    description: '初始位移为 0 米，观察时间与位移的关系。',
    explorationLabel: '运动探索',
    input: { symbol: 't', label: '时间 t（秒）', name: '时间', unit: '秒' },
    output: { symbol: 's', label: '位移 s（米）', name: '位移', unit: '米' },
    predictionLabel: '你预测的位移 s',
    rules: [
      {
        id: 'constant-velocity',
        formula: 's = 4t',
        explanation: '初始位移为 0 米，物体以恒定速度 4 米/秒运动。时间每增加 1 秒，位移就增加 4 米。',
        calculate: (input) => 4 * scalarInput(input),
        formatCalculation: (input) => `4 × ${scalarInput(input)}`,
      },
      {
        id: 'constant-acceleration',
        formula: 's = 2t²',
        explanation: '初始位移为 0 米，初速度为 0 米/秒，加速度恒为 4 米/秒²。位移等于时间平方的 2 倍，体现了从静止开始的匀加速运动。',
        calculate: (input) => 2 * scalarInput(input) ** 2,
        formatCalculation: (input) => `2 × ${scalarInput(input)}²`,
      },
      {
        id: 'initial-velocity',
        formula: 's = 4t + 2t²',
        explanation: '初始位移为 0 米，初速度为 4 米/秒，加速度恒为 4 米/秒²。位移由初速度带来的 4t 和加速度带来的 2t² 两部分相加得到。',
        calculate: (input) => {
          const time = scalarInput(input);
          return 4 * time + 2 * time ** 2;
        },
        formatCalculation: (input) => {
          const time = scalarInput(input);
          return `4 × ${time} + 2 × ${time}²`;
        },
      },
    ],
  },
  {
    id: 'probability',
    name: '概率探索实验室',
    title: '概率探索',
    description: '改变红球与蓝球的数量，探索神秘机器的成功概率。结果是计算得到的理论概率，不是随机抽球的结果。',
    explorationLabel: '概率探索',
    input: { symbol: 'r, b', label: '红球 r / 蓝球 b', name: '球数', unit: '个' },
    output: { symbol: 'P', label: '理论成功概率 P', name: '理论概率', unit: '%' },
    predictionLabel: '你预测的成功概率（%）',
    rules: [
      {
        id: 'with-replacement',
        formula: 'P = (r / (r + b))²',
        description: '有放回地抽两次：两次都是红球才成功。',
        explanation: '机器有放回地抽两次，两次都是红球才成功。第一次抽球后放回，第二次抽到红球的概率仍为 r / (r + b)，所以成功概率是这两个概率的乘积。这是理论概率，不是一次随机抽球的结果。',
        calculate: (input) => {
          const { red, blue } = ballInput(input);
          return (red / (red + blue)) ** 2;
        },
        formatCalculation: (input) => {
          const { red, blue } = ballInput(input);
          return `(${red} / (${red} + ${blue}))²`;
        },
      },
      {
        id: 'without-replacement',
        formula: 'P = (r / (r + b)) × ((r - 1) / (r + b - 1))',
        description: '无放回地抽两次：两次都是红球才成功。',
        explanation: '机器无放回地抽两次，两次都是红球才成功。第一次抽到红球的概率为 r / (r + b)；取走一颗红球后，第二次抽到红球的概率为 (r - 1) / (r + b - 1)，相乘得到成功概率。这是理论概率，不是一次随机抽球的结果。',
        calculate: (input) => {
          const { red, blue } = ballInput(input);
          return (red / (red + blue)) * ((red - 1) / (red + blue - 1));
        },
        formatCalculation: (input) => {
          const { red, blue } = ballInput(input);
          return `(${red} / (${red} + ${blue})) × ((${red} - 1) / (${red} + ${blue} - 1))`;
        },
      },
      {
        id: 'single-draw',
        formula: 'P = r / (r + b)',
        description: '只抽一次：抽到红球就成功。',
        explanation: '机器只抽一次，抽到红球就成功。共有 r + b 颗球，其中 r 颗是红球，所以成功概率为 r / (r + b)。这是一次抽取的理论概率，不是抽到两颗红球的概率，也不是一次随机抽球的结果。',
        calculate: (input) => {
          const { red, blue } = ballInput(input);
          return red / (red + blue);
        },
        formatCalculation: (input) => {
          const { red, blue } = ballInput(input);
          return `${red} / (${red} + ${blue})`;
        },
      },
    ],
  },
];

export function getUniverseDefinition(id: UniverseId): UniverseDefinition {
  return universeDefinitions.find((definition) => definition.id === id)!;
}

export function createUniverse(
  random: () => number = Math.random,
  universeId: UniverseId = 'function',
): Universe {
  const selection = random();

  if (!Number.isFinite(selection) || selection < 0 || selection >= 1) {
    throw new RangeError('Random selection must be between 0 (inclusive) and 1 (exclusive).');
  }

  const rules = getUniverseDefinition(universeId).rules;
  const rule = rules[Math.floor(selection * rules.length)]!;
  return { id: universeId, rule: rule.calculate, ruleId: rule.id };
}

function scalarInput(input: ExperimentInput): number {
  if (typeof input !== 'number' || !Number.isInteger(input) || input < 1 || input > 8) {
    throw new RangeError('Experiment input must be an integer between 1 and 8.');
  }
  return input;
}

function ballInput(input: ExperimentInput): BallCounts {
  if (typeof input !== 'object' || input === null
    || !Number.isInteger(input.red) || input.red < 2 || input.red > 7
    || !Number.isInteger(input.blue) || input.blue < 1 || input.blue > 7) {
    throw new RangeError('Ball counts must be integers: red between 2 and 7, blue between 1 and 7.');
  }
  return input;
}

export function evaluateExperiment(universe: Universe, input: ExperimentInput): number {
  if (universe.id === 'probability') ballInput(input);
  else scalarInput(input);
  return universe.rule(input);
}

export function evaluateRule(ruleId: RuleId, input: ExperimentInput): number {
  const rule = universeDefinitions.flatMap((definition) => definition.rules)
    .find((candidate) => candidate.id === ruleId)!;
  return rule.calculate(input);
}
