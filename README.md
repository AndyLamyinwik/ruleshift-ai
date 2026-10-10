# RuleShift AI

**Learn by Breaking the Rules**

[Live Demo](https://andylamyinwik.github.io/ruleshift-ai/)

RuleShift AI is an interactive educational laboratory for exploring hidden mathematical rules. Students make predictions, conduct experiments, compare evidence, and form hypotheses through a scientific reasoning workflow. The interface uses Simplified Chinese.

Built with React, TypeScript, Vite, and plain CSS. Sessions run entirely in the browser and reset when the page reloads.

## Features

- A randomly selected hidden rule that stays consistent throughout each session.
- Required predictions before experiments, followed by calculated observations.
- A chronological reasoning timeline with optional editable reflections of up to 200 characters.
- An evidence chart comparing predictions and observations, with experiment count, mean absolute error, and latest absolute error.
- Hypothesis verification after at least two distinct experimental inputs, with explanations and numerical evidence.
- Completed sessions retain their records and charts while locking further edits. Starting a new universe or switching laboratories clears the session.
- A responsive dark interface with labeled controls and keyboard focus indicators.

## Learning laboratories

| Laboratory | Experimental inputs | Observation |
| --- | --- | --- |
| Unknown Function — 未知函数实验室 | Integer x from 1 to 8 | Calculated output y |
| Motion Universe — 运动规律实验室 | Integer time t from 1 to 8 seconds | Displacement s in meters, starting at zero displacement |
| Probability Universe — 概率探索实验室 | 2–7 red balls and 1–7 blue balls | Theoretical success probability for a hidden drawing protocol |

Probability experiments calculate theoretical probabilities rather than perform random physical draws. Percentages display to two decimal places while calculations retain full precision. Probability errors use percentage points; motion errors use meters.

## Getting started

Use Node.js 24 LTS and npm. The minimum supported Node.js version is 22.18.0.

From the project directory, install dependencies and start the development server:

```sh
npm install
npm run dev
```

Open the local URL printed in the terminal. For a reproducible installation using `package-lock.json`, use `npm ci` instead of `npm install`.

## Experimental learning process

1. Choose a laboratory and select its experimental inputs.
2. Enter a prediction and click **运行实验** (Run Experiment). Mathematics and motion accept any finite number; probability accepts decimal percentages from 0 to 100. The result appears only after the experiment runs.
3. Compare the prediction and observation in the timeline and evidence chart. Timeline differences are signed (actual minus predicted); chart summary errors are absolute. Repeated inputs remain separate chronological records.
4. Optionally write or edit a reflection. Reflections save as you type during the session.
5. After experimenting with at least two distinct inputs, select a hypothesis and click **验证我的猜测** (Verify My Hypothesis). Probability inputs are distinct when their red/blue count pairs differ. Submission reveals the actual rule and completes the session.
6. Click **新宇宙** (New Universe) to explore another randomly selected rule in the current laboratory. The same rule may be selected again.

## Testing and production build

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

## Project structure

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

## License

Released under the [MIT License](LICENSE). Copyright © 2026 RuleShift AI contributors.
