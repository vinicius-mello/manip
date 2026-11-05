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

// Operação que pede texto.
function withInput(id, src, input, focus = [1]) {
  const tree = parseAscii(src);
  const r = RULES.find((x) => x.id === id).run({ tree, focus, targets: [focus], input });
  return r?.tree ? toAscii(r.tree) : r?.error;
}

test('integrais: tabela, + C só quando resolvida, linearidade e limites', () => {
  assert.equal(first('integrals', 'y = int x^2 dx'), 'y = (x^3)/3 + C');
  assert.equal(first('integrals', 'y = int 5 dx'), 'y = 5x + C');
  assert.equal(first('integrals', 'y = int 1/x dx'), 'y = ln(abs(x)) + C');
  assert.equal(first('integrals', 'y = int 2^x dx'), 'y = (2^x)/ln(2) + C');
  assert.equal(first('integrals', 'y = int sin x dx'), 'y = -cos(x) + C');
  assert.equal(first('integrals', 'y = int 1/(1+x^2) dx'), 'y = arctan(x) + C');
  assert.equal(first('integrals', "y = int f'(x) dx"), 'y = f(x) + C');
  assert.equal(first('integrals', 'y = int t^n dt'), 'y = (t^(n + 1))/(n + 1) + C');
  assert.equal(first('integrals', 'y = int x dx + int 1 dx', [1, 0]), 'y = (x^2)/2 + int 1 dx', 'sem C enquanto há integral');
  assert.equal(first('integrals', 'y = x^2/2 + int 1 dx', [1, 1]), 'y = (x^2)/2 + x + C');
  assert.equal(first('integrals', 'C = int x dx'), 'C = (x^2)/2 + C_1', 'C já usado');
  assert.equal(first('integrals', 'y = int (3x^2 + 2x - 1) dx'), 'y = int 3x^2 dx + int 2x dx - int 1 dx');
  assert.equal(first('integrals', 'y = int 3x^2 dx'), 'y = 3int x^2 dx');
  assert.equal(first('integrals', 'y = int_0^1 x^2 dx'), 'y = [(x^3)/3]_(x=0)^1');
  assert.equal(first('integrals', 'y = [x^3/3]_0^1'), 'y = (1^3)/3 - (0^3)/3');
  assert.deepEqual(forms('intdef', 'y = int_0^1 x^2 dx'), [
    'y = -int_1^0 x^2 dx | inverter os limites',
    'y = lim_(n->oo) sum_(k=1)^n (k(1/n))^2(1/n) | soma de Riemann',
  ]);
  assert.ok(forms('integrals', 'y = int_a^a x dx').includes('y = 0 | intervalo vazio'));
  assert.equal(first('integrals', 'y = int x dx + int x^2 dx'), 'y = int (x + x^2) dx');
  assert.equal(first('integrals', 'y = int_0^1 x dx + int_1^2 x dx'), 'y = int_0^2 x dx');
  assert.equal(first('integrals', 'y = 2 int x dx'), 'y = int 2x dx');
  assert.equal(first('derivs', 'y = d/dx int_0^x sin(t^2) dt'), 'y = sin(x^2)');
  assert.equal(first('derivs', 'y = d/dx int_x^(2x) e^t dt'), 'y = e^(2x)d/dx (2x) - e^x');
});

test('integrais: substituição e por partes', () => {
  assert.equal(withInput('intsubst', 'y = int 2x cos(x^2) dx', 'u = x^2'), 'y = int cos(u) du');
  assert.equal(withInput('intsubst', 'y = int x cos(x^2) dx', 'x^2'), 'y = int (1/2)*cos(u) du');
  assert.equal(withInput('intsubst', 'y = int ln(x)/x dx', 'u = ln(x)'), 'y = int u du');
  assert.equal(withInput('intsubst', 'y = int 2x/(x^2+1) dx', 'u = x^2 + 1'), 'y = int 1/u du');
  assert.equal(withInput('intsubst', 'y = int_0^1 x e^(x^2) dx', 'u = x^2'), 'y = int_(0^2)^(1^2) (1/2)e^u du');
  assert.equal(withInput('intsubst', 'y = int x^2 cos(x^2) dx', 'u = x^2'), 'err.substLeft');
  assert.equal(withInput('intsubst', 'y = int x dx', 'u = t^2'), 'err.substU');
  assert.equal(withInput('intparts', 'y = int x e^x dx', 'u = x'), 'y = xe^x - int e^x*d/dx x dx');
  assert.equal(withInput('intparts', 'y = int ln(x) dx', 'u = ln(x)'), 'y = ln(x)x - int x*d/dx ln(x) dx');
  assert.equal(withInput('intparts', 'y = int_0^1 x e^x dx', 'u = x'), 'y = [xe^x]_(x=0)^1 - int_0^1 e^x*d/dx x dx');
  assert.equal(withInput('intparts', 'y = int x e^x dx', 'u = y'), 'err.partsU');
});

test('limites: substituição, propriedades, notáveis, L\'Hôpital', () => {
  assert.equal(first('limits', 'y = lim_(x->2) (x^2 + 1)'), 'y = 2^2 + 1');
  assert.equal(first('limits', 'y = lim_(x->3) 5'), 'y = 5');
  assert.equal(first('limits', 'y = lim_(x->1) (x^2-1)/(x-1)'), "y = lim_(x->1) (d/dx (x^2 - 1))/(d/dx (x - 1))");
  assert.equal(forms('limits', 'y = lim_(x->1) (x^2-1)/(x-1)')[0].split(' | ')[1], "L'Hôpital (forma 0/0)");
  assert.equal(first('limits', 'y = lim_(x->0) sin(x)/x'), 'y = 1');
  assert.equal(first('limits', 'y = lim_(x->0) sin(3x)/(3x)'), 'y = 1');
  assert.equal(first('limits', 'y = lim_(x->0) (e^x - 1)/x'), 'y = 1');
  assert.equal(first('limits', 'y = lim_(x->oo) (1 + 2/x)^x'), 'y = e^2');
  assert.equal(first('limits', 'y = lim_(x->oo) 1/x^2'), 'y = 0');
  assert.equal(first('limits', 'y = lim_(x->oo) (2x+1)/(x+3)'), "y = lim_(x->oo) (d/dx (2x + 1))/(d/dx (x + 3))");
  assert.equal(first('limits', 'y = lim_(x->2) 3x^2'), 'y = 3*2^2');
  assert.ok(forms('limits', 'y = lim_(x->2) (x + 1)/(x - 1)').includes('y = (lim_(x->2) (x + 1))/(lim_(x->2) (x - 1)) | limite do quociente'));
  assert.equal(first('limits', 'y = lim_(h->0) ((x+h)^2 - x^2)/h'), 'y = d/dx x^2');
  assert.equal(first('limits', 'y = lim_(x->-oo) e^x'), 'y = lim_(t->0^-) e^(1/t)');
});

test('limites: substituição recusada nas formas indeterminadas', () => {
  const tree = parseAscii('y = lim_(x->0) 1/x');
  const r = RULES.find((x) => x.id === 'limits').run({ tree, focus: [1], targets: [[1]] });
  assert.equal(r.error, 'err.limDiv0');
  const s = parseAscii('y = lim_(x->1) (x^2-1)/(x-1)');
  const all = RULES.find((x) => x.id === 'limits').all({ tree: s, focus: [1], targets: [[1]] });
  assert.ok(!all.some((f) => f.label && fmt(f.label) === 'substituição direta'));
});
