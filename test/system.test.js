import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAscii } from '../src/parse-ascii.js';
import { parseLatex } from '../src/parse-latex.js';
import { toAscii, toLatex } from '../src/serialize.js';
import { toMathJson, fromMathJson } from '../src/mathjson.js';
import { getAt, findPath } from '../src/ast.js';
import { shiftSideways } from '../src/moves.js';
import { RULES } from '../src/rules/index.js';

const rule = (id) => RULES.find((r) => r.id === id);
const run = (id, src, focus, sel = [], input) => {
  const tree = parseAscii(src);
  const r = rule(id).run({ tree, focus, targets: sel.length ? sel : [focus], input });
  return r?.error ?? (r && toAscii(r.tree));
};

test('leitura e escrita de sistemas', () => {
  const t = parseAscii('x + y = 3; x - y = 1');
  assert.deepEqual(toMathJson(t), ['And', ['Equal', ['Add', 'x', 'y'], 3], ['Equal', ['Add', 'x', ['Negate', 'y']], 1]]);
  assert.equal(toAscii(t), 'x + y = 3; x - y = 1');
  assert.deepEqual(toMathJson(parseLatex(toLatex(t))), toMathJson(t));
  assert.deepEqual(toMathJson(fromMathJson(toMathJson(t))), toMathJson(t));
  assert.deepEqual(toMathJson(parseLatex('\\begin{cases} 2x = 4 \\\\ y = x \\end{cases}')),
    ['And', ['Equal', ['Multiply', 2, 'x'], 4], ['Equal', 'y', 'x']]);
  assert.equal(parseAscii('x = 1;').op, 'Equal', '";" no fim é tolerado');
});

test('movimentos e operações dentro de uma equação do sistema', () => {
  let t = parseAscii('x + y = 3; x - y = 1');
  const y = getAt(t, [0, 0, 1]);
  t = shiftSideways(t, findPath(t, y.id), +1).tree;
  assert.equal(toAscii(t), 'x = -y + 3; x - y = 1', 'só a primeira equação muda');
  assert.equal(toAscii(shiftSideways(t, [1], -1).tree), 'x - y = 1; x = -y + 3', 'reordenar equações');
  assert.equal(run('sides', 'x + y = 3; 2x = 4', [1, 0], [], '/ 2'), 'x + y = 3; (2x)/2 = 4/2');
  assert.equal(run('swap', 'x + y = 3; 2x = 4', [1]), 'x + y = 3; 4 = 2x');
});

test('somar e subtrair equações', () => {
  assert.equal(run('addeq', 'x + y = 3; x - y = 1', [1], [[0], [1]]), 'x + y = 3; x - y + x + y = 1 + 3');
  assert.equal(run('subeq', 'x + y = 3; x - y = 1', [1], [[0], [1]]), 'x + y = 3; x - y - (x + y) = 1 - 3');
  assert.equal(run('addeq', 'x + y = 3; x - y = 1', [1]), null, 'precisa de duas selecionadas');
});

test('substituir a variável nas outras equações', () => {
  assert.equal(run('substsys', 'y = 2x + 1; x + y = 7', [0]), 'y = 2x + 1; x + (2x + 1) = 7');
  assert.equal(run('substsys', 'y = 2x + 1; x + y = 7', [0, 1]), 'y = 2x + 1; x + (2x + 1) = 7', 'foco dentro da equação');
  assert.equal(run('substsys', '3 = x; x y = 6; x + y = 5', [0]), '3 = x; 3y = 6; 3 + y = 5');
  assert.equal(run('substsys', 'x + y = 7; x - y = 1', [0]), null, 'não é v = expressão');
});
