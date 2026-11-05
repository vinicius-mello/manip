import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAscii } from '../src/parse-ascii.js';
import { toAscii, toLatex } from '../src/serialize.js';
import { getAt, findPath } from '../src/ast.js';
import { RULES, applicable } from '../src/rules/index.js';
import { fmt } from '../src/i18n.js';

const rule = (id) => RULES.find((r) => r.id === id);

// Aplica a regra com foco em `focus` e seleção `sel` (caminhos).
function run(id, src, focus, sel = [], input) {
  const tree = parseAscii(src);
  const r = rule(id).run({ tree, focus, targets: sel.length ? sel : [focus], input });
  return r?.tree ? toAscii(r.tree) : null;
}

// Rótulo do passo (em português), com as igualdades anotadas.
function label(id, src, focus) {
  const tree = parseAscii(src);
  const r = rule(id).run({ tree, focus, targets: [focus] });
  return r?.label && fmt(r.label);
}

// Todas as formas de uma equivalência, na ordem.
function forms(id, src, focus, sel = []) {
  const tree = parseAscii(src);
  return rule(id).all({ tree, focus, targets: sel.length ? sel : [focus] }).filter((r) => r.tree).map((r) => toAscii(r.tree));
}

test('equivalências nos dois sentidos', () => {
  // frações: produto ↔ separado
  assert.equal(run('join', '(a b)/(c d) = 1', [0], [[0, 0, 0], [0, 1, 0]]), '(a/c)(b/d) = 1', 'a e c selecionados');
  assert.equal(run('join', '(a b)/(c d) = 1', [0]), '(a/c)(b/d) = 1', 'pela posição');
  assert.equal(run('join', '(2x)/3 = 1', [0, 0, 0]), '2(x/3) = 1', 'só o 2: sai da fração');
  assert.equal(run('join', '(2x)/3 = 1', [0]), '(2/3)x = 1', 'pela posição');
  assert.equal(run('join', '(a b c)/(d e) = 1', [0]), '(a/d)(b/e)c = 1');
  assert.equal(run('join', 'a/(c d) = 1', [0]), '(a/c)(1/d) = 1');
  assert.equal(run('join', 'a/b = 1', [0]), null);
  // multiplicar em cima e embaixo
  assert.equal(run('expandfrac', 'x = 1/2', [1], [], '3'), 'x = (1*3)/(2*3)');
  assert.equal(run('expandfrac', 'x = (a b)/(x + 1)', [1, 0, 0], [], 'x - 1'), 'x = (ab(x - 1))/((x + 1)(x - 1))');
  // potências: aⁿbⁿ ↔ (ab)ⁿ
  assert.equal(run('powers', 'a^2 b^2 = 1', [0]), '(ab)^2 = 1');
  assert.equal(run('powers', 'a^n b^n c = 1', [0, 1]), '(ab)^nc = 1');
  assert.equal(run('powers', '(a^2)/(b^2) = 1', [0]), '(a/b)^2 = 1');
  assert.equal(run('powers', '(ab)^n = 1', [0]), 'a^nb^n = 1');
  assert.equal(run('powers', '(a/b)^2 = 1', [0]), '(a^2)/(b^2) = 1');
  assert.equal(run('powers', 'x^(a + b) = 1', [0]), 'x^ax^b = 1');
  assert.equal(run('powers', 'x^(2 + 3) = 1', [0]), 'x^2x^3 = 1');
  assert.equal(run('powers', 'x^(a b) = 1', [0]), '(x^a)^b = 1');
  assert.deepEqual(forms('powers', 'x^2 x^2 = 1', [0]), ['x^4 = 1', '(xx)^2 = 1']);
  // binômio ↔ produto notável
  assert.equal(run('binomial', '(x + 3)^2 = 0', [0]), 'x^2 + 2x*3 + 3^2 = 0');
});

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
  // fatores selecionados em cima e embaixo, inclusive em frações diferentes
  assert.equal(run('cancel', 'x = (2y)/(2z)', [1, 1, 0], [[1, 0, 0], [1, 1, 0]]), 'x = y/z');
  assert.equal(run('cancel', 'x = (a/b)(b/c)', [1, 1, 0, 0], [[1, 0, 0, 1], [1, 1, 0, 0]]), 'x = (a/1)(1/c)');
  assert.equal(run('cancel', 'x = 2(y/2)', [1, 0], [[1, 0], [1, 1, 0, 1]]), 'x = (y/1)', 'fator solto');
  assert.equal(run('cancel', 'x = (-a b)/(b c)', [1, 0, 0, 1], [[1, 0, 0, 1], [1, 1, 0]]), 'x = (-a)/c', 'numerador com sinal');
  assert.equal(run('cancel', 'x = (a/b)(c/d)', [1, 0, 0, 0], [[1, 0, 0, 0], [1, 1, 0, 1]]), null, 'diferentes');
  assert.equal(run('cancel', 'x = (a/b) + (b/c)', [1, 0, 0, 1], [[1, 0, 0, 1], [1, 1, 0, 0]]), null, 'soma: não');
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
  assert.equal(run('join', '(x + y)/2 = 1', [0]), 'x/2 + y/2 = 1');
  // produto de frações
  assert.equal(run('join', '(a/b)(c/d) = 1', [0]), '(ac)/(bd) = 1');
  assert.equal(run('join', '(a/b)(c/d) = 1', [0, 1]), '(ac)/(bd) = 1', 'foco num fator');
  assert.equal(run('join', '2(x/3) = 1', [0]), '(2x)/3 = 1', 'fator solto vai para o numerador');
  assert.equal(run('join', 'y(a/b)(c/d) = 1', [0, 1], [[0, 1], [0, 2]]), 'y((ac)/(bd)) = 1', 'só os selecionados');
  assert.equal(run('join', '((x + 1)/2)((x - 1)/3) = 1', [0]), '((x + 1)(x - 1))/(2*3) = 1');
  assert.equal(run('join', 'a b = 1', [0]), null);
  assert.equal(run('powers', 'x^2 x^3 = 1', [0, 0]), 'x^5 = 1');
  assert.equal(run('powers', 'x^2 x = 1', [0]), 'x^3 = 1', 'foco no produto');
  assert.equal(run('powers', 'x^5/x^2 = 1', [0]), 'x^3 = 1');
  assert.equal(run('powers', 'x^2/x^5 = 1', [0]), 'x^(-3) = 1');
  assert.equal(run('powers', 'x^3/x^2 = 1', [0]), 'x = 1', 'expoente 1');
  assert.equal(run('powers', '(x^2)^3 = 1', [0]), 'x^6 = 1');
  assert.equal(run('powers', 'x^n x^2 = 1', [0]), 'x^(n + 2) = 1', 'simbólico fica indicado');
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
  assert.equal(run('binomial', '(a + b)^n = 0', [0]), 'sum_(k=0)^n binom(n, k)a^(n - k)b^k = 0', 'expoente simbólico: Σ');
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
  assert.equal(run('powers', '(a + b)^2 = 0', [0]), '(a + b)(a + b) = 0');
  assert.equal(run('powers', 'x^3 = 0', [0]), 'xxx = 0');
  assert.deepEqual(forms('powers', '(2x)^2 = 0', [0]), ['2^2x^2 = 0', '(2x)(2x) = 0'], 'duas formas');
  assert.equal(run('powers', '2^3 = x', [0]), '2*2*2 = x');
  assert.equal(run('powers', 'x^n = 0', [0]), null);
});

