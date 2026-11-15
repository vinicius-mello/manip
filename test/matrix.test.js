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

test('inversa: 2×2, Gauss-Jordan e AX = B', async () => {
  const { withEnvironment } = await import('../src/types.js');
  const { parseHypotheses } = await import('../src/hypotheses.js');
  assert.equal(one('inverse', 'M = [1, 2; 3, 4]^(-1)', [1]), 'M = (1/|1, 2; 3, 4|)[4, -2; -3, 1]');
  assert.equal(rules('inverse')[0].all(ctx('M = [1, 2; 2, 4]^(-1)', [1]))[0].error, 'err.singular');
  const gj = forms('inverse', '[1, 2; 3, 4]^(-1)', []);
  assert.equal(gj[1], '[1, 2, 1, 0; 3, 4, 0, 1]', 'repetindo #: [A | I]');
  const t = parseAscii('[1, 2, 1, 0; 3, 4, 0, 1] ~ [1, 0, -2, 1; 0, 1, 3/2, -1/2]');
  t.args[1].aug = 2;
  const r = rules('inverse')[0].all({ tree: t, focus: [1], targets: [[1]], definitions: {} })[0];
  assert.equal(toAscii(r.tree), '[-2, 1; 3/2, -1/2]');
  withEnvironment({ hyps: parseHypotheses('A, B, X in M(2)') }, () => {
    let s = one('sides', 'A X = B', [], [], 'A^(-1) *');
    assert.equal(s, 'A^(-1)AX = A^(-1)B');
    s = one('minverse', s, [0]);
    assert.equal(s, 'Id*X = A^(-1)B');
    assert.equal(one('mneutral', s, [0]), 'X = A^(-1)B');
    assert.equal(one('minverse', 'A B^(-1) = Id', [0]), null, 'A e B⁻¹ não se cancelam');
  });
});

test('vetores: leitura, produtos, norma e base', () => {
  for (const s of ['(1, 2, 3) + vec(v)', 'cross(vec(u), vec(v))', 'abs((3, 4))', '2vec(i) - vec(k)']) {
    const t = parseAscii(s);
    assert.equal(toAscii(t), s);
    assert.equal(toAscii(parseLatex(toLatex(t))), s, `LaTeX de ${s}`);
    assert.equal(toAscii(fromMathJson(toMathJson(t))), s, `MathJSON de ${s}`);
  }
  assert.equal(toAscii(parseAscii('(1, 2) × (3, 4)')), 'cross((1, 2), (3, 4))', '× entre vetores');
  assert.equal(toAscii(parseAscii('2 × 3')), '2*3', '× entre números');
  assert.equal(one('vectors', 'p = (1, 2, 3)(4, 5, 6)', [1]), 'p = 1*4 + 2*5 + 3*6');
  assert.equal(one('vectors', 'n = |(3, -4)|', [1]), 'n = sqrt(3^2 + (-4)^2)');
  assert.equal(one('msum', 'w = (1, 2) - (a, b)', [1]), 'w = (1 - a, 2 - b)');
  assert.equal(one('mscalar', 'w = 3(1, x)', [1]), 'w = (3*1, 3x)');
  assert.equal(one('vectors', 'w = (2, 0, -1)', [1]), 'w = 2vec(i) - vec(k)');
  assert.equal(one('vectors', 'w = 2vec(i) - vec(k)', [1]), 'w = (2, 0, -1)');
});

test('produto vetorial: determinante formal, Laplace e coordenadas', () => {
  let s = one('vectors', 'w = (1, 2, 3) × (4, 5, 6)', [1]);
  assert.equal(s, 'w = |vec(i), vec(j), vec(k); 1, 2, 3; 4, 5, 6|');
  s = one('laplace', s, [1]);
  assert.equal(s, 'w = vec(i)|2, 3; 5, 6| - vec(j)|1, 3; 4, 6| + vec(k)|1, 2; 4, 5|');
  s = one('vectors', s, [1]);
  assert.equal(s, 'w = (|2, 3; 5, 6|, -|1, 3; 4, 6|, |1, 2; 4, 5|)');
  assert.equal(one('mcalc', 'w = (|2, 3; 5, 6|, -|1, 3; 4, 6|, |1, 2; 4, 5|)', [1]), null, 'c age nas coordenadas, uma a uma');
  assert.equal(one('calc', s, [1, 0]), 'w = (-3, -|1, 3; 4, 6|, |1, 2; 4, 5|)');
});
