import { test } from 'node:test';
import assert from 'node:assert/strict';
import { t, msg, fmt, setLang, getLang, functionLabel } from '../src/i18n.js';
import { parseAscii } from '../src/parse-ascii.js';
import { parseLatex } from '../src/parse-latex.js';
import { toMathJson } from '../src/mathjson.js';
import { toAscii } from '../src/serialize.js';
import { RULES } from '../src/rules/index.js';

test('textos com parâmetros nos dois idiomas', () => {
  setLang('pt');
  assert.equal(getLang(), 'pt');
  assert.equal(t('step.addsub', { q: '9' }), 'somou e subtraiu 9');
  const label = msg('step.subst', { e: 'x' });
  assert.equal(fmt(label), 'substituiu por x');
  setLang('en');
  assert.equal(fmt(label), 'substituted with x', 'o mesmo rótulo guardado muda de idioma');
  assert.equal(fmt('texto antigo'), 'texto antigo');
  setLang('pt');
});

test('toda regra tem nome (e textos de entrada) nos dois idiomas', () => {
  for (const lang of ['pt', 'en']) {
    setLang(lang);
    for (const r of RULES) {
      assert.notEqual(t(`rule.${r.id}`), `rule.${r.id}`, `${lang}: rule.${r.id}`);
      if (r.input) {
        assert.notEqual(t(`rule.${r.id}.ph`), `rule.${r.id}.ph`);
        assert.notEqual(t(`rule.${r.id}.hint`), `rule.${r.id}.hint`);
      }
    }
  }
  setLang('pt');
});

test('grafias brasileiras de funções', () => {
  assert.deepEqual(toMathJson(parseAscii('sen x + tg(y)')), ['Add', ['Sin', 'x'], ['Tan', 'y']]);
  assert.deepEqual(toMathJson(parseLatex('\\sen x')), ['Sin', 'x']);
  // a saída ASCII continua com os nomes internacionais
  assert.equal(toAscii(parseAscii('sen(x) = 1')), 'sin(x) = 1');
  setLang('pt');
  assert.equal(functionLabel('Sin', 'sin'), 'sen');
  setLang('en');
  assert.equal(functionLabel('Sin', 'sin'), 'sin');
  setLang('pt');
});