test('pôr entre parênteses', () => {
  assert.equal(run('wrap', 'x + 1 = 2', [0]), '(x + 1) = 2');
  assert.equal(run('wrap', '(x + 1) = 2', [0]), '((x + 1)) = 2', 'nível extra');
  assert.equal(run('wrap', 'a + b + c = 0', [0, 1], [[0, 1], [0, 2]]), 'a + (b + c) = 0');
  assert.equal(run('wrap', 'a b c = 0', [0, 0], [[0, 0], [0, 1]]), '(ab)c = 0');
  assert.equal(run('wrap', 'a + b = 0', [0, 0], [[0, 0], [0, 1]]), '(a + b) = 0', 'soma inteira');
  assert.equal(run('wrap', 'a + b + c = 0', [0, 0], [[0, 0], [0, 2]]), '(a) + b + (c) = 0', 'não vizinhos');
  assert.equal(run('wrap', 'x = 2', []), null, 'não na equação inteira');
});

test('escrever como potência', () => {
  assert.equal(run('powers', 'aa + bb = 0', [0, 0]), 'a^2 + bb = 0', 'foco no produto');
  assert.equal(run('powers', 'aa + bb = 0', [0, 1, 0]), 'aa + b^2 = 0', 'foco num fator');
  assert.equal(run('powers', 'a a b a = 0', [0]), 'a^3b = 0');
  assert.equal(run('powers', 'a a a = 0', [0, 0], [[0, 0], [0, 1]]), 'a^2a = 0', 'só os selecionados');
  assert.equal(run('powers', 'ab = 0', [0]), null);
  assert.equal(run('powers', 'x^2 x = 0', [0]), 'x^3 = 0', 'com expoente: soma os expoentes');
});

