import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAscii } from '../src/parse-ascii.js';
import { parseLatex } from '../src/parse-latex.js';
import { toAscii, toLatex, looseSame } from '../src/serialize.js';
import { toMathJson, fromMathJson } from '../src/mathjson.js';

const roundTrip = (src) => {
  const t = parseAscii(src);
  assert.ok(looseSame(parseAscii(toAscii(t)), t), `ascii: ${src}`);
  assert.ok(looseSame(parseLatex(toLatex(t)), t), `latex: ${src} → ${toLatex(t)}`);
  assert.ok(looseSame(fromMathJson(toMathJson(t)), t), `mathjson: ${src}`);
  return toAscii(t);
};

test('notação de cálculo: ida e volta em ASCII, LaTeX e MathJSON', () => {
  for (const s of [
    'lim_(x->0) sin(x)/x', 'lim_(x->0^+) 1/x', 'lim_(x->-oo) e^x + 1', 'lim_(h->0) (f(x + h) - f(x))/h',
    'd/dx (x^2 + 1)', 'd^2/dx^2 sin(x)', 'x*d/dx f(x)',
    'int x^2 dx', 'int_0^1 x^2 dx', 'int_a^b f(x) dx', 'int_0^oo e^(-x) dx', 'int 1/x dx',
    '[F(t)]_(t=a)^b', "f'(x) = 2x", "y'' + y = 0", 'f(x) = x^2',
  ]) assert.equal(roundTrip(s), s);
});

test('notação de cálculo: leitura', () => {
  assert.equal(toAscii(parseAscii('a(x + 1)')), 'a(x + 1)', 'a(…) continua produto');
  assert.equal(parseAscii('f(x)').op, 'Call');
  assert.equal(parseAscii('int dx').args[1].value, '1', '∫ dx = ∫ 1 dx');
  assert.equal(toAscii(parseAscii('[x^2]_0^1')), '[x^2]_(x=0)^1', 'variável deduzida');
  assert.equal(toAscii(parseAscii('int sin x dx + 1')), 'int sin(x) dx + 1', 'o dx fecha o integrando');
  assert.equal(toAscii(parseLatex('\\lim_{x\\to 0^{+}} \\frac{1}{x}')), 'lim_(x->0^+) 1/x');
  assert.equal(toAscii(parseLatex('\\frac{d^2y}{dx^2}')), 'd^2/dx^2 y');
  assert.equal(toAscii(parseLatex('\\int_{0}^{1} x^2\\,\\mathrm{d}x')), 'int_0^1 x^2 dx');
  assert.equal(toAscii(parseLatex('f^{\\prime\\prime}(x)')), "f''(x)");
  assert.equal(toAscii(parseLatex('\\left. x^2 \\right|_0^1')), '[x^2]_(x=0)^1');
  assert.deepEqual(toMathJson(parseAscii('int_0^1 x dx')), ['Integrate', 'x', ['Limits', 'x', 0, 1]]);
  assert.deepEqual(toMathJson(parseAscii('d/dx x^2')), ['D', ['Power', 'x', 2], 'x']);
  assert.throws(() => parseAscii('int x^2'), /err.differential/);
  assert.throws(() => parseAscii('lim x'), /err.limit/);
});
