import type { HypothesisFeedback } from '../lib/hypothesis';
import type { RuleId, UniverseDefinition } from '../lib/universe';
import { ObservationIcon } from './Icons';

interface HypothesisPanelProps {
  definition: UniverseDefinition;
  selectedHypothesis: RuleId | null;
  distinctInputCount: number;
  feedback: HypothesisFeedback | null;
  onSelectHypothesis: (hypothesis: RuleId) => void;
  onSubmitHypothesis: () => void;
}

export function HypothesisPanel({
  definition,
  selectedHypothesis,
  distinctInputCount,
  feedback,
  onSelectHypothesis,
  onSubmitHypothesis,
}: HypothesisPanelProps) {
  const probability = definition.id === 'probability';
  const completed = feedback !== null;
  const enoughExperiments = distinctInputCount >= 2;
  const canSubmit = enoughExperiments && selectedHypothesis !== null && !completed;
  const requirement = completed
    ? '答案已锁定。实验记录已保留，点击「新宇宙」继续探索。'
    : !enoughExperiments
      ? probability
        ? `请先用至少两组不同的（r, b）组合运行实验（已完成 ${distinctInputCount} 组）。重复组合不计入条件。`
        : `请先用至少两个不同的输入值运行实验（已完成 ${distinctInputCount} 个）。重复输入不计入条件。`
      : selectedHypothesis === null
        ? '实验条件已满足，请选择一条你认为符合观察结果的规律。'
        : '实验条件已满足。你可以现在验证，也可以继续实验，收集更多线索。';

  return (
    <section className={`panel hypothesis-panel${probability ? ' is-probability' : ''}`} aria-labelledby="hypothesis-title">
      <div className="panel-heading">
        <div className="heading-with-icon">
          <span className="icon-tile"><ObservationIcon /></span>
          <div>
            <h2 id="hypothesis-title">规律猜测</h2>
            <p>从观察到猜测，用实验记录支持你的想法。</p>
          </div>
        </div>
        <span className={`hypothesis-progress${completed ? ' is-complete' : ''}`}>
          {completed ? '本宇宙已完成' : enoughExperiments ? '实验条件已满足' : `不同${probability ? '组合' : '输入'} ${distinctInputCount}/2`}
        </span>
      </div>

      <form onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onSubmitHypothesis();
      }}>
        <fieldset disabled={completed}>
          <legend className="sr-only">{probability ? '选择一种抽取方式与成功条件' : `选择一条${definition.id === 'function' ? '数学' : '运动'}规律`}</legend>
          <div className="hypothesis-options">
            {definition.rules.map((option) => (
              <label className="hypothesis-option" key={option.id}>
                <input
                  type="radio"
                  name="hypothesis"
                  value={option.id}
                  checked={selectedHypothesis === option.id}
                  onChange={() => onSelectHypothesis(option.id)}
                />
                <span className="hypothesis-card">
                  <span className="hypothesis-radio" aria-hidden="true" />
                  <span className="hypothesis-content">
                    <span className="hypothesis-formula">{option.formula}</span>
                    {option.description && <span className="hypothesis-description">{option.description}</span>}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="hypothesis-actions">
          <p id="hypothesis-requirement" aria-live="polite">{requirement}</p>
          <button className="run-button verify-button" type="submit" disabled={!canSubmit} aria-describedby="hypothesis-requirement">
            验证我的猜测
          </button>
        </div>
      </form>

      <div role="status" aria-live="polite" aria-atomic="true">
        {feedback && (
          <div className={`hypothesis-feedback ${feedback.correct ? 'is-correct' : 'is-incorrect'}`}>
            <h3>{feedback.correct ? '猜测正确！你发现了这个宇宙的规律。' : '猜测不正确，但实验给出了新的线索。'}</h3>
            <p className="revealed-rule">实际规律 <strong>{feedback.actualFormula}</strong></p>
            <p>{feedback.explanation}</p>
            <p className="feedback-example">{feedback.example}</p>
            {feedback.mismatch && <p className="feedback-mismatch">{feedback.mismatch}</p>}
            <p className="feedback-completion">本宇宙探索已完成，答案与实验已锁定。可以回看记录，或点击「新宇宙」再次探索。</p>
          </div>
        )}
      </div>
    </section>
  );
}