test('juntar termos semelhantes', () => {
  assert.equal(run('like', 'a^2 + ab + ab + b^2 = 0', [0, 1]), 'a^2 + 2ab + b^2 = 0');
  assert.equal(run('like', '3x - x = 0', [0, 0]), '2x = 0');
  assert.equal(run('like', 'x - x + y = 0', [0, 0]), '0 + y = 0');
  assert.equal(run('like', '2x - 5x = 0', [0, 0]), '-3x = 0');
  assert.equal(run('like', 'x/2 + x/2 = 0', [0, 0]), '2(x/2) = 0', 'termos iguais, mesmo sendo frações');
  assert.equal(run('like', '(1/2)x + x = 0', [0, 0]), '(3/2)x = 0');
  assert.equal(run('like', 'ab + ba = 0', [0, 0]), '2ab = 0', 'ordem diferente: reconhece');
  assert.equal(label('like', 'ab + ba = 0', [0, 0]), 'juntou termos semelhantes, usando ba = ab');
  assert.equal(run('like', '2(x + 1) + 3(1 + x) = 0', [0, 0]), '5(x + 1) = 0');
  assert.equal(label('cancel', '(a + b) - (b + a) = 0', [0, 0]), 'cancelou termos opostos, usando b + a = a + b');
  assert.equal(label('factor', 'a(x + 1) + b(1 + x) = 0', [0, 0, 1]), 'pôs em evidência, usando 1 + x = x + 1');
  assert.equal(label('like', '2x + 3x = 0', [0, 0]), 'juntou termos semelhantes', 'literal: sem nota');
  assert.equal(run('like', '2 + 3 = x', [0, 0]), null, 'constantes: calcular');
  assert.equal(run('like', 'a + b + a = 0', [0, 0], [[0, 0], [0, 2]]), '2a + b = 0');
});

test('produtos notáveis no sentido inverso', () => {
  assert.equal(run('binomial', 'x^2 + 6x + 9 = 0', [0]), '(x + 3)^2 = 0');
  assert.equal(run('binomial', 'x^2 - 6x + 9 = 0', [0, 0]), '(x - 3)^2 = 0', 'foco num termo');
  assert.equal(run('binomial', '9 + x^2 + 6x = 0', [0]), '(3 + x)^2 = 0', 'termos em outra ordem');
  assert.equal(run('binomial', '4x^2 + 12xy + 9y^2 = 0', [0]), '(2x + 3y)^2 = 0');
  assert.equal(run('binomial', 'a^2 + 2ba + b^2 = 0', [0]), '(a + b)^2 = 0', 'fatores do meio em outra ordem');
  assert.equal(run('binomial', 'x^2 - 4 = 0', [0]), '(x + 2)(x - 2) = 0');
  assert.equal(run('binomial', '-y^2 + x^4 = 0', [0]), '(x^2 + y)(x^2 - y) = 0');
  assert.equal(run('binomial', 'x^2 + 5x + 9 = 0', [0]), null);
  assert.equal(run('binomial', 'x^2 + 4 = 0', [0]), null, 'soma de quadrados não fatora');
  assert.equal(run('binomial', 'x^2 + 6x + 9 + y = 0', [0, 0], [[0, 0], [0, 1], [0, 2]]), '(x + 3)^2 + y = 0', 'seleção');
});

test('sugestão para completar quadrado', () => {
  const add = RULES.find((r) => r.id === 'addsub');
  const sug = (src, focus, sel = []) => add.suggest({ tree: parseAscii(src), focus, targets: sel.length ? sel : [focus] });
  assert.equal(sug('x^2 + 6x = 7', [0]), '9');
  assert.equal(sug('x^2 - 3x = 7', [0]), '9/4');
  assert.equal(sug('y = x^2 + x', [1]), '1/4');
  assert.equal(sug('x^2 + 6y = 7', [0]), null);
});

test('pôr em evidência: fator com sinal, entre parênteses e soma solta', () => {
  // 1 − a − b + ab → 1 − a − b(1 − a) → (1 − a)(1 − b)
  assert.equal(run('factor', '1 - a - b + a*b = 0', [0, 3, 1], [[0, 2], [0, 3]]), '1 - a + b(-1 + a) = 0', 'fator b');
  const step1 = run('factor', '1 - a - b + a*b = 0', [0, 2], [[0, 2], [0, 3]]);
  assert.equal(step1, '1 - a - b(1 - a) = 0', 'fator −b (foco no termo)');
  assert.equal(run('factor', step1, [0, 2, 0, 1]), '(1 - a)(1 - b) = 0', 'fator 1 − a, termos soltos');
  // fator digitado entre parênteses
  assert.equal(run('factor', '(1 - a) - b(1 - a) = 0', [0, 0]), '(1 - a)(1 - b) = 0');
  assert.equal(run('factor', 'x(a + b) + y(a + b) = 0', [0, 0, 1]), '(x + y)(a + b) = 0');
  // −b em toda a soma
  assert.equal(run('factor', '-b + a*b = 0', [0, 0]), '-b(1 - a) = 0');
});

test('pôr em evidência: coeficientes numéricos à esquerda e em foco', () => {
  assert.equal(run('factor', 'x*2 + x*3 = 0', [0, 0, 0]), '(2 + 3)x = 0');
  assert.equal(run('factor', 'x + 3x = 0', [0, 0]), '(1 + 3)x = 0');
  assert.equal(run('factor', 'x*2 - x = y', [0, 1, 0]), '(2 - 1)x = y');
  assert.equal(run('factor', 'a x + 2 x = 0', [0, 0, 1]), '(a + 2)x = 0', 'nem todos numéricos: lado do 1º termo');
  assert.equal(run('factor', 'x a + x*2 = 0', [0, 0, 0]), 'x(a + 2) = 0');
  const tree = parseAscii('x*2 + x*3 = 0');
  const r = rule('factor').run({ tree, focus: [0, 0, 0], targets: [[0, 0, 0]] });
  assert.equal(toAscii(getAt(r.tree, findPath(r.tree, r.focus))), '2 + 3', 'coeficientes em foco');
});

