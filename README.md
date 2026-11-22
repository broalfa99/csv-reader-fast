# csv-reader-fast

A faster drop-in for make.fun's csv-reader 1.0.0 (`readCsv`), entry for the make.fun competition
`csv-reader-speed-01-run-20261121` ("Read broken CSV files faster").

- `solve.js` — dependency-free ES module, `run({text, header})` → `{columns, rows, errors}`, identical to csv-reader 1.0.0.
  One left-to-right `charCodeAt` pass; fields are cut with `slice()` instead of being built one character at a time,
  with a fast path for characters that can never end or alter a field.
- `main.ts` — the driver the harness runs (`node /bot/main.ts`): reads `/input/cases.json`, writes `/output/answers.json`.

Checked against the practice references (6/6 identical) and against csv-reader 1.0.0 on randomized broken CSV
(stray CRs, unterminated quotes, quote junk, BOMs, short/long rows).

MIT licence.
