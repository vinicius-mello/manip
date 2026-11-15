import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAscii } from '../src/parse-ascii.js';
import { parseLatex } from '../src/parse-latex.js';
import { toAscii, toLatex } from '../src/serialize.js';
import { toMathJson, fromMathJson } from '../src/mathjson.js';
import { shiftSideways, shiftOut, shiftIn } from '../src/moves.js';
import { RULES } from '../src/rules/index.js';

const rules = (id) => RULES.filter((r) => r.id === id);
const ctx = (src, focus, sel = [], input) => ({ tree: parseAscii(src), focus, targets: sel.length ? sel : [focus], input, definitions: {} });
// Todas as formas da regra, em ASCII.
const forms = (id, src, focus, sel, input) => {
  const c = ctx(src, focus, sel, input);
  return rules(id).flatMap((r) => (r.all ? r.all(c) : [r.run(c)])).filter((r) => r?.tree).map((r) => toAscii(r.tree));
};
const one = (...a) => forms(...a)[0] ?? null;

test('matrizes e determinantes: leitura e escrita', () => {
  for (const s of ['[1, 2; 3, 4]', '|1, 2; x + 1, 4|', 'det(A) + det(AB)', '2[1, -2; x/2, 4]^2', '[a, b][c; d]', '|a, b, c; d, e, f; g, h, k| = 0']) {
    const t = parseAscii(s);
    const j = JSON.stringify(toMathJson(t));
    assert.equal(toAscii(t), s);
    assert.equal(JSON.stringify(toMathJson(parseLatex(toLatex(t)))), j, `LaTeX de ${s}`);
    assert.equal(JSON.stringify(toMathJson(fromMathJson(toMathJson(t)))), j, `MathJSON de ${s}`);
  }
  assert.equal(toAscii(parseAscii('[[1, 2], [3, 4]]')), '[1, 2; 3, 4]');
  assert.equal(toAscii(parseAscii('det [1, 2; 3, 4]')), '|1, 2; 3, 4|');
  assert.equal(toAscii(parseLatex('\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}')), '[1, 2; 3, 4]');
  assert.equal(toAscii(parseLatex('\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}')), '|a, b; c, d|');
  assert.deepEqual(toMathJson(parseAscii('[1, 2; 3, 4]')), ['Matrix', ['List', ['List', 1, 2], ['List', 3, 4]]]);
  assert.equal(parseAscii('[x^2]_0^1').op, 'EvalAt', '[F]_a^b continua sendo avaliação');
  assert.equal(parseAscii('|x - 1|').op, 'Abs', '|x| continua sendo módulo');
  assert.equal(toAscii(parseLatex('\\begin{cases} x = 1 \\\\ y = 2 \\end{cases}')), 'x = 1; y = 2', 'cases não é matriz');
  assert.throws(() => parseAscii('[a, b; c]'), /err.ragged/);
});

test('desenvolver o determinante', () => {
  assert.equal(one('laplace', 'D = |a, b; c, d|', [1]), 'D = ad - bc');
  assert.equal(one('laplace', 'D = |-1, 2; 3, x + 1|', [1]), 'D = (-1)(x + 1) - 2*3');
  assert.deepEqual(forms('laplace', 'D = |a, b, c; d, e, f; g, h, k|', [1]), [
    'D = a|e, f; h, k| - b|d, f; g, k| + c|d, e; g, h|',
    'D = aek + bfg + cdh - ceg - afh - bdk',
  ]);
  assert.equal(one('laplace', 'D = |a, b, c; d, e, f; g, h, k|', [1, 1]), 'D = -d|b, c; h, k| + e|a, c; g, k| - f|a, b; g, h|', 'pela linha 2');
  assert.equal(one('laplace', 'D = |a, b, c; d, e, f; g, h, k|', [1, 1, 2], [[1, 0, 2], [1, 1, 2]]), 'D = c|d, e; g, h| - f|a, b; g, h| + k|a, b; d, e|', 'pela coluna 3');
  assert.equal(one('laplace', 'x = 2|a, b; c, d| + 1', [1, 0, 1]), 'x = 2(ad - bc) + 1');
  assert.equal(one('laplace', 'M = [a, b; c, d]', [1]), null, 'matriz não é determinante');
});