test('pôr em evidência selecionando o fator em cada parcela', () => {
  // b de −b e b de ab (só o b, sem o sinal)
  assert.equal(run('factor', '1 - a - b + a*b = 0', [0, 0], [[0, 2, 0], [0, 3, 1]]), '1 - a + b(-1 + a) = 0');
  // a parcela −b inteira e o b de ab: fator −b
  assert.equal(run('factor', '1 - a - b + a*b = 0', [0, 0], [[0, 2], [0, 3, 1]]), '1 - a - b(1 - a) = 0');
  // 1 e −a (parcelas vizinhas) + o (1 − a) de dentro
  assert.equal(run('factor', '1 - a - b(1 - a) = 0', [0, 0], [[0, 0], [0, 1], [0, 2, 0, 1]]), '(1 - a)(1 - b) = 0');
  // fator x nas parcelas 2x e 3xy (a terceira fica de fora)
  assert.equal(run('factor', '2x + 3x*y + 5 = 0', [0, 2], [[0, 0, 1], [0, 1, 1]]), '(2 + 3y)x + 5 = 0');
  // seleções que não são o mesmo fator
  assert.equal(run('factor', '2x + 3y = 0', [0, 0], [[0, 0, 1], [0, 1, 1]]), null);
  // duas seleções na mesma parcela
  assert.equal(run('factor', '2x + 3x = 0', [0, 0], [[0, 0, 0], [0, 0, 1]]), null);
});

test('trocar os sinais: A(B + C) → −A(−B − C)', () => {
  assert.equal(run('flipsigns', '2(x - 1) = 4', [0]), '-2(-x + 1) = 4');
  assert.equal(run('flipsigns', 'a(b + c) = 0', [0]), '-a(-b - c) = 0');
  assert.equal(run('flipsigns', 'y + 2x(a + b) = 0', [0, 1]), 'y - 2x(-a - b) = 0', 'parcela de uma soma');
  assert.equal(run('flipsigns', '(-a)(b + c) = 0', [0]), 'a(-b - c) = 0', 'fator já negativo');
  assert.equal(run('flipsigns', '-a(b + c) = 0', [0, 0]), 'a(-b - c) = 0', 'produto dentro de −(…)');
  assert.equal(run('flipsigns', '(b + c)x = 0', [0]), '-(-b - c)x = 0', 'soma como primeiro fator');
  assert.equal(run('flipsigns', 'b + c = 0', [0]), '-(-b - c) = 0', 'soma sozinha');
  assert.equal(run('flipsigns', 'a b = 0', [0]), null, 'sem soma');
  assert.equal(run('flipsigns', 'a - (b + c) = 0', [0, 1]), 'a + (-b - c) = 0', 'o sinal entra');
  assert.equal(run('flipsigns', 'a - (b + c) = 0', [0, 1, 0]), 'a + (-b - c) = 0', 'foco nos parênteses');
  assert.equal(run('flipsigns', 'a + (-b - c) = 0', [0, 1]), 'a - (b + c) = 0', 'o sinal sai');
  assert.equal(run('flipsigns', 'y = -(b - c)', [1]), 'y = -b + c', 'fora de uma soma');
  assert.equal(run('flipsigns', 'a - 2(b + c) = 0', [0, 1]), 'a + 2(-b - c) = 0', 'produto');
  assert.equal(run('flipsigns', 'y = a - int x dx', [1, 1]), 'y = a + int -x dx', 'o sinal entra na integral');
  assert.equal(run('flipsigns', 'y = a - int x dx', [1, 1, 0]), 'y = a + int -x dx', 'foco na integral');
  assert.equal(run('flipsigns', 'y = a + int -x dx', [1, 1]), 'y = a - int x dx', 'o sinal sai da integral');
  assert.equal(run('flipsigns', 'y = -int_0^1 (x + 1) dx', [1]), 'y = int_0^1 (-x - 1) dx');
  assert.equal(run('flipsigns', 'y = int (-x - 1) dx', [1]), 'y = -int (x + 1) dx');
  assert.equal(run('flipsigns', 'y = int x dx', [1]), 'y = -int -x dx', 'sem sinal: troca os dois');
  assert.equal(run('flipsigns', 'y = a - sum_(k=1)^n k', [1, 1]), 'y = a + sum_(k=1)^n -k', 'o sinal entra no somatório');
  assert.equal(run('flipsigns', 'y = a + sum_(k=1)^n -k', [1, 1]), 'y = a - sum_(k=1)^n k', 'o sinal sai do somatório');
  assert.equal(run('flipsigns', 'y = -sum_(k=1)^n (k + 1)', [1]), 'y = sum_(k=1)^n (-k - 1)');
  // a mesma tecla "-" em sistemas continua subtraindo equações
  const subeq = RULES.find((r) => r.id === 'subeq');
  const tree = parseAscii('x + y = 3; x - y = 1');
  assert.equal(RULES.find((r) => r.id === 'flipsigns').run({ tree, focus: [1], targets: [[0], [1]] }), null);
  assert.ok(subeq.run({ tree, focus: [1], targets: [[0], [1]] }).tree);
});

