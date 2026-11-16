import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAscii } from '../src/parse-ascii.js';
import { parseLatex } from '../src/parse-latex.js';
import { toAscii, toLatex } from '../src/serialize.js';
import { toMathJson } from '../src/mathjson.js';
import { RULES } from '../src/rules/index.js';

const rule = (id) => RULES.find((r) => r.id === id);
const run = (id, src, focus = [], sel = []) => {
  const tree = parseAscii(src);
  const r = rule(id).run({ tree, focus, targets: sel.length ? sel : [focus] });
  return r && toAscii(r.tree);
};

test('leitura de complexos', () => {
  assert.deepEqual(toMathJson(parseAscii('3 + 2i')), ['Add', 3, ['Multiply', 2, 'ImaginaryUnit']]);
  assert.deepEqual(toMathJson(parseAscii('x_i + i_1')), ['Add', 'x_i', 'i_1'], 'subscrito i continua variável');
  assert.deepEqual(toMathJson(parseAscii('|z|^2 = z conj(z)')),
    ['Equal', ['Power', ['Abs', 'z'], 2], ['Multiply', 'z', ['Conjugate', 'z']]]);
  assert.deepEqual(toMathJson(parseAscii('|a||b|')), ['Multiply', ['Abs', 'a'], ['Abs', 'b']]);
  assert.deepEqual(toMathJson(parseAscii('Re(z) + im(w)')), ['Add', ['Real', 'z'], ['Imaginary', 'w']]);
  assert.deepEqual(toMathJson(parseLatex('\\overline{z} + \\bar w')), ['Add', ['Conjugate', 'z'], ['Conjugate', 'w']]);
  assert.deepEqual(toMathJson(parseLatex('2\\mathrm{i} + \\Re(z) + \\left|z\\right|')),
    ['Add', ['Multiply', 2, 'ImaginaryUnit'], ['Real', 'z'], ['Abs', 'z']]);
});

test('ida e volta', () => {
  for (const s of ['z conj(z) = |z|^2', '3 - 2i', 'x*i + p*i', 'Re(z) = (z + conj(z))/2', 'conj(a + b)']) {
    const t = parseAscii(s);
    assert.deepEqual(toMathJson(parseAscii(toAscii(t))), toMathJson(t), s);
    assert.deepEqual(toMathJson(parseLatex(toLatex(t))), toMathJson(t), s);
  }
});

test('calcular com complexos', () => {
  assert.equal(run('calc', 'w = (2 + 3i)(1 - i)', [1]), 'w = 5 + i');
  assert.equal(run('calc', 'w = i^2', [1]), 'w = -1');
  assert.equal(run('calc', 'w = 1/(1 + i)', [1]), 'w = 1/2 - (1/2)i');
  assert.equal(run('calc', 'w = |3 + 4i|', [1]), 'w = 5');
  assert.equal(run('calc', 'w = conj(3 + 2i)', [1]), 'w = 3 - 2i');
  assert.equal(run('calc', 'w = Re(3 + 2i) + Im(3 + 2i)', [1]), 'w = 5');
  assert.equal(run('calc', 'w = 3 + 2i', [1]), null, 'já está na forma a + bi');
  assert.equal(run('calc', 'w = |1 + i|', [1]), null, '√2 não é racional');
});

test('propriedades do conjugado', () => {
  assert.equal(run('conj', 'w = conj(a + b)', [1]), 'w = conj(a) + conj(b)');
  assert.equal(run('conj', 'w = conj(a - b)', [1]), 'w = conj(a) - conj(b)');
  assert.equal(run('conj', 'w = conj(a b)', [1]), 'w = conj(a)*conj(b)');
  assert.equal(run('conj', 'w = conj(a/b)', [1]), 'w = conj(a)/conj(b)');
  assert.equal(run('conj', 'w = conj(z^2)', [1]), 'w = conj(z)^2');
  assert.equal(run('conj', 'w = conj(conj(z))', [1]), null, 'conjugado duplo: regra própria');
  assert.equal(run('conj', 'w = conj(i)', [1]), 'w = -i');
  assert.equal(run('conj', 'w = conj(3 + 2i)', [1]), 'w = 3 - 2i');
  assert.equal(run('conj', 'w = conj(z)', [1]), null);
});

test('z·z̄ ↔ |z|²', () => {
  assert.equal(run('conjprod', 'w = z conj(z)', [1]), 'w = abs(z)^2');
  assert.equal(run('conjprod', 'w = 2 conj(z) z', [1]), 'w = 2abs(z)^2', 'par em qualquer ordem');
  assert.equal(run('conjprod', 'w = |z|^2', [1]), 'w = z*conj(z)');
  assert.equal(run('conjprod', 'w = |z|^3', [1]), null);
  assert.equal(run('conjprod', 'w = z conj(y)', [1]), null);
});

