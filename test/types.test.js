import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAscii } from '../src/parse-ascii.js';
import { toAscii } from '../src/serialize.js';
import { fmt, setLang } from '../src/i18n.js';
import { parseHypotheses, mergeHypotheses, hypothesisText } from '../src/hypotheses.js';
import { withEnvironment, kindOf, signOf } from '../src/types.js';
import { shiftSideways } from '../src/moves.js';
import { matches } from '../src/rules/normal.js';
import { RULES } from '../src/rules/index.js';

setLang('pt');
const H = (...texts) => texts.flatMap((t) => parseHypotheses(t));
const MATS = H('A, B in M(2)', 'C in M(2, 3)', 'seja x > 0');
const inEnv = (f, hyps = MATS) => withEnvironment({ hyps }, f);
// Primeira forma de uma regra (ou o erro), em ASCII, com o rótulo.
function apply(id, src, focus, input, sel = []) {
  const tree = parseAscii(src);
  const ctx = { tree, focus, targets: sel.length ? sel : [focus], input, definitions: {} };
  for (const r of RULES.filter((x) => x.id === id)) {
    const out = r.all ? r.all(ctx)[0] : r.run(ctx);
    if (out?.tree) return { text: toAscii(out.tree), label: fmt(out.label) };
    if (out?.error) return { error: out.error };
  }
  return null;
}

test('hipóteses: leitura', () => {
  assert.deepEqual(H('A in M(2, 3)'), [{ name: 'A', kind: 'matrix', rows: '2', cols: '3' }]);
  assert.deepEqual(H('A, B ∈ M(n)').map((h) => [h.name, h.rows, h.cols]), [['A', 'n', 'n'], ['B', 'n', 'n']]);
  assert.deepEqual(H('A \\in M_{2\\times 3}(\\mathbb{R})'), H('A in M(2, 3)'));
  assert.deepEqual(H('v \\in \\mathbb{R}^3'), [{ name: 'v', kind: 'vector', dim: '3' }]);
  assert.deepEqual(H('n in N'), [{ name: 'n', kind: 'set', set: 'N' }]);
  assert.deepEqual(H('seja x > 0'), [{ name: 'x', kind: 'rel', rel: 'Greater', bound: '0' }]);
  assert.deepEqual(H('let 0 < x; n in Z').map(hypothesisText), ['x > 0', 'n ∈ ℤ']);
  assert.equal(parseHypotheses('x > 0'), null, 'sem "seja" é um problema (inequação)');
  assert.equal(parseHypotheses('sin x + int x dx = 1'), null);
  assert.throws(() => parseHypotheses('A in Foo'), /err.hypothesis/);
  assert.throws(() => parseHypotheses('2 in N'), /err.hypName/);
  const merged = mergeHypotheses(H('A in M(2)', 'seja A > 0'), H('A in M(3)'));
  assert.deepEqual(merged.map(hypothesisText), ['A > 0', 'A ∈ M(3, 3)'], 'o tipo novo substitui o antigo');
});

test('tipos e dimensões', () => inEnv(() => {
  const k = (s) => kindOf(parseAscii(s));
  assert.deepEqual(k('A B + 2A'), { t: 'matrix', r: '2', c: '2' });
  assert.deepEqual(k('A C'), { t: 'matrix', r: '2', c: '3' });
  assert.equal(k('C A').key, 'err.dims');
  assert.equal(k('A + C').key, 'err.dims');
  assert.equal(k('A/B').key, 'err.matrixDivide');
  assert.equal(k('det(C)').key, 'err.detSquare');
  assert.equal(k('[1, 2] + [1, 2, 3]').key, 'err.dims');
  assert.deepEqual(k('[1, 2; 3, 4] A'), { t: 'matrix', r: '2', c: '2' });
  assert.equal(k('det(A) x').t, 'scalar');
  assert.equal(withEnvironment({}, () => kindOf(parseAscii('A B')).t), 'scalar', 'sem hipótese, letra é escalar');
}));

test('matrizes não comutam: movimentos e forma normal', () => inEnv(() => {
  const t = parseAscii('A B = C');
  assert.equal(shiftSideways(parseAscii('A B = B'), [0, 0], +1).error, 'err.noncommute');
  assert.equal(toAscii(shiftSideways(parseAscii('2A = B'), [0, 0], +1).tree), 'A*2 = B', 'número troca com matriz');
  assert.equal(shiftSideways(t, [0, 1], -1).error, 'err.noncommute');
  assert.equal(shiftSideways(parseAscii('A X = B'), [0, 0], +1).error, 'err.noncommute');
  assert.equal(shiftSideways(parseAscii('A B = A'), [0, 1], +1).error, 'err.matrixMove', 'não passa dividindo');
  assert.ok(!matches(parseAscii('A B'), parseAscii('B A')));
  assert.ok(matches(parseAscii('2A B'), parseAscii('A (2B)')));
  assert.ok(withEnvironment({}, () => matches(parseAscii('A B'), parseAscii('B A'))), 'escalares comutam');
}, [...MATS, ...H('X in M(2)')]));

test('regras com matrizes: conferidas numericamente', () => inEnv(() => {
  assert.equal(apply('dist', 'A(B + X) = D', [0]).text, 'AB + AX = D');
  assert.equal(apply('like', 'M = A B + B A', [1, 0]), null, 'AB + BA não junta');
  assert.equal(apply('like', 'M = A B + 2A B', [1, 0]).text, 'M = 3AB');
  assert.equal(apply('sides', 'A X = B', [], 'A^(-1) *').text, 'A^(-1)AX = A^(-1)B');
  assert.match(apply('sides', 'A X = B', [], 'A^(-1) *').label, /à esquerda/);
  assert.equal(apply('sides', 'X A = B', [], '* A^(-1)').text, 'XAA^(-1) = BA^(-1)');
  assert.equal(apply('sides', 'A X = B', [], '/ A').error, 'err.matrixDivide');
}, [...MATS, ...H('X, D in M(2)')]));

test('hipóteses de sinal: inequações e raízes', () => inEnv(() => {
  assert.equal(signOf(parseAscii('-2x^3')), -1);
  assert.equal(signOf(parseAscii('x y')), null);
  const r = apply('sides', 'x y < 3', [], '/ x');
  assert.equal(r.text, '(xy)/x < 3/x');
  assert.match(r.label, /usando x > 0/);
  assert.equal(apply('sides', 'x y < 3', [], '* (-x)').text, 'xy(-x) > 3(-x)', 'por −x o sentido inverte');
  assert.equal(apply('sides', 'y z < 3', [], '/ y').error, 'err.signUnknown', 'y sem hipótese');
  const moved = shiftSideways(parseAscii('y x < 3'), [0, 1], +1);
  assert.equal(toAscii(moved.tree), 'y < 3/x');
  assert.match(fmt(moved.label), /usando x > 0/);
  assert.equal(apply('powers', 'y = sqrt(x^2)', [1]).text, 'y = x');
  assert.equal(apply('powers', 'y = sqrt(z^2)', [1]).text, 'y = abs(z)');
}));
