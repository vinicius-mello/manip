import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAscii } from '../src/parse-ascii.js';
import { parseLatex } from '../src/parse-latex.js';
import { toAscii, toLatex, looseSame } from '../src/serialize.js';
import { toMathJson, fromMathJson } from '../src/mathjson.js';
import { RULES } from '../src/rules/index.js';
import { shiftSideways } from '../src/moves.js';

const rule = (id) => RULES.find((r) => r.id === id);
function run(id, src, focus, sel = []) {
  const tree = parseAscii(src);
  const r = rule(id).run({ tree, focus, targets: sel.length ? sel : [focus] });
  return r?.tree ? toAscii(r.tree) : r?.error ?? null;
}

test('reticências: notação', () => {
  for (const s of ['a(b + ... + c)', 'a_1 + a_2 + ... + a_n', 'a*...*c', '1 + r + r^2 + ...', 'x_1 - ... - x_n']) {
    const t = parseAscii(s);
    assert.equal(toAscii(t), s);
    assert.ok(looseSame(parseLatex(toLatex(t)), t), s);
    assert.ok(looseSame(fromMathJson(toMathJson(t)), t), s);
  }
  assert.equal(toAscii(parseAscii('a + … + c')), 'a + ... + c');
  assert.equal(toAscii(parseLatex('a_1 \\cdot \\ldots \\cdot a_n')), 'a_1*...*a_n');
  assert.equal(toLatex(parseAscii('a*...*c')), 'a \\cdot \\cdots \\cdot c');
  assert.deepEqual(toMathJson(parseAscii('a + ... + c')), ['Add', 'a', 'ContinuationPlaceholder', 'c']);
});

test('reticências absorvem as operações termo a termo', () => {
  assert.equal(run('dist', 'x = a(b + ... + c)', [1]), 'x = ab + ... + ac');
  assert.equal(run('dist', 'x = a(b - ... - c)', [1]), 'x = ab - ... - ac');
  assert.equal(run('dist', 'x = (a + ... + c)(x + y)', [1]), 'x = a(x + y) + ... + c(x + y)');
  assert.equal(run('flipsigns', 'x = -(b + ... + c)', [1]), 'x = -b - ... - c');
  assert.equal(run('factor', 'x = a b + ... + a c', [1, 0, 0]), 'x = a(b + ... + c)');
  assert.equal(run('join', 'x = (a + ... + c)/d', [1]), 'x = a/d + ... + c/d');
  assert.equal(run('join', 'x = a/d + ... + c/d', [1]), 'x = (a + ... + c)/d');
  assert.equal(run('powers', 'x = (a*...*c)^n', [1]), 'x = a^n*...*c^n');
  assert.equal(run('powers', 'x = a^n*...*c^n', [1]), 'x = (a*...*c)^n');
  assert.equal(run('powers', 'x = 2^(a + ... + c)', [1]), 'x = 2^a*...*2^c');
  assert.equal(run('logs', 'x = ln(a*...*c)', [1]), 'x = ln(a) + ... + ln(c)');
  assert.equal(run('logs', 'x = ln a + ... + ln c', [1]), 'x = ln(a*...*c)');
  assert.equal(run('conj', 'x = conj(a + ... + c)', [1]), 'x = conj(a) + ... + conj(c)');
  assert.equal(run('derivs', 'y = d/dx (f(x) + ... + g(x))', [1]), 'y = d/dx f(x) + ... + d/dx g(x)');
  assert.equal(run('derivs', 'y = d/dx f(x) + ... + d/dx g(x)', [1]), 'y = d/dx (f(x) + ... + g(x))');
  assert.equal(run('integrals', 'y = int (f(x) + ... + g(x)) dx', [1]), 'y = int f(x) dx + ... + int g(x) dx');
  assert.equal(run('integrals', 'y = int f(x) dx + ... + int g(x) dx', [1]), 'y = int (f(x) + ... + g(x)) dx');
  assert.equal(run('limits', 'y = lim_(x->0) (f(x) + ... + g(x))', [1]), 'y = lim_(x->0) f(x) + ... + lim_(x->0) g(x)');
  // série: sem termo à direita
  assert.equal(run('dist', 'x = r(1 + r + r^2 + ...)', [1]), 'x = r*1 + rr + rr^2 + ...');
});

test('reticências: nada separa o … do termo ao lado', () => {
  assert.equal(run('like', 'x = a + ... + a', [1, 0], [[1, 0], [1, 2]]), 'err.dotsEnds');
  assert.equal(run('cancel', 'x = a + ... - a', [1, 0], [[1, 0], [1, 2]]), 'err.dotsEnds');
  assert.equal(run('calc', 'x = 1 + ... + 3', [1, 0], [[1, 0], [1, 2]]), 'err.dotsEnds');
  assert.equal(run('neutral', 'x = 0 + ... + 0', [1]), 'err.dotsEnds');
  assert.equal(run('calc', 'x = 1 + 2 + ... + 3', [1, 0], [[1, 0], [1, 1]]), 'x = 3 + ... + 3');
  const t = parseAscii('a + ... + c = d');
  assert.equal(shiftSideways(t, [0, 2], +1).error, 'err.dotsEnds', 'transpor o c');
  assert.equal(shiftSideways(t, [0, 2], -1).error, 'err.dotsEnds', 'trocar c com …');
  assert.equal(toAscii(shiftSideways(t, [0], +1).tree), '0 = -(a + ... + c) + d', 'o lado inteiro pode');
  assert.equal(toAscii(shiftSideways(parseAscii('a + b + ... + c = d'), [0, 0], +1).tree), 'b + a + ... + c = d');
});
