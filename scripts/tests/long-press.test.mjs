import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../../src/lib/long-press.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
});
const { createLongPress } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('holding opens once at 550ms; releasing does not open again', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let opens = 0;
  const press = createLongPress(() => opens++);
  press.start(1, 100, 100);
  t.mock.timers.tick(549);
  assert.equal(opens, 0);
  t.mock.timers.tick(1);
  assert.equal(opens, 1);
  press.cancel();
  t.mock.timers.tick(1000);
  assert.equal(opens, 1);
});

test('a short tap, movement over 10px, cancellation, or second pointer prevents opening', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let opens = 0;
  const press = createLongPress(() => opens++);
  press.start(1, 100, 100);
  t.mock.timers.tick(200);
  press.cancel();
  t.mock.timers.tick(550);
  press.start(1, 100, 100);
  press.move(1, 108, 108);
  t.mock.timers.tick(550);
  press.start(1, 100, 100);
  press.cancel();
  t.mock.timers.tick(550);
  press.start(1, 100, 100);
  press.start(2, 100, 100);
  t.mock.timers.tick(550);
  assert.equal(opens, 0);
});

test('small finger drift is tolerated and a new hold works after cancellation', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let opens = 0;
  const press = createLongPress(() => opens++);
  press.start(1, 100, 100);
  press.move(1, 120, 100);
  press.start(2, 100, 100);
  press.move(2, 104, 103);
  t.mock.timers.tick(550);
  assert.equal(opens, 1);
});
