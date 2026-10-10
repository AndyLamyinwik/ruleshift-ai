import type { ExperimentInput, ExperimentRecord } from '../types';
import { parsePrediction } from '../lib/prediction';
import { formatDifference, formatInput, formatOutput } from '../lib/format';
import type { UniverseDefinition } from '../lib/universe';
import { ArrowRightIcon, FlaskIcon } from './Icons';

interface ExperimentPanelProps {
  definition: UniverseDefinition;
  input: ExperimentInput;
  prediction: string;
  latestExperiment: ExperimentRecord | undefined;
  completed: boolean;
  onInputChange: (input: ExperimentInput) => void;
  onPredictionChange: (prediction: string) => void;
  onRunExperiment: () => void;
}

const inputs = [1, 2, 3, 4, 5, 6, 7, 8];
const ballFields = [
  { key: 'red', name: '红球数量', symbol: 'r', values: [2, 3, 4, 5, 6, 7] },
  { key: 'blue', name: '蓝球数量', symbol: 'b', values: [1, 2, 3, 4, 5, 6, 7] },
] as const;

function InputChoices({ values, selected, name, label, unit = '', onChange }: {
  values: readonly number[];
  selected: number;
  name: string;
  label: string;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="input-options" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
      {values.map((value) => (
        <label className="input-option" key={value}>
          <input
            type="radio"
            name={name}
            value={value}
            checked={selected === value}
            onChange={() => onChange(value)}
            aria-label={`${label} ${value}${unit ? ` ${unit}` : ''}`}
          />
          <span>{value}</span>
        </label>
      ))}
    </div>
  );
}

export function ExperimentPanel({
  definition,
  input,
  prediction,
  latestExperiment,
  completed,
  onInputChange,
  onPredictionChange,
  onRunExperiment,
}: ExperimentPanelProps) {
  const probability = definition.id === 'probability';
  const validPrediction = parsePrediction(prediction, definition.id) !== null;

  return (
    <section className={`panel experiment-panel${probability ? ' is-probability' : ''}`} aria-labelledby="universe-title">
      <div className="panel-heading">
        <div className="heading-with-icon">
          <span className="icon-tile"><FlaskIcon /></span>
          <div>
            <h2 id="universe-title">{definition.title}</h2>
            <p>{definition.description}</p>
          </div>
        </div>
        <span className="secret-badge"><span />{completed ? '验证已完成' : '规则隐藏中'}</span>
      </div>

      <div className="function-chamber" aria-hidden="true">
        <div className="chamber-grid" />
        <div className="chamber-caption"><span />未知规则核心</div>
        <div className="experiment-flow">
          <div className="flow-node">
            <span className="flow-label">{definition.input.name}</span>
            <span className={`variable${probability ? ' ball-variables' : ''}`}>{definition.input.symbol}</span>
          </div>
          <div className="flow-line"><ArrowRightIcon /></div>
          <div className="mystery-core">
            <div className="core-orbit orbit-one" />
            <div className="core-orbit orbit-two" />
            <div className="core-circle">?</div>
            <span className="orbit-dot dot-one" />
            <span className="orbit-dot dot-two" />
          </div>
          <div className="flow-line"><ArrowRightIcon /></div>
          <div className="flow-node output-node">
            <span className="flow-label">{definition.output.name}</span>
            <span className="variable">{definition.output.symbol}</span>
          </div>
        </div>
        <p className="chamber-note">{completed ? '规律已揭晓，实验记录仍保留。' : '看不见规则，但可以观察它的作用。'}</p>
        <span className="chamber-corner corner-top" />
        <span className="chamber-corner corner-bottom" />
      </div>

      <form className="experiment-form" onSubmit={(event) => {
        event.preventDefault();
        if (validPrediction && !completed) onRunExperiment();
      }}>
        <fieldset disabled={completed}>
          <legend><span className="step-number">01</span>{probability ? '选择红球与蓝球数量' : <>选择{definition.input.name}{definition.input.unit ? '' : '值'} <span className="inline-variable">{definition.input.symbol}</span>{definition.input.unit && `（${definition.input.unit}）`}</>}</legend>
          <p className="field-hint">{probability ? '红球 r：2 到 7 个；蓝球 b：1 到 7 个。两种数量可以独立选择。' : '选择一个 1 到 8 之间的整数，看看会发生什么。'}</p>
          {typeof input === 'number' ? (
            <InputChoices
              values={inputs}
              selected={input}
              name="experiment-input"
              label={`${definition.input.name}${definition.input.unit ? '' : '值'}`}
              unit={definition.input.unit}
              onChange={onInputChange}
            />
          ) : (
            <div className="ball-count-fields">
              {ballFields.map((field) => (
                <fieldset key={field.key}>
                  <legend>{field.name} <span className="inline-variable">{field.symbol}</span></legend>
                  <InputChoices
                    values={field.values}
                    selected={input[field.key]}
                    name={`experiment-${field.key}`}
                    label={field.name}
                    onChange={(value) => onInputChange({ ...input, [field.key]: value })}
                  />
                </fieldset>
              ))}
            </div>
          )}
        </fieldset>
        <div className="prediction-field">
          <label htmlFor="prediction-input">{definition.predictionLabel}</label>
          <input
            className="prediction-input"
            id="prediction-input"
            name="prediction"
            type="number"
            step="any"
            min={probability ? 0 : undefined}
            max={probability ? 100 : undefined}
            inputMode="decimal"
            required
            disabled={completed}
            value={prediction}
            placeholder="先填写你的预测值"
            onChange={(event) => onPredictionChange(event.target.value)}
            aria-describedby="prediction-hint"
          />
          <p id="prediction-hint" className="field-hint">{completed ? '本宇宙的预测与实验已锁定。' : probability ? '请输入 0 到 100 的百分数，支持小数。运行后才会揭示理论概率。' : '请输入有限数字，支持零、负数与小数。运行后才会揭示实际结果。'}</p>
        </div>
        {probability && <p className="theory-note">实验输出为计算得到的理论成功概率，并非一次随机抽球的结果。</p>}
        <button className="run-button" type="submit" disabled={completed || !validPrediction} aria-describedby={completed ? 'experiment-completion' : 'prediction-hint'}>
          <FlaskIcon />运行实验<ArrowRightIcon />
        </button>
        {completed && <p className="completion-note" id="experiment-completion">本宇宙已完成验证。点击「新宇宙」开始下一次探索。</p>}
      </form>

      <div className={`result-panel${latestExperiment ? ' has-result' : ''}`} role="status" aria-live="polite" aria-atomic="true">
        <div>
          <span className="result-label"><span className="step-number">02</span>观察实验结果</span>
          <p>{latestExperiment ? `第 ${latestExperiment.id} 次实验 · ${formatInput(definition.id, latestExperiment.input)}` : '运行一次实验，让未知变成线索。'}</p>
          {latestExperiment && <p className="result-prediction">预测 {definition.output.symbol} = {formatOutput(definition.id, latestExperiment.prediction)}{definition.output.unit && !probability && ` ${definition.output.unit}`}</p>}
          {probability && latestExperiment && <p className="result-prediction">误差（实际 − 预测）：{formatDifference(definition.id, latestExperiment.difference)} 个百分点</p>}
        </div>
        <div className="result-value">
          <span className="result-variable">{probability ? '理论概率 P' : `实际 ${definition.output.unit ? definition.output.label : definition.output.symbol}`} =</span>
          <span className="result-number">{latestExperiment ? formatOutput(definition.id, latestExperiment.output) : '—'}</span>
        </div>
      </div>
    </section>
  );
}