test('inversos: regra de sinais e fatoração de números', () => {
  assert.deepEqual(forms('signs', 'y = -a b', [1]), ['y = (-a)b', 'y = a(-b)']);
  assert.deepEqual(forms('signs', 'y = -(a/b)', [1]), ['y = (-a)/b', 'y = a/(-b)']);
  assert.equal(run('signs', 'y = (-a)b', [1]), 'y = -ab', 'e volta');
  assert.equal(run('calc', 'y = 12', [1]), 'y = 2^2*3');
  assert.equal(run('calc', 'y = 6x', [1, 0]), 'y = 2*3x', 'dentro do produto');
  assert.equal(run('calc', 'y = 7', [1]), null, 'primo');
  assert.equal(run('calc', 'y = 2 + 3', [1]), 'y = 5', 'calcular continua primeiro');
});

test('logaritmos e exponenciais', () => {
  assert.equal(run('logs', 'y = log(a b)', [1]), 'y = log(a) + log(b)');
  assert.equal(run('logs', 'y = ln(a/b)', [1]), 'y = ln(a) - ln(b)');
  assert.equal(run('logs', 'y = log_2(x^3)', [1]), 'y = 3log_2(x)');
  assert.equal(run('logs', 'y = ln(sqrt(x))', [1]), 'y = (1/2)*ln(x)');
  assert.equal(run('logs', 'y = log(a) + log(b) - log(c)', [1]), 'y = log((ab)/c)');
  assert.equal(run('logs', 'y = ln(a) + ln(b) + c', [1], [[1, 0], [1, 1]]), 'y = ln(ab) + c');
  assert.equal(run('logs', 'y = ln(a) + log(b)', [1]), null, 'bases diferentes');
  assert.equal(run('logs', 'y = 3ln(x)', [1]), 'y = ln(x^3)');
  assert.equal(run('logs', 'y = log_2(2)', [1]), 'y = 1');
  assert.equal(run('logs', 'y = ln(e^x)', [1]), 'y = x');
  assert.equal(run('logs', 'y = log(1)', [1]), 'y = 0');
  assert.equal(run('logs', 'y = log(10)', [1]), 'y = 1', 'log decimal');
  assert.equal(run('logs', 'y = e^(ln(x))', [1]), 'y = x');
  assert.equal(run('logs', 'y = 2^(log_2(x))', [1]), 'y = x');
  assert.deepEqual(forms('logs', 'y = exp(x)', [1]), ['y = e^x']);
  assert.equal(run('logs', 'y = ln(a)/ln(b)', [1]), 'y = log_b(a)');
  assert.ok(forms('logs', 'y = log_2(x)', [1]).includes('y = ln(x)/ln(2)'), 'mudança de base');
});

test('trigonometria', () => {
  assert.equal(run('trig', 'y = tan(x)', [1]), 'y = sin(x)/cos(x)');
  assert.equal(run('trig', 'y = sin(x)/cos(x)', [1]), 'y = tan(x)');
  assert.equal(run('trig', 'y = 1/cos(x)', [1]), 'y = sec(x)');
  assert.equal(run('trig', 'y = sin(-x)', [1]), 'y = -sin(x)');
  assert.equal(run('trig', 'y = -sin(x)', [1]), 'y = sin(-x)');
  assert.equal(run('trig', 'y = cos(-x)', [1]), 'y = cos(x)');
  assert.equal(run('trig', 'y = sin^2(x) + cos^2(x)', [1]), 'y = 1');
  assert.equal(run('trig', 'y = a + sin^2(t) + cos^2(t)', [1]), 'y = a + 1');
  assert.equal(run('trig', 'y = sin^2(x) + cos^2(t)', [1]), null, 'arcos diferentes');
  assert.equal(run('trig', 'y = 1 - cos^2(x)', [1]), 'y = sin^2(x)');
  assert.equal(run('trig', 'y = sin^2(x)', [1]), 'y = 1 - cos^2(x)');
  assert.equal(run('trig', 'y = sin(2x)', [1]), 'y = 2sin(x)*cos(x)');
  assert.deepEqual(forms('trig', 'y = cos(2x)', [1]), ['y = cos^2(x) - sin^2(x)', 'y = 2cos^2(x) - 1', 'y = 1 - 2sin^2(x)']);
  assert.equal(run('trig', 'y = 2sin(x)cos(x)', [1]), 'y = sin(2x)');
  assert.equal(run('trig', 'y = cos^2(x) - sin^2(x)', [1]), 'y = cos(2x)');
  assert.equal(run('trig', 'y = 1 - 2sin^2(x)', [1]), 'y = cos(2x)');
  assert.equal(run('trig', 'y = sin(a + b)', [1]), 'y = sin(a)*cos(b) + cos(a)*sin(b)');
  assert.equal(run('trig', 'y = cos(a - b)', [1]), 'y = cos(a)*cos(b) + sin(a)*sin(b)');
  assert.equal(run('trig', 'y = sin(a)cos(b) - cos(a)sin(b)', [1]), 'y = sin(a - b)');
  assert.equal(run('trig', 'y = cos(a)cos(b) - sin(a)sin(b)', [1]), 'y = cos(a + b)');
});

