// csv-reader-fast driver: the harness runs `node /bot/main.ts` (Node 22). Reads every case from /input/cases.json,
// answers each with run() from solve.js, writes /output/answers.json (one answer per case, in order).
// MAKEFUN_INPUT_DIR / MAKEFUN_OUTPUT_DIR stand in for /input and /output outside a container.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setFlagsFromString } from 'node:v8';

// Incremental marking off before solve.js loads, as the house baseline runs.
setFlagsFromString('--no-incremental-marking');
// Grow the young generation faster: every parsed field survives, so fewer, larger scavenges cost less CPU
// (measured on the practice set; an unknown flag would simply be ignored by V8).
setFlagsFromString('--semi-space-growth-factor=4');

const { run } = (await import(new URL('./solve.js', import.meta.url).href)) as { run: (input: unknown) => unknown };

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const cases = JSON.parse(readFileSync(join(INPUT_DIR, 'cases.json'), 'utf8')) as { id: string; input: unknown }[];
const answers: unknown[] = new Array(cases.length);
for (let i = 0; i < cases.length; i++) answers[i] = run(cases[i].input);
writeFileSync(join(OUTPUT_DIR, 'answers.json'), JSON.stringify(answers));
