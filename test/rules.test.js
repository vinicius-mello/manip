import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAscii } from '../src/parse-ascii.js';
import { toAscii } from '../src/serialize.js';
import { getAt } from '../src/ast.js';
import { RULES, applicable } from '../src/rules/index.js';

const rule = (id) => RULES.find((r) => r.id === id);

// Aplica a regra com foco em `focus` e seleção `sel` (caminhos).
function run(id, src, focus, sel = [], input) {
  const tree = parseAscii(src);
  const r = rule(id).run({ tree, focus, targets: sel.length ? sel : [focus], input });
  return r && toAscii(r.tree);
}

test('calcular: subexpressão numérica, sem tocar no resto', () => {
  assert.equal(run('calc', 'x = 7 - 3', [1]), 'x = 4');
  assert.equal(run('calc', 'x = 2*3 + y', [1, 0]), 'x = 6 + y');
  assert.equal(run('calc', 'x = 3 - 7', [1]), 'x = -4');
  assert.equal(run('calc', 'x = 6/4', [1]), 'x = 3/2');
  assert.equal(run('calc', 'x = 0.5 + 0.25', [1]), 'x = 0.75');
  assert.equal(run('calc', 'x = 2^-2', [1]), 'x = 1/4');
  assert.equal(run('calc', 'x = 3/4', [1]), null, 'já é irredutível');
  assert.equal(run('calc', 'x = 1/0', [1]), null);
  assert.equal(run('calc', 'x = y + 2', [1]), null);
  // termos selecionados de uma soma
  assert.equal(run('calc', 'x = 2 + y + 3', [1, 0], [[1, 0], [1, 2]]), 'x = 5 + y');
});

test('distribuir', () => {
  assert.equal(run('dist', '2(x + 1) = 4', [0]), '2x + 2*1 = 4');
  assert.equal(run('dist', 'a(b - c) = 0', [0]), 'ab - ac = 0');
  assert.equal(run('dist', '(x + 1)*3 = 0', [0]), 'x*3 + 1*3 = 0');
  assert.equal(run('dist', 'y + 2(x + 1) = 0', [0, 1]), 'y + 2x + 2*1 = 0');
  assert.equal(run('dist', '-(a - b) = 0', [0]), '-a - (-b) = 0');
  assert.equal(run('dist', 'x = 5', [0]), null);
});

test('pôr em evidência', () => {
  assert.equal(run('factor', '2x + 2y = 0', [0, 0, 0]), '2(x + y) = 0');
  assert.equal(run('factor', 'ax + bx = 0', [0, 0, 1]), '(a + b)x = 0');
  assert.equal(run('factor', 'x^2 - x = 0', [0, 1, 0]), null, 'x^2 não é x·x para esta regra');
  assert.equal(run('factor', '2x - 2 = 0', [0, 0, 0]), '2(x - 1) = 0');
  assert.equal(run('factor', '2x + 3y = 0', [0, 0, 0]), null);
  // só os termos selecionados
  assert.equal(run('factor', '2x + 2y + z = 0', [0, 0, 0], [[0, 0], [0, 1]]), '2(x + y) + z = 0');
});

test('cancelar termos opostos e fatores', () => {
  assert.equal(run('cancel', 'x + 3 - 3 = 5', [0, 1]), 'x = 5');
  assert.equal(run('cancel', 'x + 3 - 3 = 5', [0, 1], [[0, 1], [0, 2]]), 'x = 5');
  assert.equal(run('cancel', '3 - 3 = y', [0, 0]), '0 = y');
  assert.equal(run('cancel', 'x = (2y)/(2z)', [1, 0, 0]), 'x = y/z');
  assert.equal(run('cancel', 'x = (2y)/2', [1, 1]), 'x = y/1');
  assert.equal(run('cancel', 'x + 3 = 5', [0, 1]), null);
});

test('elemento neutro, parênteses e sinais', () => {
  assert.equal(run('neutral', 'x = y/1', [1]), 'x = y');
  assert.equal(run('neutral', 'x + 0 = y', [0, 1]), 'x = y');
  assert.equal(run('neutral', '1x = y', [0]), 'x = y');
  assert.equal(run('parens', 'a + (b + c) = 0', [0, 1]), 'a + b + c = 0');
  assert.equal(run('parens', '(b) = 0', [0]), 'b = 0');
  assert.equal(run('parens', '2(x + 1) = 0', [0, 1]), null, 'parênteses necessários');
  assert.equal(run('parens', 'a + (-b) = 0', [0, 1]), 'a - b = 0');
  assert.equal(run('signs', 'x = -(-y)', [1]), 'x = y');
  assert.equal(run('signs', 'x = a - (-b)', [1, 1]), 'x = a + b');
  assert.equal(run('signs', 'x = (-2)(-y)', [1]), 'x = 2y');
  assert.equal(run('signs', 'x = 2(-y)', [1]), 'x = -2y');
});