test('radicais', () => {
  assert.equal(run('powers', 'y = sqrt(2)sqrt(3)', [1]), 'y = sqrt(2*3)');
  assert.equal(run('powers', 'y = sqrt(a b)', [1]), 'y = sqrt(a)*sqrt(b)');
  assert.equal(run('powers', 'y = sqrt(a/b)', [1]), 'y = sqrt(a)/sqrt(b)');
  assert.equal(run('powers', 'y = sqrt(a)/sqrt(b)', [1]), 'y = sqrt(a/b)');
  assert.equal(run('powers', 'y = sqrt(x)^2', [1]), 'y = x');
  assert.equal(run('powers', 'y = sqrt(x^2)', [1]), 'y = abs(x)');
  assert.equal(run('powers', 'y = sqrt(3^2)', [1]), 'y = 3');
  assert.equal(run('powers', 'y = sqrt(9)', [1]), 'y = 3');
  assert.equal(run('powers', 'y = sqrt(8)', [1]), 'y = 8^(1/2)', '8 não é quadrado');
  assert.equal(run('powers', 'y = sqrt(x)', [1]), 'y = x^(1/2)');
  assert.equal(run('powers', 'y = x^(1/2)', [1]), 'y = sqrt(x)');
  assert.equal(run('powers', 'y = x^(1/3)', [1]), 'y = root(x, 3)');
  assert.deepEqual(forms('powers', 'y = sqrt(2)sqrt(2)', [1]), ['y = sqrt(2)^2', 'y = sqrt(2*2)']);
});

test('racionalizar: sugestão do fator', () => {
  const ex = rule('expandfrac');
  const sug = (src, focus) => ex.suggest({ tree: parseAscii(src), focus, targets: [focus] });
  assert.equal(sug('y = 1/sqrt(2)', [1]), 'sqrt(2)');
  assert.equal(sug('y = 1/(1 + sqrt(2))', [1]), '1 - sqrt(2)');
  assert.equal(sug('y = 1/(3 - sqrt(x))', [1]), '3 + sqrt(x)');
  assert.equal(sug('y = 1/x', [1]), '');
});

test('notação: log com base e sen²x', () => {
  assert.equal(toAscii(parseAscii('y = log_2 x + sin^2 x')), 'y = log_2(x) + sin^2(x)');
  assert.equal(toAscii(parseAscii('y = log(x, 10)')), 'y = log_10(x)');
  assert.equal(toLatex(parseAscii('y = log_2(x) + cos^2(2x)')), 'y = \\log_{2} x + \\cos^{2}\\left(2 x\\right)');
});

test('juntar frações vem antes de separar', () => {
  const src = '(x^2+x*y)/((x^2+y^2)*(x+y))+(-x*y+y^2)/((x^2+y^2)*(x+y)) = 0';
  const joined = '((x^2 + xy) + (-xy + y^2))/((x^2 + y^2)(x + y)) = 0';
  assert.equal(run('join', src, [0]), joined, 'foco na soma');
  assert.equal(run('join', src, [0, 0]), joined, 'foco numa das frações');
  assert.equal(run('join', src, [0, 0, 0]), joined, 'foco no numerador');
  assert.equal(run('join', src, [0, 0], [[0, 0], [0, 1]]), joined, 'as duas selecionadas');
  assert.equal(forms('join', src, [0, 0], [[0, 0], [0, 1]]).length, 1, 'seleção: só juntar');
  assert.equal(run('join', 'a/((b)(c)) + d/(((b)(c))) = 0', [0]), '(a + d)/((b)(c)) = 0', 'parênteses a mais');
  assert.equal(run('join', 'a/(b c) + d/(c b) = 0', [0]), '(a + d)/(bc) = 0', 'ordem dos fatores');
  assert.equal(label('join', 'a/(b c) + d/(c b) = 0', [0]), 'juntou as frações, usando cb = bc');
  assert.equal(run('join', 'a/(b c) + d/(c b) = 0', [0, 0]), '(a + d)/(bc) = 0', 'foco numa parcela: junta, não separa');
  const onTerm = rule('join').run({ tree: parseAscii('a/(b c) + d/c = 0'), focus: [0, 0], targets: [[0, 0]] });
  assert.equal(onTerm.error, 'err.denoms', 'denominadores diferentes, foco numa parcela: explica, não separa');
  assert.equal(run('join', 'a/(b c) + d/(c b) = 0', [0, 0, 0], [[0, 0, 0], [0, 0, 1, 0]]), '(a/b)(1/c) + d/(cb) = 0', 'dentro da fração: separa');
  assert.equal(rule('join').run({ tree: parseAscii('a/b + d/c = 0'), focus: [0], targets: [[0]] }).error, 'err.denoms');
});