test('calcular um determinante numérico', () => {
  assert.equal(one('calc', 'D = |1, 2; 3, 4|', [1]), 'D = -2');
  assert.equal(one('calc', 'D = |2, 0, 1; 1, 3, 2; 1, 1, 2|', [1]), 'D = 6');
});

test('fator comum: matriz inteira, linha ou coluna do determinante', () => {
  assert.equal(one('mfactor', 'M = [2, 4; 6, 0]', [1]), 'M = 2[1, 2; 3, 0]');
  assert.equal(one('mfactor', 'D = |2, 4; 1, 3|', [1, 0]), 'D = 2|1, 2; 1, 3|');
  assert.equal(one('mfactor', 'D = |a x, a; 1, 3|', [1, 0]), 'D = a|x, 1; 1, 3|');
  assert.equal(one('mfactor', 'D = 3|2, 1; 4, 3|', [1, 1], [[1, 1, 0, 0], [1, 1, 1, 0]]), 'D = 3*2|1, 1; 2, 3|', 'coluna, dentro de um produto');
  assert.equal(one('mfactor', 'D = |2, 4; 1, 3|', [1]), null, 'det inteiro: não (seria kⁿ)');
});

test('número vezes matriz', () => {
  assert.equal(one('mscalar', 'M = 2[1, x; -1, 3]', [1]), 'M = [2*1, 2x; 2(-1), 2*3]');
});

test('somar a uma linha um múltiplo de outra', () => {
  assert.equal(one('rowadd', 'D = |1, 2; 3, 4|', [1, 1], [[1, 0], [1, 1]], '-3'), 'D = |1, 2; 3 + (-3)*1, 4 + (-3)*2|');
  assert.equal(one('rowsub', 'D = |1, 2; 3, 4|', [1, 1], [[1, 0], [1, 1]], '3'), 'D = |1, 2; 3 - 3*1, 4 - 3*2|');
  assert.equal(one('rowadd', 'D = |1, 2; 3, 4|', [1, 1], [[1, 0], [1, 1]], '1'), 'D = |1, 2; 3 + 1, 4 + 2|');
  const rowadd = rules('rowadd')[0];
  assert.equal(rowadd.suggest(ctx('D = |2, 2; 3, 4|', [1, 1], [[1, 0], [1, 1]])), '-3/2');
  assert.ok(!rowadd.available(ctx('D = |1, 2; 3, 4|', [1, 1])), 'precisa de duas linhas');
});

test('trocar linhas ou colunas troca o sinal; transpor não muda', () => {
  const t = parseAscii('D = |a, b; c, d|');
  assert.equal(toAscii(shiftIn(t, [1, 0]).tree), 'D = -|c, d; a, b|');
  assert.equal(toAscii(shiftOut(t, [1, 1]).tree), 'D = -|c, d; a, b|');
  const neg = parseAscii('D = -|a, b; c, d|');
  assert.equal(toAscii(shiftIn(neg, [1, 0, 0]).tree), 'D = |c, d; a, b|', 'dois sinais se cancelam');
  assert.equal(toAscii(shiftSideways(t, [1, 0, 0], +1).tree), 'D = -|b, a; d, c|', 'colunas');
  assert.equal(shiftIn(parseAscii('M = [a, b; c, d]'), [1, 0]).error, 'err.matrixSwap');
  assert.equal(one('transpose', 'D = |a, b; c, d|', [1]), 'D = |a, c; b, d|');
});

const ids = (t) => {
  const out = [];
  const go = (n) => { out.push(n.id); (n.args ?? []).forEach(go); };
  go(t);
  return out;
};