test('agrupar, frações e potências', () => {
  assert.equal(run('group', 'a + b + c = 0', [0, 1], [[0, 1], [0, 2]]), 'a + (b + c) = 0');
  assert.equal(run('join', 'x/2 + y/2 = 1', [0, 0]), '(x + y)/2 = 1');
  assert.equal(run('join', 'x/2 - y/2 = 1', [0]), '(x - y)/2 = 1');
  assert.equal(run('join', 'x/2 + y/3 = 1', [0]), null);
  assert.equal(run('split', '(x + y)/2 = 1', [0]), 'x/2 + y/2 = 1');
  assert.equal(run('powers', 'x^2 x^3 = 1', [0, 0]), 'x^(2 + 3) = 1');
  assert.equal(run('powers', 'x x = 1', [0, 0]), 'x^(1 + 1) = 1');
  assert.equal(run('powers', 'x^5/x^2 = 1', [0]), 'x^(5 - 2) = 1');
  assert.equal(run('powers', '(x^2)^3 = 1', [0]), 'x^(2*3) = 1');
});

test('operações na equação', () => {
  assert.equal(run('sides', '2x + 3 = 7', [], [], '- 3'), '2x + 3 - 3 = 7 - 3');
  assert.equal(run('sides', '2x = 4', [], [], '/ 2'), '(2x)/2 = 4/2');
  assert.equal(run('sides', 'x + 1 = 4', [], [], '* 2'), '(x + 1)*2 = 4*2');
  assert.equal(run('sides', 'x = 4', [], [], 'oops'), null);
  assert.equal(run('swap', 'x = 4', []), '4 = x');
});

test('ids preservados: o fator em evidência é o mesmo nó', () => {
  const tree = parseAscii('2x + 2y = 0');
  const two = getAt(tree, [0, 0, 0]);
  const r = rule('factor').run({ tree, focus: [0, 0, 0], targets: [[0, 0, 0]] });
  assert.equal(getAt(r.tree, [0, 0]).id, two.id);
  assert.deepEqual(r.hints.merge, { to: two.id, from: [getAt(tree, [0, 1, 0]).id] });
});

test('menu lista só regras aplicáveis', () => {
  const tree = parseAscii('2x + 3 - 3 = 7');
  const ids = applicable({ tree, focus: [0, 1], targets: [[0, 1]] }).map((x) => x.rule.id);
  assert.ok(ids.includes('cancel'));
  assert.ok(!ids.includes('dist'));
  assert.ok(ids.includes('sides'));
});

test('substituir: seleção (ou foco) pela entrada do usuário', () => {
  assert.equal(run('subst', 'x + y = 10', [0, 1], [], '2x'), 'x + 2x = 10');
  assert.equal(run('subst', 'a b = c', [0], [[0, 0], [0, 1]], '\\frac{1}{2}'), '(1/2)(1/2) = c');
  assert.equal(run('subst', 'x*a = c', [0, 1], [], '1/2'), 'x(1/2) = c');
  assert.equal(run('subst', 'x = 1', [0], [], 'a = b'), null, 'não aceita equação');
  assert.equal(run('subst', 'x = 1', [0], [], '2 +'), null);
});

test('nomear, expandir e abrir', () => {
  const tree = parseAscii('2(x + 1) = y');
  const ctx = (extra) => ({ tree, focus: [0, 1], targets: [[0, 1]], ...extra });
  const named = rule('name').run(ctx({ input: 'K' }));
  assert.equal(toAscii(named.tree), '2K = y');
  assert.equal(named.action.type, 'define');
  assert.equal(toAscii(named.action.def), '(x + 1)');
  assert.equal(rule('name').run(ctx({ input: 'K', definitions: { K: tree } })), null, 'nome já usado');
  assert.equal(rule('name').run(ctx({ input: '2a' })), null, 'nome inválido');

  const t2 = named.tree;
  const defs = { K: parseAscii('x + 1') };
  const c2 = { tree: t2, focus: [0, 1], targets: [[0, 1]], definitions: defs };
  assert.equal(toAscii(rule('expand').run(c2).tree), '2(x + 1) = y');
  assert.deepEqual(rule('open').run(c2).action, { type: 'open', name: 'K' });
  assert.equal(rule('expand').run({ ...c2, focus: [0, 0] }), null);
});