test('zero: 0·x → 0, 0/x → 0, x⁰ → 1', () => {
  assert.equal(run('neutral', 'y = 0x', [1]), 'y = 0');
  assert.equal(run('neutral', 'y = 3 + 0*x*z', [1, 1]), 'y = 3 + 0');
  assert.equal(run('neutral', 'y = 1*0*x', [1]), 'y = 0', 'zero antes do neutro');
  assert.equal(run('neutral', 'y = 0/(x + 1)', [1]), 'y = 0');
  assert.equal(run('neutral', 'y = 0/0', [1]), null);
  assert.equal(run('neutral', 'y = x^0', [1]), 'y = 1');
  assert.equal(run('neutral', 'y = 0^0', [1]), null);
  assert.equal(run('neutral', 'y = 1x', [1]), 'y = x', 'neutro continua');
  assert.equal(run('neutral', 'y = 1^(n + 1)', [1]), 'y = 1', '1ᵏ → 1');
  assert.equal(run('neutral', 'y = 1^k 2', [1, 0]), 'y = 1*2');
  assert.equal(run('neutral', 'y = 1^0', [1]), 'y = 1');
});

test('combinatória: fatorial e número binomial', () => {
  assert.deepEqual(forms('factorial', 'y = n!', [1]), ['y = n(n - 1)!', 'y = prod_(k=1)^n k']);
  assert.deepEqual(forms('factorial', 'y = 5!', [1]), ['y = 5*4*3*2*1', 'y = 5*4!']);
  assert.equal(run('factorial', 'y = (n + 1)!', [1]), 'y = (n + 1)n!');
  assert.equal(run('factorial', 'y = (n + 1) n!', [1]), 'y = (n + 1)!');
  assert.equal(run('factorial', 'y = 5*4*3*2*1', [1]), 'y = 5!');
  assert.equal(run('factorial', 'y = ((n+1)-(k+1))*(((n+1)-(k+1))-1)!', [1]), 'y = ((n + 1) - (k + 1))!', 'agrupamento diferente');
  // forma normal: reconhece e anota a igualdade usada
  assert.equal(run('factorial', 'y = (n - k)(-1 - k + n)!', [1]), 'y = (n - k)!');
  assert.equal(label('factorial', 'y = (n - k)(-1 - k + n)!', [1]), 'juntou em fatorial, usando −1 − k + n = n − k − 1');
  assert.equal(label('factorial', 'y = (n - k)(n - k - 1)!', [1]), 'juntou em fatorial', 'literal: sem nota');
  assert.equal(run('factorial', 'y = n!/((n - k)! k!)', [1]), 'y = binom(n, k)');
  assert.equal(run('factorial', 'y = binom(n, k) + binom(n, 1 + k)', [1]), 'y = binom(n + 1, 1 + k)');
  assert.equal(label('sums', 'S = sum_(k=1)^m k + sum_(k=1+m)^n k', [1]), 'juntou os intervalos, usando 1 + m = m + 1');
  assert.equal(run('factorial', 'y = binom(n + 1, k + 1)', [1]), 'y = (n + 1)!/((k + 1)!((n + 1) - (k + 1))!)');
  assert.deepEqual(forms('factorial', 'y = binom(n, k)', [1]), [
    'y = n!/(k!(n - k)!)', 'y = binom(n, n - k)', 'y = binom(n - 1, k - 1) + binom(n - 1, k)',
  ]);
  assert.equal(run('factorial', 'y = binom(n, n - k)', [1, 1]), 'y = n!/((n - k)!k!)');
  assert.equal(forms('factorial', 'y = binom(n, n - k)', [1])[1], 'y = binom(n, k)', 'simetria volta');
  assert.equal(run('factorial', 'y = binom(n, 0)', [1]), 'y = 1');
  assert.equal(run('factorial', 'y = binom(n, 1)', [1]), 'y = n');
  assert.equal(run('factorial', 'y = n!/(k! (n - k)!)', [1]), 'y = binom(n, k)');
  assert.equal(run('factorial', 'y = 5!/(2! 3!)', [1]), 'y = binom(5, 2)');
  assert.equal(run('factorial', 'y = binom(n, k) + binom(n, k + 1)', [1]), 'y = binom(n + 1, k + 1)');
  assert.equal(run('calc', 'y = binom(6, 3) + 4!', [1]), 'y = 44');
});

