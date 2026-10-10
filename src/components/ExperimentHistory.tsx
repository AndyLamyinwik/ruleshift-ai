import type { ExperimentRecord } from '../types';
import type { UniverseDefinition } from '../lib/universe';
import { formatDifference, formatInput, formatOutput } from '../lib/format';
import { ObservationIcon } from './Icons';

interface ExperimentHistoryProps {
  definition: UniverseDefinition;
  experiments: ExperimentRecord[];
  completed: boolean;
  onSaveReflection: (id: number, reflection: string) => void;
}

export function ExperimentHistory({ definition, experiments, completed, onSaveReflection }: ExperimentHistoryProps) {
  const probability = definition.id === 'probability';
  return (
    <aside className="panel history-panel" aria-labelledby="history-title">
      <div className="history-heading">
        <div className="heading-with-icon">
          <ObservationIcon />
          <h2 id="history-title">推理时间线</h2>
        </div>
        <span className="history-count">{experiments.length}</span>
      </div>
      <p className="history-description">{probability ? '记录理论概率。误差 = 实际 − 预测，单位为百分点。' : <>先预测，再观察。差值 = 实际 − 预测。{definition.output.unit && `位移与差值的单位均为${definition.output.unit}。`}</>}</p>

      {experiments.length === 0 ? (
        <div className="empty-history">
          <div className="empty-history-icon"><ObservationIcon /><span /></div>
          <h3>探索，从第一次实验开始</h3>
          <p>选择输入、写下预测并运行实验，<br />你的推理记录会出现在这里。</p>
          <span className="empty-history-line" />
          <span className="empty-history-footnote">保持好奇，规律就在其中。</span>
        </div>
      ) : (
        <div className="history-content">
          <ol className="history-list" aria-label="推理时间线，按实验先后顺序排列">
            {experiments.map((experiment, index) => (
              <li className={index === experiments.length - 1 ? 'latest-record' : ''} key={experiment.id}>
                <div className="timeline-record-heading">
                  <span className="record-index">实验 {String(experiment.id).padStart(2, '0')}</span>
                  <span className="record-input">{formatInput(definition.id, experiment.input)}</span>
                </div>
                <dl className="timeline-values">
                  <div><dt>{probability ? '预测概率' : `预测 ${definition.output.symbol}`}</dt><dd>{formatOutput(definition.id, experiment.prediction)}</dd></div>
                  <div><dt>{probability ? '理论概率' : `实际 ${definition.output.symbol}`}</dt><dd className="record-output">{formatOutput(definition.id, experiment.output)}</dd></div>
                  <div><dt>{probability ? '误差（百分点）' : '差值'}</dt><dd className={`record-difference${experiment.difference === 0 ? ' is-exact' : ''}`}>{formatDifference(definition.id, experiment.difference)}</dd></div>
                </dl>
                {completed ? (
                  <div className="saved-reflection">
                    <span>这次实验让我发现了什么？</span>
                    <p>{experiment.reflection || '未填写反思'}</p>
                  </div>
                ) : (
                  <details className="reflection-editor">
                    <summary>这次实验让我发现了什么？<span>可选</span></summary>
                    <label className="sr-only" htmlFor={`reflection-${experiment.id}`}>第 {experiment.id} 次实验：这次实验让我发现了什么？</label>
                    <textarea
                      className="reflection-input"
                      id={`reflection-${experiment.id}`}
                      rows={2}
                      value={experiment.reflection}
                      placeholder="记录你的观察或新的想法……"
                      onChange={(event) => onSaveReflection(experiment.id, event.target.value)}
                      aria-describedby={`reflection-hint-${experiment.id}`}
                    />
                    <p className="reflection-hint" id={`reflection-hint-${experiment.id}`}>输入时自动保存 · {Array.from(experiment.reflection).length}/200 字</p>
                  </details>
                )}
              </li>
            ))}
          </ol>
          <p className="history-footnote">切换新宇宙后，当前记录会清空。</p>
        </div>
      )}

      <div className="observation-tip">
        <span className="tip-icon" aria-hidden="true">✦</span>
        <div><h3>像科学家一样思考</h3><p>{probability ? '试试不同的红蓝球组合，比较理论概率。' : <>试试不同的输入，比较结果。<br />哪些变化重复出现了？</>}</p></div>
      </div>
    </aside>
  );
}
