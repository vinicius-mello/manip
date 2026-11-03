import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAscii } from '../src/parse-ascii.js';
import { toAscii, toLatex } from '../src/serialize.js';
import { toMathJson, fromMathJson } from '../src/mathjson.js';
import { findPath, getAt } from '../src/ast.js';
import { shiftSideways, shiftOut, shiftIn } from '../src/moves.js';
import { left, right, up, down } from '../src/cursor.js';

const mj = (s) => toMathJson(parseAscii(s));

test('precedência e multiplicação implícita', () => {
  assert.deepEqual(mj('2x+3=7'), ['Equal', ['Add', ['Multiply', 2, 'x'], 3], 7]);
  assert.deepEqual(mj('a - b'), ['Add', 'a', ['Negate', 'b']]);
  assert.deepEqual(mj('-x^2'), ['Negate', ['Power', 'x', 2]]);
  assert.deepEqual(mj('2^3^4'), ['Power', 2, ['Power', 3, 4]]);
  assert.deepEqual(mj('xy'), ['Multiply', 'x', 'y']);
  assert.deepEqual(mj('2*-3'), ['Multiply', 2, ['Negate', 3]]);
});

test('parênteses digitados são preservados, exceto onde a notação agrupa', () => {
  assert.deepEqual(mj('(a+b)+c'), ['Add', ['Delimiter', ['Add', 'a', 'b']], 'c']);
  assert.deepEqual(mj('(y-1)/4'), ['Divide', ['Add', 'y', ['Negate', 1]], 4]);
  assert.deepEqual(mj('x^(n+1)'), ['Power', 'x', ['Add', 'n', 1]]);
  assert.deepEqual(mj('sin(x)'), ['Sin', 'x']);
  assert.deepEqual(mj('sqrt(2)x'), ['Multiply', ['Sqrt', 2], 'x']);
});

test('funções, gregas e subscritos', () => {
  assert.deepEqual(mj('sin x + pi'), ['Add', ['Sin', 'x'], 'pi']);
  assert.deepEqual(mj('x_1 + theta'), ['Add', 'x_1', 'theta']);
});

test('erros de parsing', () => {
  assert.throws(() => parseAscii('2x +'), /incompleta/);
  assert.throws(() => parseAscii('(x'), /Faltou/);
  assert.throws(() => parseAscii('x $ 2'), /inesperado/);
});

test('ida e volta ASCII e MathJSON', () => {
  for (const s of ['2x + 3 = 7', 'a - b = (c + d)/e', 'x^(n + 1) = sqrt(2)*3', '-(a + b) = 2(x - 1)']) {
    const t = parseAscii(s);
    assert.deepEqual(toMathJson(parseAscii(toAscii(t))), toMathJson(t), s);
    assert.deepEqual(toMathJson(fromMathJson(toMathJson(t))), toMathJson(t));
  }
  assert.equal(toLatex(parseAscii('(y-1)/4 = 2x')), '\\frac{y - 1}{4} = 2 x');
});

test('navegação', () => {
  const t = parseAscii('2x + 3 = 7');
  assert.deepEqual(down(t, []), [0]);
  assert.deepEqual(down(t, [0]), [0, 0]);
  assert.deepEqual(right(t, [0, 0]), [0, 1]);
  assert.deepEqual(right(t, [0, 1]), [1]);
  assert.deepEqual(left(t, [1]), [0]);
  assert.deepEqual(right(t, [0, 0, 1]), [0, 1]);
  assert.deepEqual(up(t, [0, 1]), [0]);
});

// Aplica uma sequência de movimentos acompanhando o nó pelo id.
function move(tree, id, f, ...a) {
  const r = f(tree, findPath(tree, id), ...a);
  assert.ok(r, 'movimento deveria se aplicar');
  return r.tree;
}

test('transposição sem cálculo: 2x + 3 = 7 → x = (7 − 3)/2', () => {
  let t = parseAscii('2x + 3 = 7');
  const three = getAt(t, [0, 1]);
  const two = getAt(t, [0, 0, 0]);
  t = move(t, three.id, shiftSideways, +1);
  assert.equal(toAscii(t), '2x = -3 + 7');
  const negThree = getAt(t, findPath(t, three.id).slice(0, -1));
  assert.equal(negThree.op, 'Negate');
  t = move(t, negThree.id, shiftSideways, +1);
  assert.equal(toAscii(t), '2x = 7 - 3');
  assert.equal(getAt(t, findPath(t, three.id)).id, three.id, 'o 3 mantém o id');
  t = move(t, two.id, shiftSideways, +1);
  assert.equal(toAscii(t), 'x*2 = 7 - 3');
  t = move(t, two.id, shiftSideways, +1);
  assert.equal(toAscii(t), 'x = (7 - 3)/2');
});

test('voltar um termo desfaz o Negate e lado vazio vira 0', () => {
  let t = parseAscii('x = 5 - a');
  const neg = getAt(t, [1, 1]);
  const a = neg.args[0];
  assert.equal(shiftSideways(t, [1, 1], +1), null);
  t = move(t, neg.id, shiftSideways, -1);
  t = move(t, neg.id, shiftSideways, -1);
  assert.equal(toAscii(t), 'x + a = 5');
  assert.equal(getAt(t, [0, 1]).id, a.id);
  const u = parseAscii('x = 5');
  assert.equal(toAscii(shiftSideways(u, [0], +1).tree), '0 = -x + 5');
});

test('denominador passa multiplicando', () => {
  let t = parseAscii('x/2 = 5');
  t = move(t, getAt(t, [0, 1]).id, shiftSideways, +1);
  assert.equal(toAscii(t), 'x = 5*2');
});

test('agrupar e desagrupar', () => {
  let t = parseAscii('a + (b + c) = 0');
  const b = getAt(t, [0, 1, 0, 0]);
  t = move(t, b.id, shiftOut);
  assert.equal(toAscii(t), 'a + (c) + b = 0');
  t = parseAscii('a + (b + c) = 0');
  t = move(t, getAt(t, [0, 0]).id, shiftIn);
  assert.equal(toAscii(t), '(a + b + c) = 0');
});
