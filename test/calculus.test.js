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

import { RULES } from '../src/rules/index.js';
import { fmt } from '../src/i18n.js';

// Todas as formas de uma tecla, com o rótulo de cada uma.
function forms(id, src, focus = [1]) {
  const tree = parseAscii(src);
  return RULES.find((r) => r.id === id).all({ tree, focus, targets: [focus] })
    .filter((r) => r.tree).map((r) => `${toAscii(r.tree)} | ${fmt(r.label)}`);
}
const first = (id, src, focus) => forms(id, src, focus)[0]?.split(' | ')[0] ?? null;

test('derivadas: uma camada por vez', () => {
  assert.equal(first('derivs', 'y = d/dx (x^2 + 3x - 1)'), 'y = d/dx x^2 + d/dx (3x) - d/dx 1');
  assert.equal(first('derivs', 'y = d/dx 5'), 'y = 0');
  assert.equal(first('derivs', 'y = d/dx x'), 'y = 1');
  assert.equal(first('derivs', 'y = d/dx x^2'), 'y = 2x');
  assert.equal(first('derivs', 'y = d/dx x^n'), 'y = nx^(n - 1)');
  assert.equal(first('derivs', 'y = d/dx (3x^2)'), 'y = 3d/dx x^2');
  assert.equal(first('derivs', 'y = d/dx (x sin x)'), 'y = (d/dx x)*sin(x) + x*d/dx sin(x)');
  assert.equal(first('derivs', 'y = d/dx (x/(x+1))'), 'y = ((d/dx x)(x + 1) - x*d/dx (x + 1))/((x + 1)^2)');
  assert.equal(first('derivs', 'y = d/dx sin(x^2)'), 'y = cos(x^2)d/dx x^2');
  assert.equal(first('derivs', 'y = d/dx e^(2x)'), 'y = e^(2x)d/dx (2x)');
  assert.equal(first('derivs', 'y = d/dx 2^x'), 'y = 2^x*ln(2)');
  assert.equal(first('derivs', 'y = d/dx ln x'), 'y = 1/x');
  assert.equal(first('derivs', 'y = d/dx (x^2 + 1)^5'), 'y = 5(x^2 + 1)^4d/dx (x^2 + 1)');
  assert.equal(first('derivs', 'y = d/dt (x t)'), 'y = x*d/dt t', 'x é constante em d/dt');
  assert.equal(first('derivs', 'y = d/dx sin(x)', [1, 1, 0]), 'y = cos(x)', 'foco dentro da derivada');
});

test('derivadas: f′, ordem superior, definição e sentidos inversos', () => {
  assert.equal(first('derivs', 'y = d/dx f(x)'), "y = f'(x)");
  assert.equal(first('derivs', 'y = d/dx f(g(x))'), "y = f'(g(x))d/dx g(x)");
  assert.deepEqual(forms('derivs', 'y = d^2/dx^2 f(x)'), ['y = d/dx (d/dx f(x)) | derivada de ordem superior', "y = f''(x) | notação f′"]);
  assert.equal(first('derivs', "y = f''(x)"), 'y = d^2/dx^2 f(x)');
  assert.equal(first('derivs', 'y = d/dx x + d/dx x^2'), 'y = d/dx (x + x^2)');
  assert.equal(first('derivs', 'y = 3 d/dx x^2'), 'y = d/dx (3x^2)');
  assert.ok(forms('derivs', 'y = d/dx x^2').includes('y = lim_(h->0) ((x + h)^2 - x^2)/h | definição de derivada'));
});
