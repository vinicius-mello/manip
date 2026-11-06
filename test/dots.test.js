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

function forms(id, src, focus) {
  const tree = parseAscii(src);
  return rule(id).all({ tree, focus, targets: [focus] }).filter((r) => r.tree).map((r) => toAscii(r.tree));
}

test('reticências: termo geral deduzido', () => {
  assert.deepEqual(forms('sums', 'S = 1 + 2 + ... + n', [1]), [
    'S = sum_(k=1)^n k',
    'S = 1 + 2 + 3 + ... + n',
    'S = 1 + 2 + ... + (n - 1) + n',
    'S = 1 + 2 + ... + k + ... + n',
    'S = n + (n - 1) + ... + 1',
  ]);
  const toSum = (src) => forms('sums', src, [1])[0];
  assert.equal(toSum('S = a_1 + a_2 + ... + a_n'), 'S = sum_(k=1)^n a_k');
  assert.equal(toSum('S = 1 + r + ... + r^n'), 'S = sum_(k=0)^n r^k');
  assert.equal(toSum('S = x + x^2 + ... + x^n'), 'S = sum_(k=1)^n x^k');
  assert.equal(toSum('S = 2 + 4 + ... + 2n'), 'S = sum_(k=1)^n 2k');
  assert.equal(toSum('S = 1/2 + 2/3 + ... + n/(n+1)'), 'S = sum_(k=1)^n k/(k + 1)');
  assert.equal(toSum('S = 1 + 1/2 + 1/3 + ...'), 'S = sum_(k=1)^oo 1/k');
  assert.equal(toSum('S = n + (n - 1) + ... + 1'), 'S = sum_(k=1)^n k');
  assert.equal(toSum('P = a_1*a_2*...*a_n'), 'P = prod_(k=1)^n a_k');
  assert.equal(toSum('S = x + 1 + 2 + ... + n'), 'S = x + sum_(k=1)^n k', 'só o trecho do padrão');
  assert.equal(forms('sums', 'S = a_1 + a_2 + ... + a_n', [1])[2], 'S = a_1 + a_2 + ... + a_(n-1) + a_n');
  assert.equal(forms('sums', 'S = 1 + r + ... + r^n', [1]).at(-1), 'S = r^n + r^(n - 1) + ... + 1');
  assert.equal(forms('sums', 'S = 1 + 2 + ... + k + ... + n', [1])[0], 'S = 1 + 2 + ... + n');
  // Σ → reticências
  assert.ok(forms('sums', 'S = sum_(k=1)^n k^2', [1]).includes('S = 1^2 + 2^2 + ... + n^2'));
  assert.ok(forms('sums', 'S = sum_(k=0)^oo x^k', [1]).includes('S = x^0 + x^1 + x^2 + ...'));
  // índice no subscrito
  assert.equal(forms('sums', 'S = sum_(k=1)^3 a_k', [1])[0], 'S = a_1 + a_2 + a_3');
});

test('reticências: Gauss, soma termo a termo', () => {
  const tree0 = parseAscii('S = 1 + 2 + ... + n; S = n + (n - 1) + ... + 1');
  const added = rule('addeq').run({ tree: tree0, focus: [1], targets: [[0], [1]] });
  assert.equal(toAscii(added.tree), 'S = 1 + 2 + ... + n; S + S = (n + (n - 1) + ... + 1) + (1 + 2 + ... + n)', 'cada sequência entre parênteses');
  let tree = parseAscii('2S = (1 + 2 + ... + n) + (n + (n - 1) + ... + 1)');
  const go = (id, focus, input) => {
    const r = rule(id).run({ tree, focus, targets: [focus], input });
    tree = r.tree;
    return toAscii(tree);
  };
  assert.equal(go('sums', [1]), '2S = (1 + n) + (2 + (n - 1)) + ... + (n + 1)');
  go('rewrite', [1, 0], 'n + 1');
  assert.equal(go('rewrite', [1, 1], 'n + 1'), '2S = (n + 1) + (n + 1) + ... + (n + 1)');
  // o … lembra quantos termos são
  assert.equal(go('sums', [1]), '2S = sum_(k=1)^n (n + 1)');
  const t = rule('sums').all({ tree, focus: [1], targets: [[1]] }).map((r) => toAscii(r.tree));
  assert.ok(t.includes('2S = n(n + 1)'));
});

test('reticências: passo livre conferido', () => {
  const rw = (src, focus, input) => {
    const r = rule('rewrite').run({ tree: parseAscii(src), focus, targets: [focus], input });
    return r.tree ? r.label.key : r.error;
  };
  assert.equal(rw('S = 1 + 2 + ... + n', [1], 'n(n+1)/2'), 'step.rewrite');
  assert.equal(rw('S = 1 + 2 + ... + n', [1], 'n^2/2'), 'err.rewriteExpr');
  assert.equal(rw('S = 1 + r + ... + r^n', [1], '(r^(n+1) - 1)/(r - 1)'), 'step.rewrite');
  assert.equal(rw('S = a_1 + a_2 + ... + a_n', [1], 'a_1 + ... + a_(n-1) + a_n'), 'step.rewrite');
  assert.equal(rw('S = a_1 + a_2 + ... + a_n', [1], 'a_2 + ... + a_n'), 'err.rewriteExpr');
  assert.equal(rw('y = a(b + ... + c)', [1], 'ab + ... + ac'), 'step.rewriteUnchecked', 'sem padrão');
});
