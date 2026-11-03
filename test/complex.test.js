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
  assert.equal(run('conj', 'w = conj(conj(z))', [1]), 'w = z');
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