test('soma, produto e transposta de matrizes', () => {
  assert.equal(one('msum', 'M = [1, 2] + [a, b]', [1]), 'M = [1 + a, 2 + b]');
  assert.equal(one('msum', 'M = [1, 2] - [a, b]', [1]), 'M = [1 - a, 2 - b]');
  assert.equal(one('msum', 'M = [1 + a, 2 + b]', [1]), 'M = [1, 2] + [a, b]', 'separar');
  const c = ctx('M = [1, 2] + [1, 2, 3]', [1]);
  assert.equal(rules('msum')[0].all(c)[0].error, 'err.dims');
  assert.equal(one('mproduct', 'M = [1, 2; 3, 4][x; y]', [1]), 'M = [1x + 2y; 3x + 4y]');
  assert.equal(one('mproduct', 'M = 2[a, b][c; d]', [1, 1]), 'M = 2[ac + bd]');
  assert.equal(one('mproduct', 'M = [1, 2; 3, 4]^T', [1]), 'M = [1, 3; 2, 4]');
  assert.equal(one('mcalc', '[1, 2; 3 - 3*1, 4 - 3*2]', []), '[1, 2; 0, -2]');
  assert.equal(one('mcalc', '[1 + 1, 2; 3 - 3*1, 4 - 3*2]', [1]), '[1 + 1, 2; 0, -2]', 'só a linha em foco');
});

test('operações de linha numa matriz: A ∼ A′', () => {
  const r = one('rowadd', '[1, 2; 3, 4]', [1], [[0], [1]], '-3');
  assert.equal(r, '[1, 2; 3, 4] ~ [1, 2; 3 + (-3)*1, 4 + (-3)*2]');
  const t = parseAscii(r);
  assert.equal(new Set(ids(t)).size, ids(t).length, 'a cópia da esquerda tem ids novos');
  assert.equal(one('rowadd', '[1, 2; 3, 4] ~ [1, 2; 0, -2]', [1, 1], [[1, 0], [1, 1]], '1'), '[1, 2; 0, -2] ~ [1, 2; 0 + 1, -2 + 2]', 'continua da última');
  assert.ok(!rules('rowadd')[0].available(ctx('[1, 2; 3, 4] ~ [1, 2; 0, -2]', [0, 1], [[0, 0], [0, 1]])), 'a da esquerda não muda');
  assert.ok(!rules('rowadd')[0].available(ctx('M = [1, 2; 3, 4]', [1, 1], [[1, 0], [1, 1]])), 'numa equação, não');
  assert.equal(one('rowscale', '[2, 4; 1, 3]', [0], [], '1/2'), '[2, 4; 1, 3] ~ [(1/2)*2, (1/2)*4; 1, 3]');
  assert.equal(rules('rowscale')[0].suggest(ctx('[2, 4; 1, 3]', [0])), '1/2');
  assert.equal(rules('rowscale')[0].run(ctx('[2, 4; 1, 3]', [0], [], '0')).error, 'err.rowZero');
  assert.equal(toAscii(shiftIn(parseAscii('[a, b; c, d]'), [0]).tree), '[a, b; c, d] ~ [c, d; a, b]');
  assert.equal(shiftSideways(parseAscii('[a, b; c, d]'), [0, 0], +1).error, 'err.matrixSwap', 'colunas, não');
  const eq = parseAscii('[1, 2] ~ [1, 0]');
  assert.equal(toAscii(parseLatex(toLatex(eq))), '[1, 2] ~ [1, 0]');
});

test('sistema ↔ matriz aumentada', () => {
  const c = ctx('x + 2y = 5; 3x - y = 1', []);
  const m = rules('augmented')[0].all(c)[0].tree;
  assert.equal(toAscii(m), '[1, 2, 5; 3, -1, 1]');
  assert.ok(m.aug);
  assert.deepEqual(m.vars, ['x', 'y']);
  assert.match(toLatex(m), /\\begin\{array\}\{cc\|c\}/);
  const back = rules('augmented')[0].all({ tree: m, focus: [], targets: [[]], definitions: {} })[0].tree;
  assert.equal(toAscii(back), 'x + 2y = 5; 3x - y = 1');
  assert.equal(toAscii(rules('augmented')[0].all(ctx('y = 2 - x; 2x - 3 = y + 1', []))[0].tree), '[1, 1, 2; 2, -1, 3 + 1]');
  assert.equal(rules('augmented')[0].all(ctx('x y = 1; x = 2', [])).length, 0, 'não linear');
});
