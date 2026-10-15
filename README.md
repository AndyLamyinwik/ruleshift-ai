# RuleShift AI

**Learn by Breaking the Rules**

[English](#english) · [繁體中文](#繁體中文) · [简体中文](#简体中文)

## English

[Live Demo](https://andylamyinwik.github.io/ruleshift-ai/)

RuleShift AI is an interactive educational laboratory for exploring hidden mathematical rules. Students make predictions, conduct experiments, compare evidence, and form hypotheses through a scientific reasoning workflow. The interface uses Simplified Chinese.

Built with React, TypeScript, Vite, and plain CSS. Sessions run entirely in the browser and reset when the page reloads.

### Features

- A randomly selected hidden rule that stays consistent throughout each session.
- Required predictions before experiments, followed by calculated observations.
- A chronological reasoning timeline with optional editable reflections of up to 200 characters.
- An evidence chart comparing predictions and observations, with experiment count, mean absolute error, and latest absolute error.
- Hypothesis verification after at least two distinct experimental inputs, with explanations and numerical evidence.
- Completed sessions retain their records and charts while locking further edits. Starting a new universe or switching laboratories clears the session.
- A responsive light interface with labeled controls and keyboard focus indicators.

### Learning laboratories

| Laboratory | Experimental inputs | Observation |
| --- | --- | --- |
| Unknown Function — 未知函数实验室 | Integer x from 1 to 8 | Calculated output y |
| Motion Universe — 运动规律实验室 | Integer time t from 1 to 8 seconds | Displacement s in meters, starting at zero displacement |
| Probability Universe — 概率探索实验室 | 2–7 red balls and 1–7 blue balls | Theoretical success probability for a hidden drawing protocol |

Probability experiments calculate theoretical probabilities rather than perform random physical draws. Percentages display to two decimal places while calculations retain full precision. Probability errors use percentage points; motion errors use meters.

### Getting started

Use Node.js 24 LTS and npm. The minimum supported Node.js version is 22.18.0.

From the project directory, install dependencies and start the development server:

```sh
npm install
npm run dev
```

Open the local URL printed in the terminal. For a reproducible installation using `package-lock.json`, use `npm ci` instead of `npm install`.

### Experimental learning process

1. Choose a laboratory and select its experimental inputs.
2. Enter a prediction and click **运行实验** (Run Experiment). Mathematics and motion accept any finite number; probability accepts decimal percentages from 0 to 100. The result appears only after the experiment runs.
3. Compare the prediction and observation in the timeline and evidence chart. Timeline differences are signed (actual minus predicted); chart summary errors are absolute. Repeated inputs remain separate chronological records.
4. Optionally write or edit a reflection. Reflections save as you type during the session.
5. After experimenting with at least two distinct inputs, select a hypothesis and click **验证我的猜测** (Verify My Hypothesis). Probability inputs are distinct when their red/blue count pairs differ. Submission reveals the actual rule and completes the session.
6. Click **新宇宙** (New Universe) to explore another randomly selected rule in the current laboratory. The same rule may be selected again.

### Testing and production build

```sh
npm test
npm run build
```

Tests cover mathematical calculations, predictions, reflections, hypotheses, session locking and resets, and evidence chart data. The build runs TypeScript checks and writes production assets to `dist/`.

To preview the production build locally:

```sh
npm run preview
```

GitHub Actions runs `npm ci`, `npm test`, and `npm run build` on pushes and pull requests.

### Project structure

```text
.github/workflows/ci.yml  Automated tests and build
public/                  Static assets
src/
  components/            Shared laboratory interface
  lib/                   Rules, session logic, verification, and chart calculations
  App.tsx                Laboratory selection and session integration
  types.ts               Shared experiment types
  styles.css             Application styles
tests/                   Calculation and session tests
index.html               HTML entry point and page metadata
```

### License

Released under the [MIT License](LICENSE). Copyright © 2026 RuleShift AI contributors.

## 繁體中文

**在探索中發現規律。** RuleShift AI 是一個互動式科學推理實驗室：你可以先預測結果，再進行實驗，透過觀察、比較與反思，逐步找出每個宇宙中隱藏的數學規律。

**[線上體驗：直接進入實驗室](https://andylamyinwik.github.io/ruleshift-ai/)**，無須下載、安裝或註冊。網站介面目前使用簡體中文，可在電腦或手機上操作。

### 三個實驗室

- **未知函数实验室**：選擇 1–8 的整數輸入 x，觀察輸出 y，探索未知函數。
- **运动规律实验室**：選擇 1–8 秒的時間 t，觀察物體從零位移出發後的位移 s。
- **概率探索实验室**：設定 2–7 顆紅球與 1–7 顆藍球，探索隱藏抽球方式的成功機率。輸出是計算得到的理論機率，不是一次隨機抽球的結果。

### 如何使用

1. 開啟上方的線上體驗連結，在頁面頂部選擇實驗室，設定本次實驗的輸入。
2. 填寫你的預測，再按「运行实验」查看結果。函數與運動實驗接受有限數值，包含零、負數與小數；機率實驗請填寫 0–100 的百分比，可使用小數。
3. 在推理時間線與證據圖表中比較預測和觀察。你可以為每次實驗撰寫最多 200 字的反思；輸入時會自動保存在本次工作階段，完成驗證前可修改。
4. 至少使用兩個不同的輸入完成實驗後，選擇你認為正確的規律，再按「验证我的猜测」。機率實驗必須使用至少兩組不同的紅球／藍球數量組合；重複相同輸入仍會留下記錄，但不計入此條件。
5. 查看正確規律、解釋與實驗數據佐證。驗證後，記錄與圖表仍可檢視，實驗、猜測和反思則會鎖定。
6. 按「新宇宙」即可在目前實驗室重新探索。切換實驗室也會開始新的探索。

**記錄只保留在目前頁面中。** 開啟新宇宙、切換實驗室或重新整理頁面，都會清除目前的實驗、預測、反思與猜測。

如需在本機開發，請參閱上方英文的 [Getting started](#getting-started)；測試與建置指令見 [Testing and production build](#testing-and-production-build)。本專案採用 [MIT 授權](LICENSE)。

## 简体中文

**在探索中发现规律。** RuleShift AI 是一个交互式科学推理实验室：你可以先预测结果，再进行实验，通过观察、比较与反思，逐步找出每个宇宙中隐藏的数学规律。

**[在线体验：直接进入实验室](https://andylamyinwik.github.io/ruleshift-ai/)**，无需下载、安装或注册。网站界面目前使用简体中文，可在电脑或手机上操作。

### 三个实验室

- **未知函数实验室**：选择 1–8 的整数输入 x，观察输出 y，探索未知函数。
- **运动规律实验室**：选择 1–8 秒的时间 t，观察物体从零位移出发后的位移 s。
- **概率探索实验室**：设置 2–7 个红球与 1–7 个蓝球，探索隐藏抽球方式的成功概率。输出是计算得到的理论概率，不是一次随机抽球的结果。

### 如何使用

1. 打开上方的在线体验链接，在页面顶部选择实验室，设置本次实验的输入。
2. 填写你的预测，再点击「运行实验」查看结果。函数与运动实验接受有限数值，包括零、负数与小数；概率实验请填写 0–100 的百分比，可使用小数。
3. 在推理时间线与证据图表中比较预测和观察。你可以为每次实验撰写最多 200 字的反思；输入时会自动保存在本次会话中，完成验证前可修改。
4. 至少使用两个不同的输入完成实验后，选择你认为正确的规律，再点击「验证我的猜测」。概率实验必须使用至少两组不同的红球／蓝球数量组合；重复相同输入仍会留下记录，但不计入此条件。
5. 查看正确规律、解释与实验数据佐证。验证后，记录与图表仍可查看，实验、猜测和反思则会锁定。
6. 点击「新宇宙」即可在当前实验室重新探索。切换实验室也会开始新的探索。

**记录只保留在当前页面中。** 开启新宇宙、切换实验室或刷新页面，都会清除当前的实验、预测、反思与猜测。

如需在本地开发，请参阅上方英文的 [Getting started](#getting-started)；测试与构建命令见 [Testing and production build](#testing-and-production-build)。本项目采用 [MIT 许可证](LICENSE)。