test('somatório e produtório', () => {
  assert.deepEqual(forms('sums', 'S = sum_(k=1)^4 k^2', [1]).slice(0, 2), ['S = 1^2 + 2^2 + 3^2 + 4^2', 'S = (4*5*9)/6']);
  assert.equal(run('sums', 'S = sum_(k=1)^n (2k + 1)', [1]), 'S = sum_(k=1)^n 2k + sum_(k=1)^n 1');
  assert.equal(run('sums', 'S = sum_(k=1)^n 3k', [1, 3]), 'S = 3sum_(k=1)^n k', 'foco no termo');
  assert.equal(run('sums', 'S = sum_(k=1)^n 5', [1]), 'S = n*5');
  assert.equal(run('sums', 'S = sum_(k=1)^n k', [1]), 'S = (n(n + 1))/2');
  assert.equal(run('sums', 'S = sum_(k=0)^n 2^k', [1]), 'S = (2^(n + 1) - 1)/(2 - 1)');
  assert.equal(run('sums', 'S = sum_(k=0)^n binom(n, k)', [1]), 'S = 2^n');
  assert.equal(run('sums', 'S = sum_(k=1)^n (1/k - 1/(k + 1))', [1]), 'S = 1/1 - 1/(n + 1)');
  const f = forms('sums', 'S = sum_(k=1)^n (k + 1)', [1]);
  assert.ok(f.includes('S = sum_(k=1)^(n - 1) (k + 1) + (n + 1)'), 'último termo');
  assert.ok(f.includes('S = (1 + 1) + sum_(k=2)^n (k + 1)'), 'primeiro termo');
  assert.ok(f.includes('S = sum_(k=0)^(n - 1) ((k + 1) + 1)'), 'deslocar o índice');
  // inversos
  assert.equal(run('sums', 'S = sum_(k=1)^n k + sum_(k=1)^n k^2', [1]), 'S = sum_(k=1)^n (k + k^2)');
  assert.equal(run('sums', 'S = sum_(k=1)^n k - sum_(k=1)^n 1', [1]), 'S = sum_(k=1)^n (k - 1)');
  assert.equal(run('sums', 'S = sum_(k=1)^(n - 1) k^2 + n^2', [1]), 'S = sum_(k=1)^n k^2');
  assert.equal(run('sums', 'S = sum_(k=1)^m k + sum_(k=m+1)^n k', [1]), 'S = sum_(k=1)^n k');
  assert.equal(run('sums', 'S = 2 sum_(k=1)^n k', [1]), 'S = sum_(k=1)^n 2k');
  // produtório
  assert.equal(run('sums', 'P = prod_(k=1)^n k', [1]), 'P = n!');
  assert.equal(run('sums', 'P = prod_(k=1)^n 2k', [1]), 'P = 2^nprod_(k=1)^n k');
  assert.equal(run('calc', 'S = sum_(k=1)^4 k^2', [1]), 'S = 30');
  // binômio de Newton nos dois sentidos
  assert.equal(run('binomial', 'y = (a + b)^n', [1]), 'y = sum_(k=0)^n binom(n, k)a^(n - k)b^k');
  assert.equal(run('binomial', 'y = sum_(k=0)^n binom(n, k) a^(n - k) b^k', [1]), 'y = (a + b)^n');
});

test('notação de somatório, binomial e fatorial', () => {
  for (const s of ['sum_(k=1)^n k^2 + 1', 'prod_(k=1)^(n + 1) (2k + 1)', 'binom(n, k)', '(n + 1)!', '(n!)^2', 'x/(sum_(k=1)^n k)']) {
    assert.equal(toAscii(parseAscii(s)), s);
  }
  assert.equal(toLatex(parseAscii('sum_(k=1)^n binom(n, k) + (n+1)!')), '\\sum_{k=1}^{n} \\binom{n}{k} + \\left(n + 1\\right)!');
  assert.equal(toAscii(parseAscii('(sum_(k=1)^n k) x')), '(sum_(k=1)^n k)x', 'Σ no meio do produto');
});

test('trigonometria: valores notáveis', () => {
  const v = (src) => forms('trig', `y = ${src}`, [1])[0];
  assert.equal(v('sin(0)'), 'y = 0');
  assert.equal(v('sin(pi/6)'), 'y = 1/2');
  assert.equal(v('sin(pi/4)'), 'y = sqrt(2)/2');
  assert.equal(v('cos(pi/3)'), 'y = 1/2');
  assert.equal(v('cos(pi)'), 'y = -1');
  assert.equal(v('sin(pi/2)'), 'y = 1');
  assert.equal(v('tan(pi/6)'), 'y = sqrt(3)/3');
  assert.equal(v('tan(pi/4)'), 'y = 1');
  assert.equal(v('cos(2pi/3)'), 'y = -1/2');
  assert.equal(v('sin(7pi/6)'), 'y = -1/2');
  assert.equal(v('sin(-pi/2)'), 'y = -1');
  assert.equal(v('sec(pi/3)'), 'y = 2');
  assert.equal(v('cot(pi/6)'), 'y = sqrt(3)');
  assert.equal(v('arcsin(1/2)'), 'y = pi/6');
  assert.equal(v('arccos(-1/2)'), 'y = (2pi)/3');
  assert.equal(v('arctan(sqrt(3))'), 'y = pi/3');
  assert.notEqual(v('sin(pi/5)'), 'y = 0');
  assert.ok(!forms('trig', 'y = tan(pi/2)', [1]).some((f) => !f.includes('tan') && !f.includes('sin')), 'tg(π/2) não tem valor');
});