test('somar e subtrair a mesma quantidade', () => {
  // completar quadrados: o par entra logo depois do termo em foco
  assert.equal(run('addsub', 'x^2 + 6x = 7', [0, 1], [], '9'), 'x^2 + 6x + 9 - 9 = 7');
  assert.equal(run('addsub', 'x^2 + 6x = 7', [0], [], '9'), 'x^2 + 6x + 9 - 9 = 7');
  assert.equal(run('addsub', 'x^2 + 6x = 7', [1], [], '(b/2)^2'), 'x^2 + 6x = 7 + (b/2)^2 - (b/2)^2');
  assert.equal(run('addsub', '2y = 7', [0, 1], [], 'a'), '2(y + a - a) = 7');
  assert.equal(run('addsub', 'x = 7', [], [], '1'), null, 'não na equação inteira');
  assert.equal(run('addsub', 'x = 7', [0], [], '1 +'), null);
});

test('somar e subtrair na seleção', () => {
  // seleção de dois termos: o par entra depois do último selecionado
  assert.equal(run('addsub', 'x^2 + 6x + 2 = 7', [0, 0], [[0, 0], [0, 1]], '9'), 'x^2 + 6x + 9 - 9 + 2 = 7');
  // a seleção manda, não o foco
  assert.equal(run('addsub', 'x^2 + 6x = 2y', [0, 0], [[1, 1]], 'a'), 'x^2 + 6x = 2(y + a - a)');
  // termos de somas diferentes não formam uma subexpressão
  assert.equal(run('addsub', 'a + b = c + d', [0, 0], [[0, 0], [1, 0]], '1'), null);
});

test('binômio de Newton e multinomial, sem simplificar as bases', () => {
  assert.equal(run('binomial', '(a + b)^2 = 0', [0]), 'a^2 + 2ab + b^2 = 0');
  assert.equal(run('binomial', '(a + b)^3 = 0', [0, 0]), 'a^3 + 3a^2b + 3ab^2 + b^3 = 0');
  assert.equal(run('binomial', '(a - b)^2 = 0', [0]), 'a^2 + 2a(-b) + (-b)^2 = 0');
  assert.equal(run('binomial', '(x + 1)^2 = 0', [0]), 'x^2 + 2x*1 + 1^2 = 0');
  assert.equal(run('binomial', '(2x + 1)^2 = 0', [0]), '(2x)^2 + 2(2x)*1 + 1^2 = 0');
  assert.equal(run('binomial', '(a + b + c)^2 = 0', [0]), 'a^2 + 2ab + 2ac + b^2 + 2bc + c^2 = 0');
  assert.equal(run('binomial', 'y + (a + b)^2 = 0', [0, 1]), 'y + a^2 + 2ab + b^2 = 0');
  assert.equal(run('binomial', '3(a + b)^2 = 0', [0, 1]), '3(a^2 + 2ab + b^2) = 0');
  assert.equal(run('binomial', '(a + b)^n = 0', [0]), null);
  assert.equal(run('binomial', 'x^2 = 0', [0]), null);
});

test('coeficientes multinomiais', () => {
  const t = parseAscii('(a + b + c)^4 = 0');
  const r = rule('binomial').run({ tree: t, focus: [0], targets: [[0]] });
  // 15 termos, coeficientes somam 3^4 = 81
  const terms = r.tree.args[0].args;
  assert.equal(terms.length, 15);
  const coef = (x) => (x.op === 'Multiply' && x.args[0].op === 'Number' ? Number(x.args[0].value) : 1);
  assert.equal(terms.reduce((s, x) => s + coef(x), 0), 81);
});

test('potência como produto', () => {
  assert.equal(run('asproduct', '(a + b)^2 = 0', [0]), '(a + b)(a + b) = 0');
  assert.equal(run('asproduct', 'x^3 = 0', [0]), 'xxx = 0');
  assert.equal(run('asproduct', '(2x)^2 = 0', [0]), '(2x)(2x) = 0');
  assert.equal(run('asproduct', '2^3 = x', [0]), '2*2*2 = x');
  assert.equal(run('asproduct', 'x^n = 0', [0]), null);
});
