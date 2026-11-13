# Fed December decision model

A model from [Event Neutral](https://eventneutral.com): what will the FOMC decide on Dec 9, 2026? Built around Kalshi's `KXFEDDECISION-26DEC` market.

- `index.html`: the Question page (served at fed-december-model.eventneutral.com; pushing `main` publishes). `rules/`: the market's rules.
- `model/`: the interactive Model page. `model/model.js` holds the maths: base rate, Fed signal, unemployment, crisis tail, judgment.
- `model/inputs.json`: the forecast's inputs and the historical counts behind them. Edit inputs here only.
- The look shared by Event Neutral pages (styles, light/dark switch, D3, sliders) is loaded from `https://eventneutral.com/kit/v1/`. Its source is in the `event-neutral-site` repository.

## At each update

1. Nov 18: read the October minutes; relabel the Fed signal if they change it.
2. Nov 25: October PCE. Dec 4: November jobs; set the unemployment label from the change since Oct 28 (0.2 points or more is up or down).
3. Add a row to the Model page's forecast-by-date table and a line to its update log.

---

Started 2026-11-13. Nothing here is financial advice.

License: MIT, see [LICENSE](LICENSE).
