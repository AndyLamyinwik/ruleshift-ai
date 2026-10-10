import { useState } from 'react';
import { ExperimentHistory } from './components/ExperimentHistory';
import { ExperimentEvidence } from './components/ExperimentEvidence';
import { ExperimentPanel } from './components/ExperimentPanel';
import { HypothesisPanel } from './components/HypothesisPanel';
import { LogoIcon, ResetIcon } from './components/Icons';
import { getDistinctInputCount } from './lib/hypothesis';
import {
  changeInput,
  changePrediction,
  createSession,
  resetSession,
  runExperiment,
  saveReflection,
  selectHypothesis,
  submitHypothesis,
} from './lib/session';
import { createUniverse, getUniverseDefinition, universeDefinitions } from './lib/universe';
import type { UniverseId } from './lib/universe';

export default function App() {
  const [session, setSession] = useState(() => createSession(createUniverse()));
  const completed = session.feedback !== null;
  const definition = getUniverseDefinition(session.universe.id);
  const inputChanged = typeof session.input === 'number'
    ? session.input !== 1
    : session.input.red !== 2 || session.input.blue !== 1;
  const hasProgress = session.experiments.length > 0 || session.prediction !== ''
    || session.selectedHypothesis !== null || completed || inputChanged;

  function startNewUniverse() {
    const universe = createUniverse(Math.random, session.universe.id);
    setSession((current) => resetSession(current, universe));
  }

  function switchUniverse(id: UniverseId) {
    if (id === session.universe.id) return;
    const universe = createUniverse(Math.random, id);
    setSession((current) => resetSession(current, universe));
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#main-content" aria-label="RuleShift AI 实验室">
          <span className="brand-mark"><LogoIcon /></span>
          <div><span className="brand-name">RuleShift <span>AI</span></span><span className="brand-subtitle">Learn by Breaking the Rules</span></div>
        </a>
        <span className="header-status"><span />自由探索实验室</span>
      </header>

      <main id="main-content">
        <div className="intro">
          <div>
            <p className="eyebrow"><span />平行宇宙 · {definition.explorationLabel}</p>
            <h1>每一个未知，都有<span>规律可循。</span></h1>
            <p className="intro-description">提出好奇，动手实验。从一次次观察中，发现这个宇宙的秘密。</p>
          </div>
          <button className="new-universe-button" type="button" onClick={startNewUniverse}><ResetIcon />新宇宙</button>
        </div>

        <fieldset className="universe-selector" aria-describedby="universe-switch-hint">
          <legend>选择实验室</legend>
          <div className="universe-options">
            {universeDefinitions.map((option) => (
              <label className="universe-option" key={option.id}>
                <input
                  type="radio"
                  name="universe"
                  value={option.id}
                  checked={session.universe.id === option.id}
                  onChange={() => switchUniverse(option.id)}
                />
                <span>{option.name}</span>
              </label>
            ))}
          </div>
          <p id="universe-switch-hint" aria-live="polite">
            {hasProgress
              ? '切换实验室将清空当前实验、预测、反思和猜测，并开始新的探索。'
              : '每个实验室都有独立的隐藏规律，切换后开始新的探索。'}
          </p>
        </fieldset>

        <div className="session-bar">
          <div><span className="session-dot" /><span>当前宇宙</span><strong>#{String(session.number).padStart(3, '0')}</strong></div>
          <span>{completed ? '探索已完成 · 可开启新宇宙' : '观察 · 比较 · 发现'}</span>
        </div>

        <div className="laboratory-layout">
          <ExperimentPanel
            definition={definition}
            input={session.input}
            prediction={session.prediction}
            latestExperiment={session.experiments.at(-1)}
            completed={completed}
            onInputChange={(input) => setSession((current) => changeInput(current, input))}
            onPredictionChange={(prediction) => setSession((current) => changePrediction(current, prediction))}
            onRunExperiment={() => setSession(runExperiment)}
          />
          <ExperimentHistory
            definition={definition}
            experiments={session.experiments}
            completed={completed}
            onSaveReflection={(id, reflection) => setSession((current) => saveReflection(current, id, reflection))}
          />
        </div>

        <ExperimentEvidence definition={definition} experiments={session.experiments} />

        <HypothesisPanel
          definition={definition}
          selectedHypothesis={session.selectedHypothesis}
          distinctInputCount={getDistinctInputCount(session.experiments)}
          feedback={session.feedback}
          onSelectHypothesis={(hypothesis) => setSession((current) => selectHypothesis(current, hypothesis))}
          onSubmitHypothesis={() => setSession(submitHypothesis)}
        />

        <div className="lab-note"><span aria-hidden="true">✧</span><p>这里没有标准答案的提示，只有你亲手找到的线索。</p></div>
      </main>

      <footer className="site-footer"><span>RuleShift AI</span><span>用好奇心，{definition.id === 'function' ? '探索数学的另一种可能。' : definition.id === 'motion' ? '发现运动中的规律。' : '探索概率背后的规律。'}</span></footer>
    </div>
  );
}
