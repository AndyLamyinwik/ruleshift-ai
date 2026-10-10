import { useEffect, useRef, useState } from 'react';
import type { ExperimentRecord } from '../types';
import type { UniverseDefinition } from '../lib/universe';
import {
  buildEvidenceChart,
  formatAxisValue,
  formatEvidenceError,
  formatEvidenceValue,
} from '../lib/evidence';
import { ObservationIcon } from './Icons';

interface ExperimentEvidenceProps {
  definition: UniverseDefinition;
  experiments: readonly ExperimentRecord[];
}

export function ExperimentEvidence({ definition, experiments }: ExperimentEvidenceProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(640);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setAvailableWidth(Math.max(200, Math.round(entry.contentRect.width)));
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const chart = buildEvidenceChart(experiments, definition.id, availableWidth);
  const probability = definition.id === 'probability';
  const verticalLabel = probability ? '成功概率（%）'
    : definition.id === 'motion' ? '位移 s（m）' : '预测 y / 实际 y';
  const scrollable = chart.width > availableWidth;

  return (
    <section className="panel evidence-panel" aria-labelledby="evidence-title">
      <div className="panel-heading">
        <div className="heading-with-icon">
          <span className="icon-tile"><ObservationIcon /></span>
          <div>
            <h2 id="evidence-title">实验数据可视化</h2>
            <p>按实验先后比较。横轴是实验序号，重复输入也会保留。</p>
          </div>
        </div>
      </div>

      <ul className="evidence-legend" aria-label="图例">
        <li>
          <svg viewBox="0 0 42 16" aria-hidden="true">
            <line x1="1" y1="8" x2="41" y2="8" className="prediction-line" />
            <path d="M21 2 L27 8 L21 14 L15 8 Z" className="prediction-marker" />
          </svg>
          <span>学生预测值</span>
        </li>
        <li>
          <svg viewBox="0 0 42 16" aria-hidden="true">
            <line x1="1" y1="8" x2="41" y2="8" className="observation-line" />
            <circle cx="21" cy="8" r="3.5" className="observation-marker" />
          </svg>
          <span>实际观测值{probability && '（理论概率）'}</span>
        </li>
      </ul>
      {probability && <p className="evidence-domain-note">概率实验的实际观测值是计算得到的理论概率。</p>}

      {experiments.length > 0 && <p className="evidence-axis-label">纵轴：{verticalLabel}</p>}
      <div className="evidence-viewport" ref={viewportRef}>
        {experiments.length === 0 ? (
          <div className="empty-evidence">
            <ObservationIcon />
            <p>先写下预测并运行实验，<br />再来比较预测与观察的差异。</p>
          </div>
        ) : (
          <svg
            className="evidence-chart"
            width={chart.width}
            height={chart.height}
            viewBox={`0 0 ${chart.width} ${chart.height}`}
            role="img"
            aria-labelledby="evidence-plot-title evidence-plot-description"
          >
            <title id="evidence-plot-title">{definition.name}：学生预测值与实际观测值</title>
            <desc id="evidence-plot-description">横轴为实验序号，纵轴为{verticalLabel}，共 {chart.summary.count} 次实验。虚线与空心菱形表示预测，实线与实心圆表示观察。每次实验的完整记录可在推理时间线中阅读。</desc>

            {chart.yTicks.map((tick, index) => (
              <g key={index}>
                <line x1={chart.plot.left} x2={chart.plot.right} y1={tick.y} y2={tick.y} className="evidence-grid-line" />
                <text x={chart.plot.left - 9} y={tick.y} dy="0.35em" textAnchor="end" className="evidence-tick">{formatAxisValue(definition.id, tick.value)}</text>
              </g>
            ))}
            <line x1={chart.plot.left} x2={chart.plot.right} y1={chart.plot.bottom} y2={chart.plot.bottom} className="evidence-axis-line" />
            {chart.xTicks.map((tick) => (
              <g key={tick.sequence}>
                <line x1={tick.x} x2={tick.x} y1={chart.plot.bottom} y2={chart.plot.bottom + 4} className="evidence-axis-line" />
                <text x={tick.x} y={chart.plot.bottom + 20} textAnchor="middle" className="evidence-tick">{tick.sequence}</text>
              </g>
            ))}

            <path d={chart.observationPath} className="observation-line" />
            <path d={chart.predictionPath} className="prediction-line" />
            {chart.points.map((point) => {
              const label = `实验 ${point.sequence}：学生预测值 ${formatEvidenceValue(definition.id, point.prediction)}；实际观测值${probability ? '（理论概率）' : ''} ${formatEvidenceValue(definition.id, point.observation)}。`;
              return (
                <g key={point.sequence} className="evidence-point" tabIndex={0} role="img" aria-label={label} data-experiment={point.sequence}>
                  <title>{label}</title>
                  <circle cx={point.x} cy={point.observationY} r="3.5" className="observation-marker" />
                  <path d={`M${point.x} ${point.predictionY - 6} L${point.x + 6} ${point.predictionY} L${point.x} ${point.predictionY + 6} L${point.x - 6} ${point.predictionY} Z`} className="prediction-marker" />
                </g>
              );
            })}
          </svg>
        )}
      </div>
      {experiments.length > 0 && (
        <div className="evidence-chart-caption">
          <span>横轴：实验序号</span>
          {scrollable && <span>可左右滚动，查看全部实验。</span>}
        </div>
      )}

      <dl className="evidence-summary">
        <div><dt>已完成实验</dt><dd>{chart.summary.count} 次</dd></div>
        <div><dt>平均绝对预测误差</dt><dd>{formatEvidenceError(definition.id, chart.summary.meanAbsoluteError)}</dd></div>
        <div><dt>最近一次绝对误差</dt><dd>{formatEvidenceError(definition.id, chart.summary.latestAbsoluteError)}</dd></div>
      </dl>
      <p className="evidence-summary-note">绝对误差 = |实际 − 预测|；平均绝对预测误差 = 绝对误差总和 ÷ 实验次数。</p>
    </section>
  );
}