test('z ± z̄ ↔ 2Re(z) / 2i·Im(z)', () => {
  assert.equal(run('conjsum', 'w = z + conj(z)', [1]), 'w = 2re(z)');
  assert.equal(run('conjsum', 'w = z - conj(z)', [1]), 'w = 2i*im(z)');
  assert.equal(run('conjsum', 'w = conj(z) - z', [1]), 'w = -2i*im(z)');
  assert.equal(run('conjsum', 'w = 1 + z + conj(z)', [1]), 'w = 1 + 2re(z)');
  assert.equal(run('conjsum', 'w = 2Re(z)', [1]), 'w = z + conj(z)');
  assert.equal(run('conjsum', 'w = 2i Im(z)', [1]), 'w = z - conj(z)');
  assert.equal(run('conjsum', 'w = Re(z)', [1]), 'w = (z + conj(z))/2');
  assert.equal(run('conjsum', 'w = Im(z)', [1]), 'w = (z - conj(z))/(2i)');
});

test('multiplicar pelo conjugado', () => {
  assert.equal(run('timesconj', 'w = 1/(3 + 4i)', [1]), 'w = (1(3 - 4i))/((3 + 4i)(3 - 4i))');
  assert.equal(run('timesconj', 'w = a/(z + i)', [1]), 'w = (a*conj(z + i))/((z + i)*conj(z + i))');
  assert.equal(run('timesconj', 'w = 1/3', [1]), null);
});

test('resultado complexo dentro de uma soma não ganha parênteses', () => {
  assert.equal(run('calc', 'w = 1 + (2 + 3i)(1 - i)', [1, 1]), 'w = 1 + 5 + i');
});

test('z ↔ z̄̄ nos dois sentidos', () => {
  assert.equal(run('dconj', 'w = conj(conj(z))', [1]), 'w = z', 'foco no conjugado duplo');
  assert.equal(run('dconj', 'w = conj(conj(z))', [1, 0]), 'w = z', 'foco no conjugado de dentro');
  assert.equal(run('dconj', 'w = conj(conj(z))', [1, 0, 0]), 'w = z', 'foco em z');
  assert.equal(run('dconj', 'w = 1 + conj(conj(a + b))', [1, 1]), 'w = 1 + a + b');
  assert.equal(run('dconj', 'w = z + i', [1, 0]), 'w = conj(conj(z)) + i', 'ida: z → z̄̄');
  assert.equal(run('dconj', 'w = |z|^2', [1, 0, 0]), 'w = abs(conj(conj(z)))^2');
  assert.equal(run('dconj', 'w = x + 1', [1, 0]), null, 'sem complexos na expressão');
  assert.equal(run('dconj', 'w = i', []), null, 'não na equação inteira');
});

test('√(−1) = i e os sinais nos radicais', async () => {
  const { RULES } = await import('../src/rules/index.js');
  const { parseAscii } = await import('../src/parse-ascii.js');
  const { toAscii } = await import('../src/serialize.js');
  const { withEnvironment } = await import('../src/types.js');
  const { parseHypotheses } = await import('../src/hypotheses.js');
  const pw = RULES.find((r) => r.id === 'powers');
  const first = (src, hyps = '') => withEnvironment({ hyps: hyps ? parseHypotheses(hyps) : [] }, () => {
    const o = pw.run({ tree: parseAscii(src), focus: [1], targets: [[1]], definitions: {} });
    return o?.error ?? toAscii(o.tree);
  });
  assert.equal(first('z = sqrt(-1)'), 'z = i');
  assert.equal(first('z = sqrt(-4)'), 'z = i*sqrt(4)');
  assert.equal(first('z = sqrt(-a)', 'seja a > 0'), 'z = i*sqrt(a)');
  assert.equal(first('z = sqrt(-2) sqrt(-3)'), 'err.sqrtSigns');
  assert.equal(first('z = sqrt(x) sqrt(y)'), 'err.sqrtSigns');
  assert.equal(first('z = sqrt(x) sqrt(y)', 'seja x > 0'), 'z = sqrt(xy)');
  assert.equal(first('z = sqrt(2) sqrt(-3)'), 'z = sqrt(2(-3))');
  assert.equal(first('z = sqrt(x)/sqrt(y)'), 'err.sqrtDenominator');
  assert.equal(first('z = sqrt(x)/sqrt(y)', 'seja y > 0'), 'z = sqrt(x/y)');
});
