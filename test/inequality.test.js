import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAscii } from '../src/parse-ascii.js';
import { parseLatex } from '../src/parse-latex.js';
import { toAscii, toLatex } from '../src/serialize.js';
import { toMathJson } from '../src/mathjson.js';
import { getAt, findPath } from '../src/ast.js';
import { shiftSideways } from '../src/moves.js';
import { RULES } from '../src/rules/index.js';

const rule = (id) => RULES.find((r) => r.id === id);
const run = (id, src, input, focus = []) => {
  const tree = parseAscii(src);
  const r = rule(id).run({ tree, focus, targets: [focus], input });
  return r?.error ?? (r && toAscii(r.tree));
};

test('leitura e escrita de relações', () => {
  assert.deepEqual(toMathJson(parseAscii('2x + 1 <= 7')), ['LessEqual', ['Add', ['Multiply', 2, 'x'], 1], 7]);
  assert.deepEqual(toMathJson(parseAscii('x > 0')), ['Greater', 'x', 0]);
  assert.deepEqual(toMathJson(parseAscii('x ≥ 0')), ['GreaterEqual', 'x', 0]);
  assert.deepEqual(toMathJson(parseAscii('x != 1')), ['NotEqual', 'x', 1]);
  assert.deepEqual(toMathJson(parseLatex('x \\le 2')), ['LessEqual', 'x', 2]);
  assert.deepEqual(toMathJson(parseLatex('x \\geq y')), ['GreaterEqual', 'x', 'y']);
  assert.deepEqual(toMathJson(parseLatex('x < 1')), ['Less', 'x', 1]);
  for (const s of ['2x + 1 <= 7', 'x > 0', 'a >= b - 1', 'x != 1']) {
    const t = parseAscii(s);
    assert.deepEqual(toMathJson(parseAscii(toAscii(t))), toMathJson(t), s);
    assert.deepEqual(toMathJson(parseLatex(toLatex(t))), toMathJson(t), s);
  }
  assert.throws(() => parseAscii('a < b < c'), { key: 'err.unexpected' });
});

// Move o nó (por id) com Ctrl+seta.
function move(tree, id, dir) {
  return shiftSideways(tree, findPath(tree, id), dir);
}

test('transposição em inequações respeita o sinal', () => {
  let t = parseAscii('2x + 3 < 7');
  const three = getAt(t, [0, 1]);
  t = move(t, three.id, +1).tree;
  assert.equal(toAscii(t), '2x < -3 + 7', 'termo: mantém');

  t = parseAscii('2x < 7');
  const r = move(t, getAt(t, [0, 0]).id, +1); // 2 → x·2 (troca)
  const r2 = move(r.tree, getAt(t, [0, 0]).id, +1);
  assert.equal(toAscii(r2.tree), 'x < 7/2', 'positivo: mantém');

  t = parseAscii('x*(-2) < 7');
  const r3 = move(t, getAt(t, [0, 1]).id, +1);
  assert.equal(toAscii(r3.tree), 'x > 7/(-2)', 'negativo: inverte');
  assert.equal(r3.flipped, true);

  t = parseAscii('x*a < 7');
  assert.equal(move(t, getAt(t, [0, 1]).id, +1).error, 'err.signUnknown', 'letra: sinal desconhecido');

  t = parseAscii('x/a <= 1');
  assert.equal(move(t, getAt(t, [0, 1]).id, +1).error, 'err.signUnknown');
  t = parseAscii('x/3 <= 1');
  assert.equal(toAscii(move(t, getAt(t, [0, 1]).id, +1).tree), 'x <= 1*3');
  t = parseAscii('x*a = 7');
  assert.equal(toAscii(move(t, getAt(t, [0, 1]).id, +1).tree), 'x = 7/a', 'igualdade: livre');
});

test('operar nos dois lados e trocar os lados', () => {
  assert.equal(run('sides', 'x - 3 < 4', '+ 3'), 'x - 3 + 3 < 4 + 3');
  assert.equal(run('sides', '-x < 4', '* (-1)'), '-x*(-1) > 4(-1)');
  assert.equal(run('sides', 'x < 4', '/ 2'), 'x/2 < 4/2');
  assert.equal(run('sides', 'x < 4', '* y'), 'err.signUnknown');
  assert.equal(run('sides', 'x < 4', '* 0'), 'err.zero');
  assert.equal(run('sides', 'x < 4', '^ 2'), 'err.powerIneq');
  assert.equal(run('sides', 'x = 4', '^ 2'), 'x^2 = 4^2');
  assert.equal(run('swap', 'x < 4'), '4 > x');
  assert.equal(run('swap', 'x >= 4'), '4 <= x');
  assert.equal(run('swap', 'x != 4'), '4 != x');
});

test('estimar: A = B → A ≤ C ou C ≤ B', () => {
  assert.equal(run('estimate', 'y = x^2 + 1', '>= 1'), 'y >= 1');
  assert.equal(run('estimate', 'y = x^2 + 1', '0 <'), '0 < x^2 + 1');
  assert.equal(run('estimate', 'a = b', '< c'), 'a < c');
  assert.equal(run('estimate', 'a <= b', '< c'), 'a < c', 'mesmo sentido');
  assert.equal(run('estimate', 'a <= b', '>= c'), 'err.direction', 'sentido contrário');
  assert.equal(run('estimate', 'a > b', 'c >='), 'c >= b');
  assert.equal(run('estimate', 'a != b', '< c'), null);
  assert.equal(run('estimate', 'a = b', 'c'), null);
  assert.equal(run('estimate', 'a = b', '= c'), null, 'só desigualdades');
});
